# Dubplates

Public link: **https://muvs.dev/dubplates**. Editor: **https://muvs.dev/admin/dubplates**.

The page is deliberately absent from public navigation and sitemaps. HTML and HTTP responses request `noindex, nofollow, noarchive`. This is an unlisted page, **not access control**: anyone with the link can listen, download and share the link. Only admin-session holders can create/change tracks or see drafts.

## Adding music

1. Sign in to the existing admin and open **Dubplates → Add track**.
2. Enter title/artist, type (Dubplate or Release), genre, BPM, optional musical key, EP/release, date and notes. Upload an optional cover.
3. Upload the **WAV master** for original WAV downloads plus an automatically prepared 320 kbps MP3. An MP3 upload supports MP3 downloads only; converting it to WAV does not restore lossless quality.
4. Wait for audio processing. Save as a draft or enable publication and save. Drafts do not appear in the shared library.

Audio limit: 95 MB and 30 minutes per file. The conservative size leaves room below Cloudflare's baseline 100 MB request limit; the current zone plan is not assumed. Uploads are processed one at a time; large files may take a few minutes. Upload errors leave the previous saved audio in place. If a login expires, sign in in the offered new tab, then retry. An unsaved editor draft can be restored in the same browser tab.

## Listening and downloading

Search matches track, artist and release. Combine type, genre, release and BPM filters; sort by date, title or BPM. Click a cover to play; click/drag a waveform to seek. Keyboard users can focus the waveform and use arrow keys. One player is shared by all rows. Selecting tracks is independent of playback and survives filtering; hidden selections are counted.

Export offers formats available for **every selected track**. ZIPs are streamed directly to the browser without loading the entire archive into browser memory. Maximum 50 tracks / 1 GB per ZIP, two simultaneous exports globally and one per IP. Download tickets expire after five minutes and are single-use; the retry button creates a fresh ticket.

## Server operations

Persistent store: `$DATA_DIR/dubplates/` (normally `/var/www/muvs-data/dubplates`). `catalog.json` is atomically replaced; WAV/MP3 assets live under random internal asset IDs. This directory must be included in server backups, together with existing site data. It is **not** an nginx public upload directory. Audio is served through publication-aware API routes with Range support. Release deploys do not touch it.

Deleting a track hides it and preserves metadata/original audio for manual recovery. Replaced/orphaned ready assets are also retained. Default storage budget is 10 GB / 2,000 assets; contacting the owner is required at capacity. There is intentionally no automatic purge of music masters. Interrupted/invalid staging files are removed, not successfully processed originals.

Nginx: include `server/dubplates-nginx.conf` as `/etc/nginx/snippets/muvs-dubplates.conf` inside the existing HTTPS server block. Keep unrelated routes. Production builds emit `dist/dubplates.html` with static robots/referrer metadata; the exact `/dubplates` location serves it. Forwarded protocol and real client IP are set explicitly. Request buffering is disabled so unauthenticated large uploads reach auth checks before being spooled to nginx disk.

Cloudflare proxy ranges are trusted only inside the Dubplates API location for `CF-Connecting-IP`. Direct clients cannot spoof visitor identity. This keeps IP-bound download tickets and quotas attached to the visitor rather than a rotating Cloudflare egress address. Review the official IP ranges when updating infrastructure.

Deployment uses the site's existing atomic release script. A rollback must keep the persistent catalog/assets. Test before reload with `nginx -t`.

## Verification

`node --test src/utils/dubplates.test.js` — four filter/sort/time/waveform tests.

`npm --prefix server test` — five backend suites covering real conversion, original preservation, Range, admin auth, drafts, safe names, malformed audio, ZIP content, limits and restart cleanup.

`npm run build` and scoped ESLint pass. Browser checks covered desktop 1440px, mobile 390px, real audio, keyboard seeking, selections across filters, actual MP3/WAV ZIP downloads, no-results and empty states. Admin browser checks covered failed save/delete, expired sessions, processing, file replacement and draft recovery. Test fixtures live only under ignored local `output/`, never production.
