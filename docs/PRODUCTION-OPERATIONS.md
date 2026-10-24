# MUVS production operations

Scope: the artist website, its `muvs-api` PM2 process, release pointer and `/var/www/muvs-data`. The same host/vhost contains unrelated applications. Never replace the live vhost with the reference `server/nginx.conf`, migrate ownership broadly, stop unrelated processes or run recursive chmod.

## Verified baseline — 2026-10-25

Active release at audit: `/var/www/muvs-releases/34564aeb8301`; root-owned Node22 API on `127.0.0.1:3001`, PM2 online with zero restarts, ~84MiB RSS. Disk 77% used /45GiB free. Origin certificate expires 2027-01-09; `snap.certbot.renew.timer` is active. Generic `certbot.timer` is not the installed renewal mechanism. Existing monitor scripts check legacy port8080, not this API; do not repurpose their unrelated service.

Immediately corrected, without changing file bytes or restarting anything:

- `/var/www/muvs-data`: root:root `0777` → `0755`.
- `/var/www/muvs-data/db.json`: root:root `0644` → `0600`.
- Root is the confirmed API writer and backup-cron user. Nginx `www-data` still traverses media; it cannot read the DB. Both public API/library remained200. This closes replacement of the root-executed `backup.sh` through its formerly world-writable parent. Do not restore0777 for upload troubleshooting.

Local backup snapshots previously covered only `db.json` (50 per-save plus daily JSON copies). They did not cover uploaded masters, catalog or private analytics. There is no verified off-host copy; disk/host-loss recovery remains an owner decision requiring a destination. No storage service/account has been invented.

## Coordinated Nginx rollout

1. Deploy and test the public document handler first. It accepts `/api/public-document` with `X-Muvs-Document-Uri` carrying the original path/query. Unknown paths must produce real404. Exact `/robots.txt` and `/sitemap.xml` locations proxy this handler before the generic static-file regex. General API requests cannot supply this trusted routing header through Nginx.
2. Copy the versioned snippets into `/etc/nginx/snippets/` with these mappings: `dubplates-nginx.conf`→`muvs-dubplates.conf`, `nginx-security-base.conf`→`muvs-security-base.conf`, `nginx-security-headers.conf`→`muvs-security-headers.conf`, `nginx-hide-upstream-security.conf`→`muvs-hide-upstream-security.conf`, `nginx-document-proxy.conf`→`muvs-document-proxy.conf`, `nginx-cloudflare-realip.conf`→`muvs-cloudflare-realip.conf`.
3. Before any live edit, create a root-only timestamped backup outside `sites-enabled` of the exact active `muvs.dev` and these snippets. Save `nginx -t` output and the active release target. Keep a rollback copy of every changed path.
4. Merge only the MUVS website/API/upload/document/cache/hidden-path/redirect locations from the reference config. Preserve every unrelated route/include. Security includes are location-scoped deliberately: a vhost-level CSP could break those applications. Root `/` proxies directly; deep links use the named rewrite/proxy fallback (named locations cannot contain a `proxy_pass` URI suffix).
5. At baseline, duplicate file `/etc/nginx/sites-enabled/muvs.dev.before-natural-shaper-20260912T105231Z` declared the same80/443 names and was ignored. After inspecting its exact content and coordinating with the owner, **move that exact backup** to the private backup directory outside `sites-enabled`; do not delete it or change another host. Run `nginx -t` again. On failure, restore all exact files and the moved duplicate before proceeding. Syntax-only isolated precheck: `node server/ops-nginx-check.cjs server` on the server (uses a temporary config and existing certificates; no reload/start).
6. Only after a clean syntax check and root review, reload Nginx once. Probe apex/www HTTP+HTTPS redirects, `/`, a real release/project, unknown path404, missing JS404, hidden path404, hashed asset immutable, stable artwork short-cache, uploads no-transform, all security headers, private API no-store and Dubplates noindex/no-referrer. Verify loader, Troika blob workers, playback and admin save. On failure restore the exact saved files and reload after another successful syntax check.

Staging helpers: `ops-merge-nginx.cjs` replaces only four recognized website location blocks and apex/www directives, refuses ambiguous/foreign source shapes, and verifies every other location/include body byte-for-byte. Existing shared443 listener options are preserved, including on the new www redirect, to avoid changing protocol behavior for unrelated hosts. It writes only a new `muvs.dev.staged` in a private staging directory, never `/etc/nginx` or a release. `ops-crontab.cjs` prepares (does not install) one exact backup-command replacement retaining its existing schedule and adds a separate MUVS-only health job. Other cron jobs, deploy schedule and legacy8080 monitor remain unchanged. Save and compare source SHA256 fingerprints again immediately before applying either staged file; abort on external drift rather than overwriting a newer change.

HSTS is apex-only, no `includeSubDomains`/preload. Static404s are not stamped immutable. The CSP retains the intentional inline priority loader/styles, worker/script `blob:` for Troika's nested worker imports, and font/connect `data:` for inline fonts and its XHR path. Actual production-build browser QA confirmed this combination without `unsafe-eval`; the obsolete ipapi permission is removed. Nginx1.24 does not merge `add_header` into child locations: preserve each include, especially in Dubplates. Cloudflare networks were checked against its official IPv4/IPv6 lists on2026-10-25; direct clients' claimed connecting-IP headers are not trusted.

### Verified live rollout — 2026-10-25 (2026-10-24 19:39 UTC)

Handler-capable release `ad8ea9fbca85` was healthy before installing the six reviewed snippets, merged vhost, root-only backup/monitor scripts and prepared root cron. Final `nginx -t` was clean, without the former duplicate-host warnings. The seven unrelated location blocks stayed byte-identical; six unrelated include files and two other enabled configs retained their hashes. The API PID/uptime/restart count did not change during this configuration rollout.

The recoverable original files and cron are in `/root/muvs-rollout-20261024T193023Z/backup/`; the exact disabled duplicate is retained under `backup/disabled-vhosts-retry2/`. Installed vhost SHA256: `a6dd24b95771ac52c786b76761c5c11bb772d254cc2b288d71a862a3043caf15`. Installed root-cron SHA256: `a59a5be5ade45f6720095352b814bae0bb61ddd45ac68bfe8050ee71c7751797`. The private `step2-result.json` records affected-file fingerprints and origin probes.

Two conservative apply attempts restored the exact previous configuration/cron before the final successful application: one probe wrongly expected a private-library mention in robots.txt, and another checked a retiring worker immediately after reload. `systemctl reload nginx` returning does not prove new workers are serving yet: the final bounded readiness check saw old HTML first, then the correct release title/CSP about150ms later. Poll a fresh connection for the expected document/headers before evaluating the rest of the post-reload checks; do not repeatedly reload to address this handoff.

Origin probes passed for `/`, `/veiled`, robots plaintext, sitemap XML, canonical www301, real missing/hidden404, public API private/no-store and Dubplates private/no-store/noindex. This does not prove older CDN entries were purged: externally verify plain canonical URLs separately, especially `/robots.txt`. Origin no-cache headers cannot retroactively invalidate an already cached edge response; use an exact-URL purge when authorized Cloudflare access is available.

## Deployment and rollback

Install the reviewed `server/deploy-production.sh` at the existing root-only `/root/muvs/deploy.sh` (mode0700), retaining its root cron schedule. Do not change credentials or print `/root/.config/muvs.env`. The source environment must remain root-owned0600.

The script builds before an atomic pointer change; only the existing named `muvs-api` entry is removed/recreated from the candidate absolute release script/cwd, with one fork instance (no multi-writer cluster). This deliberately retains a short API restart window: this PM2 version preserves an old absolute script path across `startOrReload` alone, as confirmed with an isolated temporary PM2 daemon. No other process name is deleted/restarted. A bounded probe validates API JSON and the exact candidate JS entry in the origin HTML. Only then does `pm2 save` confirm the runtime. Failure restores the previous validated release pointer/process and probes rollback; persistent data is never reverted. Code-only deploys need no shared Nginx reload. Cleanup accepts direct12-hex release directories only, never follows symlinks and always retains current+previous within5 releases. A failed cleanup leaves extra files instead of broad deletion.

Manual rollback uses the same approved script/config contract: resolve and validate the desired direct release directory, atomically restore `/var/www/muvs-current`, then replace **only** `muvs-api` using the current `ecosystem.production.config.cjs` with `MUVS_RELEASE_DIR` set to that desired release; run `ops-healthcheck.cjs <desired-release>` before `pm2 save`. The `.config.cjs` suffix is required by this PM2 version's ecosystem-file detection. Keep the old target available for reversal. Do not delete data, run `git reset`, or use global PM2 restart/save to repair unrelated applications. Shell scripts are tracked with LF through `server/.gitattributes`; verify `/bin/bash -n` before installing a copied script.

Compatibility boundary: install the first handler-capable release **before** applying the dynamic Nginx fallback. A rollback to an older release without `/api/public-document` also requires restoring the previous saved Nginx config/snippets, otherwise the old API cannot serve new document routing. Later rollbacks between handler-capable releases use the normal automated health guard.

## Full local backup / recovery

Installed on2026-10-25: reviewed `server/backup-production.sh` root-only at `/root/muvs/backup-production.sh` (0700), with only the existing MUVS03:00 root backup command replaced; its schedule and every unrelated cron line were preserved. Do not run old/new jobs concurrently. The root-private `/var/backups/muvs-site` directory is0700; each `.tar.gz` and checksum0600. An archive includes `db.json`, `uploads/` (including existing audio), `dubplates/catalog.json`, `dubplates/analytics.json`, `dubplates/assets/` (masters+previews) and optional meditation progress. Derived previews/temporary exports and secrets are not required. It shares the deployment lock to prevent restart cleanup mid-backup, checks capacity, verifies the full archive before publishing/checksum/retention, and keeps7 completed archives. Deploys never touch persistent data.

Health: the reviewed `monitor-production.sh` is installed root-only0700 at `/root/muvs/monitor-production.sh`. Its separate5-minute root cron runs `/bin/bash` explicitly, checks only the current artist-site API/origin, and logs failures through `logger -p daemon.err -t muvs-site-health`; it never restarts anything. `/var/log/muvs-site-health.log` and `/var/log/muvs-site-backup.log` were created root-owned0600 before installing the staged cron. Operators must inspect the local log/journal; there is no external notification destination or claim that somebody is watching it. The existing port8080 monitor/systemd checks remain unchanged.

Before declaring recovery verified, create and inspect a backup in an off-peak window, verify its checksum, then extract into a new root-private temporary restore directory—not over live data. Parse JSON and check every catalog asset reference against restored audio. A full restore requires coordinated maintenance/auth protection and explicit choice of snapshot; never overwrite a newer catalog or running writable assets casually. An archive on this host does not protect against losing this disk.

### Full live-data recovery verification — 2026-10-25 (19:56 UTC on2026-10-24)

The installed backup script ran at reduced CPU/I/O priority after mobile timing measurements. Archive `/var/backups/muvs-site/muvs-site-20261024T195350Z.tar.gz` contains1,451,658,338 bytes; SHA256 `edf5d73145431359e9278efe2561da92627bf38baa9bf6f012c8df2c437cb761` matches its0600 checksum file. Archive and backup-directory permissions were verified0600/0700.

Before extraction, every member was checked for allowed backup scope, duplicate/absolute/traversal paths and regular-file/directory type; symlinks, hard links and special files were rejected. All219 members were extracted only into `/root/muvs-restore-verify-20261024T195339Z-tkFXne/restored` under a root0700 workspace. This isolated copy is retained for inspection; nothing was extracted over production.

- All191 restored files (1,480,801,142 uncompressed bytes) matched fresh SHA256 baselines from live data before the archive. A second complete live hash inventory after verification also matched every file and the original file set.
- All5 JSON files parsed. The restored catalog contained21 tracks,22 assets,21 track-to-asset references and43 WAV/MP3 format references. Every referenced audio file existed, had a valid WAV/MP3 header and matched its original byte hash. All12 local `/uploads/` references found in the CMS/catalog resolved in the restored tree.
- `db.json`, `dubplates/catalog.json` and `dubplates/analytics.json` had identical before/archive/restored/after hashes, matching the baseline fingerprints below. No production files, download/listen events or API content were written by verification.
- Active release `50d9facae9f2`, API PID569933, uptime and restart count0 stayed unchanged throughout backup/verification. No deploy, restart or Nginx reload occurred during this exercise.

Private receipt and full per-file hash inventories: `/root/muvs-restore-verify-20261024T195339Z-tkFXne/receipt.json` and sibling JSON manifests. Local full-data extraction/integrity recovery is now verified; an in-place production restore and off-host/disk-loss recovery have **not** been exercised. There is still no verified off-host backup.

## Dependencies / follow-up

Compatible frontend lock-only patches: fflate0.8.2→0.8.3 and nested0.6.10→0.6.11, yaml1.10.2→1.10.3, dev-only proxy-addr2.0.7→2.0.8. Existing parent ranges, child graph, package.json and install-hook flags are unchanged; tarball/integrity values were verified with npm registry. This addresses both production-tree moderate findings and the dev critical finding, not every inherited CLI/tooling advisory. Server lock matches the audited live lock after normalizing CRLF and has zero findings. Review broader tooling upgrades separately; never use `npm audit fix --force` as a production operation.

Verification: fresh lock audit now has zero production frontend findings and zero server findings. All-tree frontend tooling still has26 (20high/4moderate/2low), no critical. Registry tarball bytes/SHA512 were checked for the exact four changed entries, with no new install hooks. Local scoped lint is clean; Ubuntu isolated Nginx syntax check passes. Native Ubuntu ops tests pass12/12, including an isolated PM2 namespace (cleaned), actual temporary shell success/rollback fixtures and archive/checksum/extract byte equality for sample data. The later full live-data isolated recovery verification is recorded above; no off-host backup is claimed. Live API process PID/uptime/restart counts stayed unchanged during these tests.

Post-permission-change runtime snapshot (2026-10-25, before code/Nginx rollout; data may legitimately change later):

```text
server/index.js             aa65dba61ec95ca87ab1994a1a0d3eb0329182f499a30b19d432a36d507aa28c
server/package-lock.json    004f85c111680baba627be24f4477cb964d803929a6eec8f6c791ddd1b1f883d
dist/index.html             98a33bd04b88e21f6ef7e1abcf41e046514263e880bf8c78a86482f7cd81f400
data/db.json                bf464fda530fae042da0748a58c85391265cf6a4bce9cf81cd46c843b20bd900
data/dubplates/catalog.json 20e5fe92600ce22d6d094a1c3c876e664f8c89f764d048caf7d6b4d4d501e410
data/dubplates/analytics.json d4a5e19a97d686e1c2be2fcfcfb3afa2d9c4d85ea691e5600365f58dacef4063
```
