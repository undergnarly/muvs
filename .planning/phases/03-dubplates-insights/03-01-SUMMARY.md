# 03-01 — Dubplates metadata and interest

## Changes

- Backend `d727469`: optional multi-tags, private0–10 rating, honest optional Sketch/Mixed/Mastered, whole-original integrated LUFS-I on upload and explicit bounded serial legacy analysis. Existing originals/publication/IDs are preserved; missing legacy metadata remains unknown. A failed legacy save restores the exact previous object after an injected persistence error.
- Library/admin `c334eef`: public black/white bottom tag chips, tag search/genre filtering and stage filter, stage/LUFS-I metadata; default ZIP or a direct audio file with exactlyone selection. Native export dialog restores trigger focus. Admin adds private rating/tags/stage, measured/failed/pending loudness status, explicit batch/per-track measurement, aggregate listener activity/recent downloads and sorting by interest/private rating.
- ZIP and direct names use Artist - Title.ext, no index prefix. Genuine duplicate archive names get a trailing collision suffix. MP3-only originals never become fake lossless WAVs.
- Downloads are counted after successful full server export transfer, per included track; not ticket creation/HEAD/range/preview/aborted/owner requests. Actual playback meter qualifies30seconds or half a short track and ignores seeks/pauses/buffering. Owner sessions are excluded. Counts are interest indicators, not proof of disk save or individual producer identity.
- Private analytics.json persists aggregates/latest100 batches; ephemeral HMACdedupe5000/30minutes, no rawIP/UA/sessionIDs on disk. Public rating is omitted even when malformed legacy input is an object. Admin stats/analysis remain authenticated. All old limits/publication checks/noindex/unlisted routing retained.
- Task1 refinement `55db3ef`: use measurement-only whole-file EBU R128 scanner, not the initial loudnorm normalization/null pass. A real180s44.1kHzstereoWAV benchmark was9409.7→544.1ms locally (17.3×); this is not a universal production speed claim. New whole-file dynamic-step, opposite-phase stereo, native8k, short/quiet/silent tests validate measurement semantics. Native scanner and normalization-pass input numbers need not be universally identical; all existing22 assets are explicitly re-measured for one consistent method. Source audio bytes are never rewritten.

## Verification

- Full226/226 final tests pass, including new helpers/analytics/API suites and whole-file scanner regression. Scoped frontend lint has0 errors/warnings; production build passes, existing large3Dchunk warning unchanged. Focus cleanup warning fixed before final build/commit.
- Independent read-only security/data-safety review found one legacy PUT rollback P2, fixed/tested; no remaining P1/P2 blocker. Reviewer independently ran real API/LUFS/analytics/playback tests.
- Real isolated loopback API/product upload workflow with synthetic6secondWAV and MP3-only audio. LUFS-I−12.4 measured; actual browser playback registers1 qualified listen, direct WAV increments1 download and multi-track ZIP another2. Direct WAV and direct MP3 match original bytes. Native archive inspection confirms `MUVS - Night Jungle.mp3` / `MUVS - Sketch for the Next Session.mp3`. Direct filename `MUVS - Night Jungle.wav`, no prefix; WAV disabled for MP3-only.
- Production-preview browser320×640/390×844/1440×900: public rows/tags/stage/LUFS, desktop/admin stats/recent details/editor/export dialog inspected with no overflow/newpageerrors. ZIP default, direct single-file and multi ZIP-only, Escape and explicit focus return pass.
- Tag filter finds multi-word DrumnBass, combined wrongstage yields empty state; reset tested. Actual320px discovery fixed expanded-filter count wrapping and empty-state recovery-button sticky-toolbar/player occlusion with a narrower search basis and scoped scroll margins. Mobile reset now works with normal click.
- Admin rating0 saved privately, unsaved new tags/stage/rating recover after real reload,11 is invalid,10 stays in the form after simulated500, blank clears score. Stats401 shows sign-in/retry and recovers. Batch-analysis UI has no automaticPOST on mount, explicit request/poll completion covered with controlled pending/ready responses; backend realqueue/original safety separately tested.
- Physical handset unavailable; mobile checks are Chrome emulation. Evidence under ignored `output/dubplates-insights-20261018/screenshots/`; synthetic music/analytics only in isolated local output, never production.

## Production baseline / safeguards

Persistent21tracks/22assets,1.3GB. Backup before publication: `/var/www/muvs-data/backups/dubplates-catalog-pre-insights-d727469.json`, mode0600, SHA256 `ffbf893af9a7c3f70dce983c555b2c32ce80eb1ce1c0f6275c7864ee5a9ecea8`.

Baseline full track-array SHA256 via jq: `88dfad49a3589865c41cbf6d2551ea77e12ffda7b460b2ccf660612a74a92a3c`.
Baseline identity/publication projection SHA256: `a5cf1fefac8105e46973985189b60d32f2dcf4becd58bcbf40e6e62639dcb5f2`.
Baseline sorted original/preview file SHA256 manifest digest: `7dc0a48c382c2acf525d068d5f8f7873e22efc3ba5e5b39e2883cc905937426c`.
Baseline public general CMS SHA256: `dc2d30237a353a3caa4460531bb5aa13aaf10e217ab3bdd1c22500aefa4b7523`.

Initial live `c334eef3c67d` verified21tracks/all21measured, private rating omitted, unknownstage null, adminstats401, no3Dbundle, mobileexport choice and zero page errors. Public JS `DubplatesPage-CrXGzmm0.js` SHA256 `9e5688f9232f0825719fdd1b35f3ebb3aa9e964f71fee40eb1ecc6d61b618ebc` and CSS `DubplatesPage-BbdD3trP.css` SHA256 `f4d11b55bc084508c5b7b17d2d586d05932b4803b38e3dff08cb4130de75654f` match release files. Authenticated loopback checks create ZIPdefault/direct tickets and repeated HEAD200 with correct attachment filename/mime; totals remain0/0, no synthetic production activity. Analytics file0600, since2026-10-18T10:56:44.005Z stable.

Scanner release `/var/www/muvs-releases/55db3efd2fd0` deployed19:04:32+08:00. All22assets explicitly remeasured through authenticated API in fixed12+10 batches, no pending/error jobs; all21publishedtracks have finite readyLUFS-I. Live mobile search Big shows−9.1LUFS-I, no errors, no public rating. Server source SHA256 `6383da40ef19a4ce6afcb29b870943c33b70f56cc869ac6784ef12c452b2e2e5` matches normalized local source. Full track-array SHA, original/preview manifest SHA and public CMS SHA all equal baseline after measurement. Thus no track metadata or audio bytes were changed; only asset loudness results/timestamps and separate new analytics were added.

No required unfinished work. Unrelated dirty `/root/muvs` checkout and its server/index.js remain untouched; deploy uses existing mirror/releases. All local writes C:/Projects/Muvs, never OneDrive. Owned local API/preview/browser are closed after final QA; no production synthetic music/download/listen activity created.

## Limits

Statistics begin at deployment, cannot identify individual producers via one shared link, and cannot reconstruct earlier interest. Client events are best effort; a new anonymous session can inflate interest and blocking/offline clients can undercount. Thirty-minute session dedupe is deliberately in memory, reset on API restart. This is not audited audience/billing analytics. No auto-guessed stages/ratings/tags added to existing music.
