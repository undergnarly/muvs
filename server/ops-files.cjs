const fs = require('node:fs');
const path = require('node:path');

const RELEASE_NAME = /^[a-f0-9]{12}$/;
const BACKUP_NAME = /^muvs-site-\d{8}T\d{6}Z\.tar\.gz$/;

function ownedChild(root, candidate, pattern, kind = 'directory') {
  const realRoot = fs.realpathSync(root);
  const target = path.resolve(candidate);
  if (path.dirname(target) !== realRoot || !pattern.test(path.basename(target))) throw new Error('Unsafe operation target');
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink() || fs.realpathSync(target) !== target
    || (kind === 'directory' ? !stat.isDirectory() : !stat.isFile())) throw new Error('Operation target is not an owned plain entry');
  return target;
}

function releasePath(root, candidate) { return ownedChild(root, candidate, RELEASE_NAME); }

function removeStaging(root, candidate, sha) {
  if (!RELEASE_NAME.test(sha)) throw new Error('Invalid release identity');
  const target = ownedChild(root, candidate, new RegExp(`^\\.building-${sha}-[A-Za-z0-9]+$`));
  fs.rmSync(target, { recursive: true });
}

function pruneReleases(root, current, previous, keep = 5) {
  if (!Number.isInteger(keep) || keep < 2 || keep > 30) throw new Error('Invalid release retention');
  const realRoot = fs.realpathSync(root);
  const protectedPaths = new Set([releasePath(realRoot, current)]);
  if (previous) protectedPaths.add(releasePath(realRoot, previous));
  const entries = fs.readdirSync(realRoot, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && RELEASE_NAME.test(entry.name))
    .map(entry => { const target = releasePath(realRoot, path.join(realRoot, entry.name)); return { target, modified: fs.statSync(target).mtimeMs }; })
    .sort((a, b) => b.modified - a.modified);
  for (const entry of entries) if (protectedPaths.size < keep) protectedPaths.add(entry.target);
  const removed = [];
  for (const entry of entries) if (!protectedPaths.has(entry.target)) {
    // Revalidate immediately before deletion, not just during enumeration.
    fs.rmSync(releasePath(realRoot, entry.target), { recursive: true });
    removed.push(path.basename(entry.target));
  }
  return removed;
}

function pruneBackups(root, keep = 7) {
  if (!Number.isInteger(keep) || keep < 2 || keep > 90) throw new Error('Invalid backup retention');
  const realRoot = fs.realpathSync(root);
  const files = fs.readdirSync(realRoot, { withFileTypes: true })
    .filter(entry => entry.isFile() && BACKUP_NAME.test(entry.name)).map(entry => entry.name).sort().reverse();
  const removed = [];
  for (const name of files.slice(keep)) {
    fs.unlinkSync(ownedChild(realRoot, path.join(realRoot, name), BACKUP_NAME, 'file'));
    const checksum = path.join(realRoot, `${name}.sha256`);
    if (fs.existsSync(checksum)) fs.unlinkSync(ownedChild(realRoot, checksum, /^muvs-site-\d{8}T\d{6}Z\.tar\.gz\.sha256$/, 'file'));
    removed.push(name);
  }
  return removed;
}

module.exports = { ownedChild, releasePath, removeStaging, pruneReleases, pruneBackups };
if (require.main === module) {
  const [command, root, first, second, third] = process.argv.slice(2);
  try {
    if (command === 'validate-release') console.log(releasePath(root, first));
    else if (command === 'remove-staging') removeStaging(root, first, second);
    else if (command === 'prune-releases') console.log(JSON.stringify({ removedReleases: pruneReleases(root, first, second, Number(third)) }));
    else if (command === 'prune-backups') console.log(JSON.stringify({ removedBackups: pruneBackups(root, Number(first)) }));
    else throw new Error('Unknown operation');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
