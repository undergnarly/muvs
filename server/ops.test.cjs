const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { once } = require('node:events');
const { spawnSync } = require('node:child_process');
const { releasePath, removeStaging, pruneReleases, pruneBackups } = require('./ops-files.cjs');
const { request, probe, waitForHealth } = require('./ops-healthcheck.cjs');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'muvs-ops-test-'));
  t.after(() => {
    assert.equal(path.dirname(directory), os.tmpdir());
    assert.match(path.basename(directory), /^muvs-ops-test-/);
    fs.rmSync(directory, { recursive: true });
  });
  return directory;
}

test('release path validation rejects roots, nested paths, foreign names and symlinks before deletion', t => {
  const root = fixture(t);
  const release = path.join(root, 'abcdef123456'); fs.mkdirSync(release);
  assert.equal(releasePath(root, release), fs.realpathSync(release));
  for (const target of [root, path.join(root, '..'), path.join(root, 'not-a-release'), path.join(release, 'abcdef123456')]) {
    assert.throws(() => releasePath(root, target));
  }
  const link = path.join(root, '123456abcdef');
  fs.symlinkSync(release, link, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => releasePath(root, link));
  assert.ok(fs.existsSync(release));
});

test('retention keeps current and previous, ignores foreign/staging/symlink entries, deletes only owned releases', t => {
  const root = fixture(t);
  const releases = Array.from({ length: 7 }, (_, i) => path.join(root, String(i).padStart(12, '0')));
  releases.forEach((directory, i) => { fs.mkdirSync(directory); fs.utimesSync(directory, i + 1, i + 1); });
  fs.mkdirSync(path.join(root, '.building-abcdef123456-one'));
  fs.mkdirSync(path.join(root, 'unrelated-app'));
  const removed = pruneReleases(root, releases[0], releases[1], 5);
  assert.deepEqual(removed.sort(), ['000000000002', '000000000003']);
  for (const directory of [releases[0], releases[1], releases[4], releases[5], releases[6], path.join(root, 'unrelated-app')]) assert.ok(fs.existsSync(directory));
  assert.throws(() => pruneReleases(root, root, releases[1], 5));
  assert.throws(() => pruneReleases(root, releases[0], releases[1], 1));
});

test('staging cleanup requires a direct matching twelve-hex build identity', t => {
  const root = fixture(t);
  const staging = path.join(root, '.building-abcdef123456-random1'); fs.mkdirSync(staging);
  fs.writeFileSync(path.join(staging, 'fixture'), 'fixture');
  assert.throws(() => removeStaging(root, staging, '123456abcdef'));
  assert.throws(() => removeStaging(root, root, 'abcdef123456'));
  removeStaging(root, staging, 'abcdef123456'); assert.equal(fs.existsSync(staging), false);
});

test('backup retention touches only exact completed archive/checksum filenames', t => {
  const root = fixture(t);
  for (const day of ['01', '02', '03']) {
    const archive = path.join(root, `muvs-site-202610${day}T030000Z.tar.gz`);
    fs.writeFileSync(archive, 'fixture'); fs.writeFileSync(`${archive}.sha256`, 'fixture');
  }
  const unrelated = path.join(root, 'another-application.tar.gz'); fs.writeFileSync(unrelated, 'fixture');
  fs.writeFileSync(path.join(root, '.building-muvs-site-fixture.tar.gz'), 'fixture');
  assert.deepEqual(pruneBackups(root, 2), ['muvs-site-20261001T030000Z.tar.gz']);
  assert.ok(fs.existsSync(unrelated));
  assert.equal(fs.existsSync(path.join(root, 'muvs-site-20261001T030000Z.tar.gz.sha256')), false);
  assert.throws(() => pruneBackups(root, 0));
});

const healthyFetch = async ({ path: route }) => route === '/'
  ? { status: 200, type: 'text/html', text: '<html><script src="/assets/entry-12345678.js"></script></html>' }
  : { status: 200, type: 'application/json', text: JSON.stringify(route === '/api/data' ? { releases: [], projects: [] }
    : route === '/api/dubplates' ? { tracks: [] } : { visualEffects: {} }) };

test('health validates real JSON shapes and the candidate document asset, not merely HTTP200', async () => {
  assert.equal(await probe({ fetch: healthyFetch, expectedAsset: '/assets/entry-12345678.js' }), true);
  await assert.rejects(probe({ fetch: healthyFetch, expectedAsset: '/assets/stale-12345678.js' }), /active origin document/);
  for (const bad of [
    { status: 500, type: 'application/json', text: '{}' },
    { status: 200, type: 'text/html', text: '<html>fallback</html>' },
    { status: 200, type: 'application/json', text: '{}' },
  ]) await assert.rejects(probe({ fetch: async () => bad }));
});

test('health retry has a bounded deadline and recovers from one failed generation', async () => {
  let now = 0, attempts = 0;
  await assert.rejects(waitForHealth({ now: () => now, delay: async ms => { now += ms; }, deadlineMs: 100, intervalMs: 30,
    fetch: async () => { attempts++; throw new Error('not ready'); } }), /not ready/);
  assert.equal(now, 100); assert.ok(attempts < 20);
  let first = true;
  assert.equal(await waitForHealth({ delay: async () => {}, fetch: async options => {
    if (first) { first = false; throw new Error('transient'); } return healthyFetch(options);
  } }), true);
});

test('native health HTTP requests have absolute timeout and bounded body', async t => {
  const server = http.createServer((req, res) => {
    if (req.url === '/large') { res.writeHead(200); res.end('x'.repeat(2 * 1024 * 1024 + 10)); }
    else if (req.url === '/hang') { res.writeHead(200); res.write('partial'); }
    else { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{"ok":true}'); }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); server.close(); });
  const port = server.address().port;
  assert.equal((await request({ port, path: '/' })).text, '{"ok":true}');
  await assert.rejects(request({ port, path: '/large' }), /exceeds limit/);
  await assert.rejects(request({ port, path: '/hang', timeoutMs: 35 }), /timed out/);
});

test('deployment/backup contracts replace only the named API, avoid shared nginx reload and preserve the full catalog/media', () => {
  const source = fs.readFileSync(path.join(__dirname, 'deploy-production.sh'), 'utf8');
  assert.doesNotMatch(source, /pm2\s+(?:delete|restart)\s+all|pm2\s+kill|systemctl\s+reload|xargs.*rm/);
  assert.equal((source.match(/pm2 delete muvs-api\b/g) || []).length, 1);
  assert.match(source, /startOrReload.*--only muvs-api/);
  assert.match(source, /ecosystem\.production\.config\.cjs/);
  assert.match(source, /ROLLBACK_REQUIRED=1/); assert.match(source, /ops-healthcheck\.cjs/);
  assert.match(source, /validate-release/); assert.match(source, /prune-releases/);
  assert.ok(source.indexOf('run build') < source.indexOf('ROLLBACK_REQUIRED=1'));
  const backup = fs.readFileSync(path.join(__dirname, 'backup-production.sh'), 'utf8');
  assert.doesNotMatch(source, /\r/); assert.doesNotMatch(backup, /\r/);
  for (const item of ['db.json', 'uploads', 'dubplates/catalog.json', 'dubplates/analytics.json', 'dubplates/assets']) assert.ok(backup.includes(item));
  assert.match(backup, /umask 077/); assert.match(backup, /tar -tzf/); assert.match(backup, /sha256sum/);
  assert.ok(backup.indexOf('tar -tzf') < backup.indexOf('prune-backups'));
  const bash = process.platform === 'win32' ? 'C:/Program Files/Git/bin/bash.exe' : '/bin/bash';
  if (fs.existsSync(bash)) for (const name of ['deploy-production.sh', 'backup-production.sh', 'monitor-production.sh']) {
    const checked = spawnSync(bash, ['-n', path.join(__dirname, name)], { encoding: 'utf8' });
    assert.equal(checked.status, 0, checked.stderr);
  }
  const monitor = fs.readFileSync(path.join(__dirname, 'monitor-production.sh'), 'utf8');
  assert.doesNotMatch(monitor, /pm2\s+(?:delete|restart|reload|start)|systemctl|localhost:8080|https?:\/\/(?!127\.0\.0\.1)/);
  assert.match(monitor, /logger -p daemon\.err -t muvs-site-health/);
  assert.match(monitor, /ops-healthcheck\.cjs/);
});

test('nginx policies preserve worker/loader support, scoped headers, private library and cache-safe404s', () => {
  const read = name => fs.readFileSync(path.join(__dirname, name), 'utf8');
  const nginx = read('nginx.conf');
  assert.match(nginx, /location @muvs_document[\s\S]*rewrite \^ \/api\/public-document break;/);
  assert.match(nginx, /location = \/ \{/);
  for (const route of ['robots.txt', 'sitemap.xml']) {
    const start = nginx.indexOf(`location = /${route} {`);
    assert.ok(start >= 0, `${route} must bypass the static-file regex`);
    assert.match(nginx.slice(start, nginx.indexOf('}', start)), /proxy_pass http:\/\/127\.0\.0\.1:3001\/api\/public-document/);
  }
  assert.match(nginx, /return 301 https:\/\/muvs\.dev\$request_uri/);
  assert.doesNotMatch(nginx, /immutable" always/);
  assert.match(nginx, /public, max-age=2592000, no-transform/);
  assert.match(read('nginx-document-proxy.conf'), /X-Muvs-Document-Uri \$request_uri/);
  assert.match(read('nginx-security-base.conf'), /worker-src 'self' blob:/);
  assert.match(read('nginx-security-base.conf'), /script-src 'self' 'unsafe-inline'/);
  assert.match(read('nginx-security-base.conf'), /script-src [^;]*blob:/);
  assert.match(read('nginx-security-base.conf'), /font-src 'self' data:/);
  assert.match(read('nginx-security-base.conf'), /connect-src 'self' data:/);
  assert.doesNotMatch(read('nginx-security-base.conf'), /unsafe-eval|ipapi\.co/);
  const library = read('dubplates-nginx.conf');
  assert.equal((library.match(/include \/etc\/nginx\/snippets\/muvs-security-base.conf;/g) || []).length, 4);
  assert.equal((library.match(/Referrer-Policy "no-referrer" always/g) || []).length, 4);
  assert.equal((library.match(/private, no-store/g) || []).length, 4);
  assert.match(library, /proxy_request_buffering off/);
  assert.match(read('nginx-cloudflare-realip.conf'), /real_ip_header CF-Connecting-IP/);
});

test('real PM2 targeted replacement changes only the isolated API absolute script and cwd', {
  skip: process.platform !== 'linux' || process.env.MUVS_TEST_ISOLATED_PM2 !== '1',
}, async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'muvs-pm2-test-'));
  const pm2Home = path.join(root, 'pm2');
  const env = { ...process.env, PM2_HOME: pm2Home, DATA_DIR: path.join(root, 'data') };
  const run = args => spawnSync('pm2', args, { env, encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 });
  t.after(() => {
    assert.equal(path.dirname(root), os.tmpdir()); assert.match(path.basename(root), /^muvs-pm2-test-/);
    const stopped = run(['kill']); assert.equal(stopped.status, 0, 'Only the isolated test PM2 daemon must stop before cleanup');
    fs.rmSync(root, { recursive: true });
  });
  for (const name of ['aaaaaaaaaaaa', 'bbbbbbbbbbbb']) {
    const release = path.join(root, name), server = path.join(release, 'server');
    fs.mkdirSync(server, { recursive: true });
    fs.writeFileSync(path.join(server, 'index.js'), 'setInterval(() => {}, 1000);\n');
    env.MUVS_RELEASE_DIR = release;
    if (run(['describe', 'muvs-api']).status === 0) {
      const removed = run(['delete', 'muvs-api']); assert.equal(removed.status, 0, removed.stderr);
    }
    const started = run(['startOrReload', path.join(__dirname, 'ecosystem.production.config.cjs'), '--only', 'muvs-api', '--update-env']);
    assert.equal(started.status, 0, started.stderr);
    let actual;
    for (let i = 0; i < 12; i++) {
      const listed = run(['jlist']); assert.equal(listed.status, 0, listed.stderr);
      const apps = JSON.parse(listed.stdout); assert.equal(apps.length, 1);
      actual = apps[0].pm2_env;
      if (actual.status === 'online') break;
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    assert.equal(actual.status, 'online');
    assert.equal(actual.pm_exec_path, path.join(server, 'index.js'));
    assert.equal(actual.pm_cwd, server);
    assert.equal(actual.DATA_DIR, env.DATA_DIR);
  }
});

test('actual backup shell archives/restores every required sample data class without touching live paths', {
  skip: process.platform !== 'linux' || process.env.MUVS_TEST_OPS_SHELL !== '1' || process.getuid?.() !== 0,
}, t => {
  const root = fixture(t), data = path.join(root, 'data'), backups = path.join(root, 'backups'), current = path.join(root, 'current');
  const inputs = ['db.json', 'uploads/cover.webp', 'uploads/audio/original.wav', 'dubplates/catalog.json', 'dubplates/analytics.json', 'dubplates/assets/fixture/audio.wav', 'dubplates/assets/fixture/audio.mp3'];
  for (const name of inputs) {
    fs.mkdirSync(path.dirname(path.join(data, name)), { recursive: true });
    fs.writeFileSync(path.join(data, name), name.endsWith('.json') ? '{}' : `fixture:${name}`);
  }
  fs.mkdirSync(path.join(current, 'server'), { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'ops-files.cjs'), path.join(current, 'server/ops-files.cjs'));
  const source = fs.readFileSync(path.join(__dirname, 'backup-production.sh'), 'utf8')
    .replace('DATA_DIR=/var/www/muvs-data', `DATA_DIR="${data}"`)
    .replace('BACKUP_DIR=/var/backups/muvs-site', `BACKUP_DIR="${backups}"`)
    .replace('CURRENT_LINK=/var/www/muvs-current', `CURRENT_LINK="${current}"`)
    .replace('/run/lock/muvs-deploy.lock', path.join(root, 'deploy.lock'));
  assert.doesNotMatch(source, /\/var\/www\/muvs|\/var\/backups\/muvs|\/run\/lock\/muvs/);
  const script = path.join(root, 'backup.sh'); fs.writeFileSync(script, source);
  const ran = spawnSync('/bin/bash', [script], { encoding: 'utf8', timeout: 10000 });
  assert.equal(ran.status, 0, ran.stderr);
  const archive = path.join(backups, fs.readdirSync(backups).find(name => name.endsWith('.tar.gz')));
  assert.equal(fs.statSync(archive).mode & 0o777, 0o600); assert.equal(fs.statSync(backups).mode & 0o777, 0o700);
  const checked = spawnSync('sha256sum', ['-c', `${archive}.sha256`], { encoding: 'utf8' }); assert.equal(checked.status, 0, checked.stderr);
  const restored = path.join(root, 'restored'); fs.mkdirSync(restored);
  const unpacked = spawnSync('tar', ['-xzf', archive, '-C', restored], { encoding: 'utf8' }); assert.equal(unpacked.status, 0, unpacked.stderr);
  for (const name of inputs) assert.deepEqual(fs.readFileSync(path.join(restored, name)), fs.readFileSync(path.join(data, name)));
});

test('actual deployment shell switches a validated fixture or rolls back after failed candidate health', {
  skip: process.platform !== 'linux' || process.env.MUVS_TEST_OPS_SHELL !== '1' || process.getuid?.() !== 0,
}, t => {
  for (const fail of [false, true]) {
    const root = fixture(t), releases = path.join(root, 'releases'), bin = path.join(root, 'bin'), mirror = path.join(root, 'mirror');
    const previous = path.join(releases, 'bbbbbbbbbbbb'), candidate = path.join(releases, 'aaaaaaaaaaaa'), pointer = path.join(root, 'current');
    for (const release of [previous, candidate]) {
      fs.mkdirSync(path.join(release, 'server'), { recursive: true }); fs.mkdirSync(path.join(release, 'dist'));
      fs.writeFileSync(path.join(release, 'server/index.js'), '// fixture'); fs.writeFileSync(path.join(release, 'dist/index.html'), '<html></html>');
    }
    fs.mkdirSync(bin); fs.mkdirSync(mirror); fs.symlinkSync(previous, pointer);
    fs.copyFileSync(path.join(__dirname, 'ops-files.cjs'), path.join(candidate, 'server/ops-files.cjs'));
    fs.writeFileSync(path.join(candidate, 'server/ecosystem.production.config.cjs'), '// fixture');
    fs.writeFileSync(path.join(candidate, 'server/ops-healthcheck.cjs'), `process.exit(process.env.MUVS_FIXTURE_FAIL==='1' && process.argv[2].endsWith('/aaaaaaaaaaaa') ? 1 : 0);`);
    const log = path.join(root, 'pm2-commands.jsonl');
    const commands = {
      git: `if(process.argv.includes('rev-parse'))console.log('${'a'.repeat(40)}');`,
      nginx: 'process.exit(0);',
      pm2: `require('fs').appendFileSync(${JSON.stringify(log)},JSON.stringify({args:process.argv.slice(2),release:process.env.MUVS_RELEASE_DIR||null})+'\\n');`,
    };
    for (const [name, body] of Object.entries(commands)) fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env node\n${body}\n`, { mode: 0o755 });
    const environment = path.join(root, 'environment'); fs.writeFileSync(environment, 'NODE_ENV=production\n', { mode: 0o600 });
    const persistent = path.join(root, 'persistent-canary'); fs.writeFileSync(persistent, 'must remain unchanged');
    let source = fs.readFileSync(path.join(__dirname, 'deploy-production.sh'), 'utf8');
    for (const [name, value] of Object.entries({ MIRROR_DIR: mirror, RELEASES_DIR: releases, CURRENT_LINK: pointer, ENV_FILE: environment })) {
      const pattern = new RegExp(`^${name}="[^"]+"$`, 'm'); assert.match(source, pattern); source = source.replace(pattern, `${name}="${value}"`);
    }
    source = source.replace('/run/lock/muvs-deploy.lock', path.join(root, 'deploy.lock'));
    assert.doesNotMatch(source, /\/var\/www\/muvs|\/root\/\.config\/muvs|\/run\/lock\/muvs/);
    const script = path.join(root, 'deploy.sh'); fs.writeFileSync(script, source);
    const ran = spawnSync('/bin/bash', [script], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, MUVS_FIXTURE_FAIL: fail ? '1' : '0' }, encoding: 'utf8', timeout: 10000 });
    assert.equal(ran.status, fail ? 1 : 0, ran.stderr);
    assert.equal(fs.realpathSync(pointer), fail ? previous : candidate);
    assert.equal(fs.readFileSync(persistent, 'utf8'), 'must remain unchanged');
    const actions = fs.readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse);
    for (const action of actions.filter(value => value.args[0] === 'delete')) assert.deepEqual(action.args, ['delete', 'muvs-api']);
    const starts = actions.filter(value => value.args[0] === 'startOrReload');
    assert.deepEqual(starts.map(value => value.release), fail ? [candidate, previous] : [candidate]);
    for (const action of starts) assert.ok(action.args.includes('--only') && action.args.includes('muvs-api'));
    assert.ok(actions.at(-1).args[0] === 'save');
  }
});
