# 02-06 — Render-first startup, elevated opening dolly and softer captions

## Cause and correction

The screenshot is consistent with the old 65% loading phase: posters have settled, the selected scene is visible, but the splash still waits for all three videos to fully buffer. Mobile/background buffering can stall or take the full 8–8.5s media deadline. The current version had a further 15s scene deadline, so the inspected branch was bounded in an active responsive browser; an indefinite device-specific hang could not be proved from the screenshot alone.

- The startup gate begins all poster/video warming eagerly but opens on the retained first artwork-render signal alone. A rejected or permanently pending warmup cannot hold a drawn scene behind the splash.
- The first-frame signal still requires an actual rendered selected object with a decoded poster/inline texture. Renderer failures retain the existing static recovery path and deadline.
- The progress bar cannot regress from READY/100 when a late background warmup reports progress.
- Route cleanup finishes splash removal if its fade has already started, rather than cancelling that removal and leaving the reveal flag unset.
- An independent HTML timer covers a stalled or failed lazy application bundle before AppRoot mounts. At 18s it replaces LOADING with a connection/load message and a 44px Reload action. AppRoot cancels this timer with an event; its separate scene deadline then owns renderer recovery.

## Opening and typography

- Initial Music camera starts 20% closer and about 0.43–0.50 scene units higher, targeting the same tuned look point. It physically dollies backward and descends over 1.25s with smooth endpoints. Projection zoom stays 1; the final camera pose remains exact.
- Hidden time freezes the opening; menu selection, entering a section, reduced motion and Save-Data cancel it permanently. No added animation loop or React frame updates.
- All menu captions use Josefin Sans 700, gray #666666 and 0.06em tracking (previously 0.18em). All five Code project short captions use the same gray and 0.035em, including the inline override and bold emphasis. Existing mobile width/placement rules remain.

## Verification

- 80/80 Node tests pass. Changed isolated utilities/tests pass ESLint; diff check and production build pass. Independent read-only implementation review found no blockers. Existing bundle/dependency warnings remain outside this task.
- In a cache-disabled 390×844 browser, MP4 requests were intercepted and kept pending. The fixed loader disappeared at 3379ms, with the real menu present despite the pending media. The old gate was separately observed at 65% with all three MP4 requests pending.
- Blocking all object video/poster/mask requests and external fonts still reveals the bundled artwork fallback; loader removed at 3306.6ms. Touch Music→Mixes remained usable. No white artwork plane appeared in inspected captures.
- Captured 22 opening frames over approximately 3.9s; elevated close start, smooth retreat and exact resting composition inspected. Screenshot timing includes browser capture latency, not guaranteed 100ms samples.
- Blocked the AppRoot chunk: HTML recovery message/Reload appeared. Removing the block and pressing Reload restored the menu. Inline watchdog VM checks cover mount cancellation, missing/hidden splash and retry.
- Reduced-motion launch inspected at the resting camera position. Final normal desktop launch removed the loader at 3104.2ms. Mobile 320×740 Mixes caption fits below the artwork. Five Code captions at 390px have requested font/color/tracking and no scroll-height clipping.
- Browser network/touch/motion/viewport overrides were reset. Evidence: ignored output/startup-revision-qa/. Physical handset testing was not performed.

## Publication

- Startup commit: 26bf278. Camera/captions: 0d46167.
- Pre-publication CMS SHA256: bc822560dfc613054629a62ac838fe6971cfa28e39a3589ea0532a593b09ad3f.
- Atomic release /var/www/muvs-releases/0d46167f76b3 deployed 2026-10-05. Home and Dubplates return 200; public CMS SHA256 is unchanged.
- Live cache-disabled 390×844 launch removed the loader at 3708.9ms. All four menu captions show Josefin Sans 700, #666666 and 0.96px tracking; the embedded font is loaded. Fresh live browser error log is empty. Live screenshot: output/startup-revision-qa/live-music.jpg.
- Local/deployed caption CSS SHA256 matches: d008bc0bd0d60a27bb7ae8ed52f8adf146c5f01d3fa896560596a31113944839.
- Existing frontend audit/bundle and duplicate nginx host warnings were unchanged; backend audit is clean. Metadata-only follow-up may trigger another identical-code automatic release.

CMS content, videos, covers, routes and unrelated server applications were not edited. No Flow generation or credits used.
