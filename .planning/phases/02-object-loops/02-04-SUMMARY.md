# 02-04 — Reliable first frame, quiet loops

## Delivered

- Music drop/dust and Code lid-opening runtime removed. Homepage starts20% closer and eases out once over1s; hidden time freezes, selection/navigation cancels, reduced motion/Save-Data skips. Existing camera stops and swipes unchanged.
- Mixes uses fixed original geometry/ambient brightness with brief localized bronze side glints every3s. Face/chest do not pulse. Code retains stronger blue-white laptop reflection with the lid always open. Music single-lizard loop retained.
- Three720px RGBA posters are exact decoded frame0 RGB plus original alpha (visible RGB and alpha QA differences0). Three96px inline RGBA fallbacks survive network failure.
- Splash warms all three silent MP4s/masks in parallel, waits for full buffers or bounded8s fallback, and waits for a drawn menu object. Only selected/visible media play. Ready video requires verified pixels, alpha, successful playback and a first video-frame callback; GPU texture is explicitly dirtied before exposure.
- Stable declarative material map+alpha binding replaces imperative entrance color/opacity mutation. A missing video/mask retains the poster; no naked white material plane is exposed.

## Additional startup blockers fixed

1. Local inline Urbanist500/700 (same original font, OFL retained) removes menu label dependence on remote font availability.
2. Hidden section content has a separate Suspense boundary: offscreen release/Yuliana fonts cannot suspend the menu.
3. Lecture reading-font CSS import moved to an independent head stylesheet, because blocking Google Fonts previously rejected the entire Vite AppRoot CSS preload.
4. Initial CMS read is bounded to8s with AbortController and StrictMode cancellation. It does not write or replace server content.
5. Home scene has isolated Suspense/ErrorBoundary and a15s last-resort deadline. Actual WebGL failure replaces/unmounts3D with a DOM still, static section links and reload link; it does not expose a blank canvas.
6. Current motion preference is rechecked in the existing R3F frame (no new loop). Chromium CDP sometimes updated the original MQL.matches without delivering its change event; the fallback guard correctly pauses immediately.

## Verification

-78/78 Node tests pass;34 dedicated cache/runtime regressions include real THREE.VideoTexture.version0, first-frame retries, full-buffer coverage, warm failure, duplicate leases, reduced-motion/Save-Data and max-one-playing rules.
- New/modified isolated files pass ESLint. Existing HomeNewPage/AppRoot/DataContext diagnostics unchanged from baseline; diff-check and production build pass. Existing large-chunk warning remains.
- Desktop cold cache-disabled screenshots:45 frames with real timestamps. Capture target100ms, actual cadence usually100–150ms with slower startup frames. No empty/white artwork plane from reveal onward;1s zoom-out inspected. Mixes transition:27 additional frames, no pale/bright/dark introduction.
- Final ordinary cold start observation: splash removed at2303ms; all3 videos readyState4 and buffered[0,6] of6s. All were paused at reveal; afterwards only Music played. At120ms latency/256KiB/s, bounded fallback revealed a still while MP4s completed later.
- All object MP4/poster/mask URLs and external fonts blocked together: Music/Mixes/Code still render bundled fallbacks and remain navigable. Separate simulated WebGL failure produces the independent static recovery page.
-390×844 touch swipes verified Music→Mixes→Code; selected-only playback confirmed for each. Cold reduced-motion requests noMP4; dynamic reduced-motion pauses all videos after fresh-frame guard. Physical iPhone not tested.
- Browser test overrides and injected instrumentation are removed by resetting emulation and reloading. Screenshots/contact sheets and timing/runtime proofs are in ignored `output/cold-start-qa/`.

## Commits and publication

- Media: `aeabbe4`.
- Runtime: `69c7476`.
- Atomic release `/var/www/muvs-releases/69c7476eb830` deployed2026-10-03. Home/Dubplates200 and Mixes byte-range206. All four new media SHA256 hashes match local. Public CMS SHA256 unchanged: `bc822560dfc613054629a62ac838fe6971cfa28e39a3589ea0532a593b09ad3f`.
- Live uncached390×844 Music/Mixes/Code touch navigation inspected; no browser errors, all three MP4 requests verified. Live screenshots: `output/cold-start-qa/live-{music,mixes,code}.jpg`; contact sheet `live-mobile-proof.jpg`.
- Existing deployment warnings: frontend npm audit30 dependency findings, large bundle and duplicate nginx host declarations. Backend audit0. Dependency/server cleanup is outside this visual task; no unrelated configuration changed. Metadata-only follow-up may trigger another identical-code automatic release.

CMS/AdsUp covers/releases, camera navigation geometry, gyroscope removal and unrelated server applications remain unchanged. Old public media assets are retained for cached clients. No new Flow generation or credits used.
