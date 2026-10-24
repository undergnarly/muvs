const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync, execFileSync } = require('node:child_process');
const { mergeWebsiteVhost, parseNodes } = require('./ops-merge-nginx.cjs');
const { prepareMuvsCrontab } = require('./ops-crontab.cjs');

const ACTIVE = '/etc/nginx/sites-enabled/muvs.dev';
const DUPLICATE = '/etc/nginx/sites-enabled/muvs.dev.before-natural-shaper-20260912T105231Z';
const SNIPPETS = {
  'dubplates-nginx.conf': 'muvs-dubplates.conf',
  'nginx-security-base.conf': 'muvs-security-base.conf',
  'nginx-security-headers.conf': 'muvs-security-headers.conf',
  'nginx-hide-upstream-security.conf': 'muvs-hide-upstream-security.conf',
  'nginx-document-proxy.conf': 'muvs-document-proxy.conf',
  'nginx-cloudflare-realip.conf': 'muvs-cloudflare-realip.conf',
};
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const write = (file, data, mode = 0o600) => fs.writeFileSync(file, data, { flag: 'wx', mode });

function stageRollout(source = __dirname) {
  if (process.platform !== 'linux' || process.getuid() !== 0 || process.argv[2] !== '--stage') throw new Error('Explicit root Linux --stage is required');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  const directory = `/root/muvs-rollout-${stamp}`;
  fs.mkdirSync(directory, { mode: 0o700 });
  const backup = path.join(directory, 'backup'), staged = path.join(directory, 'staged');
  for (const folder of [backup, staged, path.join(directory, 'source'), path.join(backup, 'snippets'), path.join(staged, 'snippets'), path.join(staged, 'scripts')]) fs.mkdirSync(folder, { mode: 0o700 });
  const manifest = { createdAt: new Date().toISOString(), directory, installed: false, reloaded: false, originals: {}, missingSnippets: [] };
  const snapshot = (original, destination) => {
    const bytes = fs.readFileSync(original), stat = fs.statSync(original);
    write(destination, bytes);
    manifest.originals[original] = { sha256: hash(bytes), bytes: bytes.length, mode: (stat.mode & 0o777).toString(8), uid: stat.uid, gid: stat.gid, modified: stat.mtime.toISOString() };
    return bytes.toString('utf8');
  };
  const original = snapshot(ACTIVE, path.join(backup, 'muvs.dev'));
  const duplicate = snapshot(DUPLICATE, path.join(backup, 'muvs.dev.duplicate'));
  const duplicateNames = parseNodes(duplicate).nodes.filter(node => node.header === 'server')
    .flatMap(server => server.children.filter(node => node.header.startsWith('server_name ')).flatMap(node => node.header.slice(12).split(/\s+/)));
  if (!duplicateNames.length || duplicateNames.some(name => !['muvs.dev', 'www.muvs.dev'].includes(name))) throw new Error('Duplicate contains foreign hosts; manual review required');
  manifest.duplicate = { sameBytesAsActive: original === duplicate, declaredNames: duplicateNames, untouchedLivePath: DUPLICATE };
  snapshot('/root/muvs/deploy.sh', path.join(backup, 'deploy.sh'));
  for (const name of ['muvs-monitor.sh', 'muvs-healthcheck.sh']) {
    const file = `/usr/local/bin/${name}`;
    if (fs.existsSync(file)) snapshot(file, path.join(backup, `legacy-${name}`));
  }
  const cron = execFileSync('crontab', ['-l'], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
  write(path.join(backup, 'root.crontab'), cron);
  const cronPlan = prepareMuvsCrontab(cron);
  manifest.cron = cronPlan.report;
  write(path.join(staged, 'root.crontab.staged'), cronPlan.desired);

  for (const [filename, installedName] of Object.entries(SNIPPETS)) {
    const old = `/etc/nginx/snippets/${installedName}`;
    if (fs.existsSync(old)) snapshot(old, path.join(backup, 'snippets', installedName));
    else manifest.missingSnippets.push(old);
    write(path.join(staged, 'snippets', installedName), fs.readFileSync(path.join(source, filename), 'utf8').replace(/\r\n/g, '\n'));
  }
  for (const filename of ['deploy-production.sh', 'backup-production.sh', 'monitor-production.sh']) {
    const text = fs.readFileSync(path.join(source, filename), 'utf8');
    if (text.includes('\r') || !text.startsWith('#!/bin/bash\n')) throw new Error('Staged shell scripts must be LF /bin/bash sources');
    const checked = spawnSync('/bin/bash', ['-n'], { input: text, encoding: 'utf8', timeout: 5000 });
    if (checked.status !== 0) throw new Error(`Shell syntax failed: ${filename}`);
    write(path.join(staged, 'scripts', filename), text, 0o700);
  }
  const reference = fs.readFileSync(path.join(source, 'nginx.conf'), 'utf8');
  const merged = mergeWebsiteVhost(original, reference);
  manifest.merge = merged.report;
  write(path.join(staged, 'muvs.dev.staged'), merged.text);
  const diff = spawnSync('diff', ['-u', path.join(backup, 'muvs.dev'), path.join(staged, 'muvs.dev.staged')], { encoding: 'utf8', timeout: 5000, maxBuffer: 1024 * 1024 });
  if (![0, 1].includes(diff.status)) throw new Error('Staged diff failed');
  write(path.join(directory, 'vhost.diff'), diff.stdout);

  const baseline = spawnSync('nginx', ['-t'], { encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 });
  write(path.join(backup, 'nginx-test.log'), `${baseline.stdout || ''}${baseline.stderr || ''}`);
  if (baseline.status !== 0) throw new Error('Current nginx config already fails validation; review private backup log');
  // Keep all unrelated enabled configs and global http maps exactly as loaded.
  // Substitute only the two MUVS filenames for the staged merged vhost.
  let checkVhost = merged.text;
  for (const name of Object.values(SNIPPETS)) checkVhost = checkVhost.replaceAll(`/etc/nginx/snippets/${name}`, path.join(staged, 'snippets', name));
  for (const name of Object.values(SNIPPETS)) {
    const target = path.join(staged, 'snippets', name);
    let value = fs.readFileSync(target, 'utf8');
    for (const nested of Object.values(SNIPPETS)) value = value.replaceAll(`/etc/nginx/snippets/${nested}`, path.join(staged, 'snippets', nested));
    write(`${target}.check`, value);
    checkVhost = checkVhost.replaceAll(target, `${target}.check`);
  }
  // Nested includes must use the check variant too; installable snippets stay untouched.
  for (const name of Object.values(SNIPPETS)) {
    const target = path.join(staged, 'snippets', `${name}.check`);
    let value = fs.readFileSync(target, 'utf8');
    for (const nested of Object.values(SNIPPETS)) value = value.replaceAll(path.join(staged, 'snippets', nested), path.join(staged, 'snippets', `${nested}.check`));
    fs.writeFileSync(target, value, { mode: 0o600 });
  }
  const checkFile = path.join(directory, 'muvs.dev.check'); write(checkFile, checkVhost);
  const globalPath = '/etc/nginx/nginx.conf';
  let global = fs.readFileSync(globalPath, 'utf8');
  const include = /include\s+\/etc\/nginx\/sites-enabled\/\*\s*;/g;
  if ((global.match(include) || []).length !== 1) throw new Error('Global enabled-site include shape is unexpected');
  const others = fs.readdirSync('/etc/nginx/sites-enabled').filter(name => ![path.basename(ACTIVE), path.basename(DUPLICATE)].includes(name)).sort();
  const replacements = [...others.map(name => `include ${JSON.stringify(`/etc/nginx/sites-enabled/${name}`)};`), `include ${JSON.stringify(checkFile)};`].join('\n');
  global = global.replace(include, replacements);
  const globalCheck = path.join(directory, 'nginx.check.conf'); write(globalCheck, global);
  const checked = spawnSync('nginx', ['-t', '-c', globalCheck], { encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 });
  write(path.join(directory, 'nginx-staged-test.log'), `${checked.stdout || ''}${checked.stderr || ''}`);
  manifest.validation = { currentValid: true, stagedFullConfigValid: checked.status === 0,
    unrelatedEnabledConfigCount: others.length, muvsDuplicateWarnings: ((checked.stderr || '').match(/conflicting server name "(?:www\.)?muvs\.dev"/g) || []).length };
  const sourceNames = [...Object.keys(SNIPPETS), 'nginx.conf', 'deploy-production.sh', 'backup-production.sh', 'monitor-production.sh',
    'ops-merge-nginx.cjs', 'ops-crontab.cjs', 'ops-stage-rollout.cjs', 'ops-healthcheck.cjs', 'ops-files.cjs', 'ecosystem.production.config.cjs'];
  manifest.normalizedSourceFiles = {};
  manifest.sourceFiles = Object.fromEntries(sourceNames.map(name => {
    const bytes = fs.readFileSync(path.join(source, name));
    write(path.join(directory, 'source', name), bytes);
    manifest.normalizedSourceFiles[name] = hash(bytes.toString('utf8').replace(/\r\n/g, '\n'));
    return [name, hash(bytes)];
  }));
  write(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2));
  if (checked.status !== 0) throw new Error(`Staged nginx validation failed; inspect ${directory}/nginx-staged-test.log`);
  return manifest;
}

module.exports = { stageRollout, SNIPPETS };
if (require.main === module) {
  try { console.log(JSON.stringify(stageRollout(process.argv[3]))); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
