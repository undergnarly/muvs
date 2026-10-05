# 02-15 — Physical floor props and breathing menu words

## Outcome

Complete and published. Functional commits: `fcae599` (title breathing), `2f70d23` (physical props); verified release `/var/www/muvs-releases/2f70d236cc68`. All edits are in C:/Projects/Muvs, never OneDrive.

Music stones now use fixed world dimensions rather than shrinking in world space to retain the same screen-pixel size at every depth. Their measured alpha supports and unique silhouettes are preserved. Mixes uses actual 3D cassette boxes, thin extruded records with spindle holes, and a cutout reel with tape/hub volume. Cassette width .165, vinyl diameter .495 (3×), reel diameter .33 and rock normalized width .32, multiplied only by hero itemSize/3.4. Flat/standing cassette poses are varied; records lie flat instead of balancing unsupported on an edge. Support math uses the complete rotated shape, with the same floor-derived contact shadow. Ground remains aligned to each approved hero's opaque base rather than its padded image rectangle.

Manually curated foreground positions remain deterministic. Mobile foreground Music stones moved inward to .20/.80 and Mixes record/reel to .24/.76 after native-input frame review found accidental early left-edge cropping. They still begin below the fold and are revealed by the real back-dolly. No runtime random placement, camera changes, global-light changes or visible floor grid. Code hover is preserved.

All four mobile title words retain the immediate uniform1s stretch to80vw, then gently breathe 100%→95%→100% over3.8s. The cosine cycle joins smoothly at full width, preserves the center and scales all glyphs/gaps uniformly from immutable source bounds. Hidden/not-ready time freezes, travel/section holds the current width/phase, physical ring wraps retain logical state and actual new selections replay the intro. Desktop is unchanged; reduced-motion/SaveData remains static.

## Verification

- Full suite **178/178** passes: utils/data, media scripts, loader and Dubplates backend tests. Scoped ESLint and diff-check clean; local production build succeeds. Existing large-chunk warning remains.
- Independent title and renderer reviews found no defect. No added dependency, React frame-state update, custom RAF or per-frame allocation. Shared shape/map caches are bounded; per-copy materials dispose normally. Actual pooled geometry survives physical copy removal. Cassette12tri, record256tri, reel1048tri; textures are opaque deterministic flat UV maps, not perspective-baked photographs. Smooth patina and pixel-footprint-averaged sub-Nyquist grooves avoid blocky patches/aliasing.
- Actual Three vertices/XYZ support and camera projection tests cover floor contact, world-size invariance across aspect/DPI/depth, near>far apparent size and vinyl:cassette ratio. Temporary browser-injected GridHelper screenshots verify Music/Mixes at the hero-derived floor; grid objects were removed/disposed and are absent from source/production.
- Native touch/mouse QA:390×728 (phone-content reference),390×844,320×640 and1440×900; rest,80/140/200ms entry frames, return and physical wrap. Captions/controls are clear. Desktop Mixes title bounds remained143px across3.8s (no mobile breathing applied).
- Allfour mobile word widths measured over complete cycles; approximately5% amplitude without drift. Reduced-motion title crop pixels remain identical over3.8s and no video is created in that preference.
- With optional decor images and all MP4s aborted, startup still opens, the recognizable poster remains and procedural analog models still render; no page errors. Normal production-preview Music/Mixes/Code each reached currentTime>2s, readyState4, with only selected source playing, muted/inline flags true. Native reverse swipe restores Music through the cyclic copy with zero page errors.
- Main screenshots and frame sequences: `output/menu-revision-qa/02-15/`. Physical phone/GPU unavailable; mobile results are Chrome touch emulation, not a claim of handset testing.

## Scope

No CMS/DB/admin/server configuration, loader/logo/fonts, selected video/poster/alpha assets, navigation camera geometry or release content changed. Historic media assets remain for cached clients. New analog textures are generated locally in the existing code path, without extra network requests or startup gates. UI/UX gates guided protected caption/control lanes; Motion/12-principles guided the user-requested deliberately slow restrained breathing cycle.

## Publication

Existing atomic deploy completed2026-10-05T19:47:25+08:00. Fresh public390×728 touch session loads the actual release; Music2.19s, Mixes2.11s and Code2.12s, readyState4, only selected source playing, zero page errors. About live title measures295→310→295px across3.8s with its center held; first/last cycle samples are both298px. Live Music/Mixes/Code/About screenshots saved in the QA directory.

Public/server exact hashes match:

- `assets/AppRoot-B-8v8Yre.js`: `59ad7016540f65a4ed562b568ee5ffe60bd454b467991a2b9f546dae0b14c528`.
- `assets/AppRoot-IUUeuyv9.css`: `11ba70e58da19d4ff777528753d8b7a639dcf857dea196fa473b8b88fd2a5eac` (unchanged).
- Public CMS GET200, SHA256 `dc2d30237a353a3caa4460531bb5aa13aaf10e217ab3bdd1c22500aefa4b7523` unchanged.

Windows and Linux builds use different JS filenames; verification uses the filename actually observed in the public browser, not a guessed local-build URL. Existing nginx duplicate-host warnings and large-chunk warning are unchanged. No unfinished required work in this revision.
