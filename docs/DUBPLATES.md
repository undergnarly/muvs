# Dubplates

Public link: **https://muvs.dev/dubplates**. Editor: **https://muvs.dev/admin/dubplates**.

The page is deliberately absent from public navigation and sitemaps. HTML and HTTP responses request `noindex, nofollow, noarchive`. This is an unlisted page, **not access control**: anyone with the link can listen, download and share the link. Only admin-session holders can create/change tracks or see drafts.

## Adding music

1. Sign in to the existing admin and open **Dubplates → Add track**.
2. Enter title/artist, type (Dubplate or Release), genre, BPM, optional musical key, EP/release, date and notes. Add comma-separated **tags** (up to12, each80characters), an optional **production stage** (Sketch / Mixed / Mastered), and your optional **private rating0–10**. Zero is a real rating; blank means unrated. Upload an optional cover.
3. Upload the **WAV master** for original WAV downloads plus an automatically prepared 320 kbps MP3. An MP3 upload supports MP3 downloads only; converting it to WAV does not restore lossless quality.
4. Wait for audio processing. Save as a draft or enable publication and save. Drafts do not appear in the shared library.

Audio limit: 95 MB and 30 minutes per file. The conservative size leaves room below Cloudflare's baseline 100 MB request limit; the current zone plan is not assumed. Uploads are processed one at a time; large files may take a few minutes. Upload errors leave the previous saved audio in place. If a login expires, sign in in the offered new tab, then retry. An unsaved editor draft can be restored in the same browser tab.

## Listening and downloading

Search matches track, artist, release and tags. Combine type, genre/tag, production stage, release and BPM filters; sort by date, title or BPM. Multiple genres/tags appear as black/white chips below each track; the existing genre is retained and duplicate chips are suppressed. Click a cover to play; click/drag a waveform to seek. Keyboard users can focus the waveform and use arrow keys. One player is shared by all rows. Selecting tracks is independent of playback and survives filtering; hidden selections are counted.

Export offers formats available for **every selected track**. ZIPs are streamed directly to the browser without loading the entire archive into browser memory. Maximum 50 tracks / 1 GB per ZIP, two simultaneous exports globally and one per IP. Download tickets expire after five minutes and are single-use; the retry button creates a fresh ticket.

ZIP remains the default. With exactlyone selected track, **Download as → Audio file** downloads the chosen MP3 or WAV directly, without an archive. Files use `Artist - Title.ext`, without an added numeric prefix. Only genuinely colliding archive names get a trailing `(2)`, `(3)`, etc. WAV is never offered for an MP3-only original.

## Loudness and private metadata

**LUFS-I** is whole-file integrated loudness measured from the uploaded original (WAV when available, otherwise the original MP3), retaining its channel layout and full-band audio. Measurement uses FFmpeg's measurement-only EBU R128 scanner (`ebur128`, peak analysis off) to a null sink, without a normalization pass or oversampling. It does **not** normalize, replace or change the downloadable audio. References: [official scanner documentation](https://ffmpeg.org/ffmpeg-filters.html#ebur128-1), [scanner implementation](https://github.com/FFmpeg/FFmpeg/blob/master/libavfilter/f_ebur128.c).

New uploads are measured automatically. **Analyze existing audio** queues previously uploaded ready assets in small sequential batches (up to12 waiting jobs). The admin shows progress and whether more batches remain; run it again for the next batch. Per-track **Measure loudness** retries an unavailable/failed/unmeasured analysis. Interrupted measurements are retryable after a restart. Silence or a very short signal that cannot be measured is unavailable, never a fabricated zero. A measurement failure does not discard valid audio or block publication.

Old tracks keep an unspecified stage/unrated score until explicitly edited. Public responses omit the private rating entirely; only authenticated admin views show it. Stages, tags and measured LUFS-I are public library metadata.

## Listener activity

Open the admin **Listener activity** panel and use **Refresh activity**. Each track shows downloads, qualified listens, MP3/WAV split and last download; sort the library by most downloaded, most listened or private rating. **Recent downloads** shows the latest batches and format/delivery type. Statistics begin when this update is deployed; earlier downloads cannot be reconstructed from this feature.

- A download is counted only when the server completes a full successful export response. ZIPs increment each included track once. Ticket creation, preview streaming, HEAD, partial ranges, expired/reused tickets, failed/aborted transfers and authenticated owner downloads do not count. A completed server transfer is not proof the recipient saved a file to disk.
- A qualified listen requires30seconds of actual playback, or half of a shorter track. Seeking, pauses and buffering do not add playback time. Client submission is best effort and server deduplication is once per track/random browser-tab session per30minutes; refreshing, network failures, blockers or API restarts can affect counts. Authenticated owner listening is excluded. These are interest indicators, not audited audience numbers.
- This is aggregate activity, not identification of individual producers. Analytics persist per-track counts and the latest100 download batches, not raw IPs, user agents or session IDs. An ephemeral random session token is used only for a bounded in-memory30minute deduplication window and is discarded on API restart. Server request throttles use transient IP-based limits separately.

Analytics are stored separately in `$DATA_DIR/dubplates/analytics.json` with private file permissions and atomic writes. Back it up with the catalog. A malformed analytics file fails closed instead of silently resetting your counts.

## Server operations

Persistent store: `$DATA_DIR/dubplates/` (normally `/var/www/muvs-data/dubplates`). `catalog.json` is atomically replaced; WAV/MP3 assets live under random internal asset IDs. This directory must be included in server backups, together with existing site data. It is **not** an nginx public upload directory. Audio is served through publication-aware API routes with Range support. Release deploys do not touch it.

Deleting a track hides it and preserves metadata/original audio for manual recovery. Replaced/orphaned ready assets are also retained. Default storage budget is 10 GB / 2,000 assets; contacting the owner is required at capacity. There is intentionally no automatic purge of music masters. Interrupted/invalid staging files are removed, not successfully processed originals.

Nginx: include `server/dubplates-nginx.conf` as `/etc/nginx/snippets/muvs-dubplates.conf` inside the existing HTTPS server block. Keep unrelated routes. Production builds emit `dist/dubplates.html` with static robots/referrer metadata; the exact `/dubplates` location serves it. Forwarded protocol and real client IP are set explicitly. Request buffering is disabled so unauthenticated large uploads reach auth checks before being spooled to nginx disk.

Cloudflare proxy ranges are trusted only inside the Dubplates API location for `CF-Connecting-IP`. Direct clients cannot spoof visitor identity. This keeps IP-bound download tickets and quotas attached to the visitor rather than a rotating Cloudflare egress address. Review the official IP ranges when updating infrastructure.

Deployment uses the site's existing atomic release script. A rollback must keep the persistent catalog/assets. Test before reload with `nginx -t`.

## Verification

`node --test src/utils/dubplates.test.js` — four filter/sort/time/waveform tests.

`node --test server/dubplates.test.js server/dubplates-analytics.test.js` — metadata privacy, real audio/source LUFS, serial legacy analysis, exact failed-save rollback, original preservation, authenticated drafts, ZIP/direct transfers and counting, abort/HEAD/range exclusions, persistence/deduplication/bounds and restart cleanup.

`node --test src/utils/dubplates*.test.js src/components/admin/dubplatesAdminHelpers.test.js` — public filters/tags/stage/LUFS, actual-listening meter, random session behavior, private rating/legacy editor helpers and admin sorting.

`npm run build` and scoped ESLint pass. Browser checks covered desktop 1440px, mobile 390px, real audio, keyboard seeking, selections across filters, actual MP3/WAV ZIP downloads, no-results and empty states. Admin browser checks covered failed save/delete, expired sessions, processing, file replacement and draft recovery. Test fixtures live only under ignored local `output/`, never production.
