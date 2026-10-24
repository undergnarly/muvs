const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Syntax-only isolated configuration. Never starts/reloads nginx, binds a port,
// writes live configuration, or copies private certificate material.
const files = {
  'nginx.conf': 'website.conf', 'dubplates-nginx.conf': 'muvs-dubplates.conf',
  'nginx-security-base.conf': 'muvs-security-base.conf',
  'nginx-security-headers.conf': 'muvs-security-headers.conf',
  'nginx-hide-upstream-security.conf': 'muvs-hide-upstream-security.conf',
  'nginx-document-proxy.conf': 'muvs-document-proxy.conf',
  'nginx-cloudflare-realip.conf': 'muvs-cloudflare-realip.conf',
};

function check(source = __dirname) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'muvs-nginx-check-'));
  try {
    for (const [from, to] of Object.entries(files)) {
      const value = fs.readFileSync(path.join(source, from), 'utf8').replace(/\r\n/g, '\n')
        .replaceAll('/etc/nginx/snippets/muvs-', `${temporary}/muvs-`);
      fs.writeFileSync(path.join(temporary, to), value);
    }
    fs.writeFileSync(path.join(temporary, 'check.conf'), `pid ${temporary}/nginx.pid;\nerror_log stderr;\nevents {}\nhttp {\ninclude /etc/nginx/mime.types;\naccess_log off;\ninclude ${temporary}/website.conf;\n}\n`);
    const result = spawnSync('nginx', ['-t', '-p', `${temporary}/`, '-c', path.join(temporary, 'check.conf')], { encoding: 'utf8', timeout: 15000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || 'nginx syntax check failed');
    return result.stderr;
  } finally {
    if (path.dirname(temporary) !== os.tmpdir() || !/^muvs-nginx-check-/.test(path.basename(temporary))) throw new Error('Unsafe syntax-check cleanup');
    fs.rmSync(temporary, { recursive: true });
  }
}

module.exports = { check, files };
if (require.main === module) {
  try { console.log(check(process.argv[2])); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
