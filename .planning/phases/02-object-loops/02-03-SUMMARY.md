# 02-03 — Artwork entrances

## Delivered

- Music: small gravity-like drop, short settle and a soft procedural dust plume moving outward/upward. Mixes: warm bright reveal fading to normal bronze light. Code: only the original laptop lid opens around a fixed hinge; exact foreground hand/knee layers preserve the statue, then the original poster and brighter white-blue screen loop take over.
- 2.4-second selected-only timeline, shared by duplicate ring copies. Deliberate re-selection replays; hidden return freezes/resumes without replay. Navigation is interruptible. Existing camera, CMS artwork/data, AdsUp, gyroscope removal and Pause-button removal are preserved.
- One playing decoder; video preloads while the entrance runs and seeks to zero once per new selection. Reduced-motion/Save-Data skip the entrance. Code layers load on selection, share one cache and dispose partial failures. Pending Code briefly conceals the open-lid poster to avoid an open→closed snap; waiting is capped at two visible settled seconds before the ordinary poster/loop fallback.

## Media provenance

Flow project `85818385-22da-4514-ba1c-2d24f6e4fea8`, generated cleanplate still `6ee88723-569d-4c08-a508-9f117b0b2a20` (`MUVS_code_laptop_cleanplate_v01`). Only the small region previously hidden behind the lid is transferred; all other statue pixels and the visible lid/logo are original. One still generation, no new Flow video generation or purchase. A per-image credit price was not shown; no credit-charge claim is made.

Raw donor and QA files remain in ignored `C:\Projects\Muvs\output\flow-muvs-v3`, never OneDrive. `prepare-code-entrance.cjs` produces three lossless1024² layers; `prepare-object-relighting.cjs` produces fixed-geometry Code v3. Code video:720²,24fps,6s,silent,302179bytes. Existing old URLs remain available for cached bundles.

SHA256:

- base: `75498fc95a282871a99fd51bc19a80fc66329eded886f4df1c8970bcba3a28e2`
- lid: `3ec8a65b2b796a4ba405aa4e51284fe6d8ad3f6e8f4005193192722cb98ca5b9`
- foreground: `f628ae7e56ecf11edb97154c271bbfb2ed167aed68e7b1dff28f9c8ee52998bb`
- Code v3: `837d948924af0388c732fdfd876abd3e9b52942bc9be8457fc5d6a3057d5ed49`

## Verification

- 71/71 tests pass across source utilities, manifest and media preparation scripts. Scoped ESLint and production build pass; Home/Ring pre-existing lint diagnostics have no delta. Existing bundle-size warning remains.
- Local production preview desktop and390×844 touch navigation inspected. Ring wrap, quick consecutive selection, selected-only autoplay and stronger Code light work. Reduced-motion stops observed decoders and restores the original poster. Blocked Code-layer requests preserve a functioning original object/menu without an application exception.
- Ignored orthographic browser harness verifies fixed frames at0.25/0.8/1.2/1.8/2.4s. Lid starts nearly closed, opens with stationary body, and returns exactly to original pixels. Dust rises and spreads without a rectangular background; Mixes bright reveal retains bronze detail. Browser inspection caught a cloned shader-uniform reference; frame writes now target the actual GPU material uniform.
- Timeline tests cover hidden/offscreen/context-loss freeze, duplicate-copy clock deduplication, reduced-motion/data-saving, media errors and timeout. Cache tests cover rewind/seeked, autoplay rejection/recovery and one-playing limit. Physical iPhone/Safari is not tested.
- Source commits: media `106f04e`, runtime `c059ea6`.

## Deployment

2026-10-03 00:02 Asia/Makassar: atomic release `/var/www/muvs-releases/c059ea664a49` deployed by the existing auto-deploy after push. Server build passes; API online. Home and Dubplates200; Code byte range206. All four live media hashes match local files. Public CMS SHA256 remains `bc822560dfc613054629a62ac838fe6971cfa28e39a3589ea0532a593b09ad3f`.

Live390×844 touch navigation Music→Mixes→Code verified with current bundle `AppRoot-B2pJmv1P.js`. All three Code layers load; Code v3 plays automatically, muted/inline, while Mixes is paused. No app console errors. Screenshot: `output/flow-muvs-v3/live-code-mobile-final.jpg`. Temporary browser overrides/instrumentation removed after QA. Existing nginx duplicate-host warnings and frontend dependency audit findings are unchanged; backend audit0.
