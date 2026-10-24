const test = require('node:test');
const assert = require('node:assert/strict');
const { prepareMuvsCrontab } = require('./ops-crontab.cjs');

test('desired root cron preserves unrelated jobs, existing deploy and legacy monitor bytes and the owner backup schedule', () => {
  const source = '# preserve this\nPATH=/usr/bin:/bin\n*/5 * * * * /usr/local/bin/muvs-monitor.sh\n* * * * * /root/muvs/deploy.sh >> /root/muvs/deploy.log 2>&1\n17 3 * * * /var/www/muvs-data/backup.sh >> /var/www/muvs-data/backups/backup.log 2>&1\n30 4 * * * /another/application/backup.sh\n';
  const { desired, report } = prepareMuvsCrontab(source);
  for (const line of source.trimEnd().split('\n').filter(line => !line.includes('/var/www/muvs-data/backup.sh'))) assert.ok(desired.includes(`${line}\n`));
  assert.match(report.replacementBackupLine, /^17 3 \* \* \*/);
  assert.equal(desired.split('/root/muvs/monitor-production.sh').length - 1, 1);
  assert.notEqual(report.sourceSha256, report.desiredSha256);
  assert.throws(() => prepareMuvsCrontab(desired));
  const trailing = source.replace('/another/application/backup.sh\n', '/another/application/backup.sh  \n\n');
  assert.ok(prepareMuvsCrontab(trailing).desired.includes('/another/application/backup.sh  \n\n*/5'));
});

test('missing, duplicate, CRLF and compound foreign backup behavior fail closed', () => {
  const line = '0 3 * * * /var/www/muvs-data/backup.sh >> /var/www/muvs-data/backups/backup.log 2>&1\n';
  for (const bad of ['', line + line, line.replace('\n', '\r\n'), line.replace(' 2>&1', ' 2>&1 && /another/app/do-something')]) assert.throws(() => prepareMuvsCrontab(bad));
});
