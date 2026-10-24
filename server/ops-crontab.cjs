const crypto = require('node:crypto');

function prepareMuvsCrontab(current) {
  if (typeof current !== 'string' || current.includes('\r')) throw new Error('Expected a plain LF root crontab snapshot');
  const lines = current.split('\n');
  const indexes = lines.flatMap((line, index) => !/^\s*#/.test(line) && line.includes('/var/www/muvs-data/backup.sh') ? [index] : []);
  if (indexes.length !== 1) throw new Error('Expected exactly one existing MUVS data-backup cron job');
  if (lines.some(line => !/^\s*#/.test(line) && line.includes('/root/muvs/monitor-production.sh'))) throw new Error('MUVS health job already exists; review instead of duplicating');
  const index = indexes[0];
  const matched = lines[index].match(/^((?:\S+\s+){5})(?:\/bin\/bash\s+)?\/var\/www\/muvs-data\/backup\.sh(?:\s*>>\s*\/var\/www\/muvs-data\/backups\/backup\.log)?(?:\s+2>&1)?\s*$/);
  if (!matched) throw new Error('Existing MUVS backup job has unrecognized behavior');
  const oldBackupLine = lines[index];
  lines[index] = `${matched[1]}/bin/bash /root/muvs/backup-production.sh >> /var/log/muvs-site-backup.log 2>&1`;
  const healthLine = '*/5 * * * * /bin/bash /root/muvs/monitor-production.sh >> /var/log/muvs-site-health.log 2>&1';
  const body = lines.join('\n');
  const desired = `${body}${body.endsWith('\n') ? '' : '\n'}${healthLine}\n`;
  return { desired, report: {
    sourceSha256: crypto.createHash('sha256').update(current).digest('hex'),
    desiredSha256: crypto.createHash('sha256').update(desired).digest('hex'),
    replacedBackupLine: oldBackupLine, replacementBackupLine: lines[index], appendedHealthLine: healthLine,
  } };
}

module.exports = { prepareMuvsCrontab };
