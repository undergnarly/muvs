# 02-10 — Material-matched menu variety

## Delivered

Restored the previous canonical Music sound system, exact music-v3 poster, embedded fallback and single-lizard loop. Retained the newer public photo for cached clients, without using it in the current menu.

Generated three transparent material-matched cutouts with built-in imagegen: muted mossy stones from the restored sound system, antique bronze cassette from Mixes, pale marble programming braces from Code. Selected384px WebPs total98,968bytes; all four corners have zero alpha. References, exact prompts and output paths are in `02-10-ASSETS.md`. The initial new-photo Music draft was discarded.

Final user steering (“only add variety”) replaced the initial six-distinct-object idea with three simple assets and sparse randomized instances. Three small objects on mobile, four on desktop; per-session seeded position/size/roll/depth stays stable during navigation. Main images, animations, title/caption typography, menu controls, About and CMS content remain unchanged.

Scene uses optional cached transparent planes behind the main artwork. No raycast hits, startup dependency, idle float, new RAF/library, per-frame allocation, React state or DOM measurement. Only the selected logical family mounts, exact physical-copy/reveal/settle checks control display, and section/foreign transitions hide it. Reduced motion/Save Data uses static decoration; hidden time freezes. Failed optional textures remain absent, never a logo or white plane.

## Verification

-111/111 repository tests pass (frontend helpers, object runtime/cache, media preparation scripts and Dubplates backend). New helper suite covers200seeds at320/390/768/1440, safe layout, varied depth, invalid inputs, fade lifecycle, phase interruption, hidden/reduced/Save-Data behavior. Scoped new-file ESLint, `git diff --check` and production build pass. Existing bundle-size warning remains.
- Independent read-only review projected real THREE parent transforms and hub camera at320/390/768/1440 over200seeds: zero rotated-corner overflow, maximum center error<7.2e-15. No concrete defect found.
- Separate visual pass inspected all three materials at390×844,320×740 (reduced motion) and1440×900; main artwork remains dominant, props/readable silhouettes fit the side regions and do not obscure titles/captions/controls. About unchanged. Numeric320/390 viewport bounds equal the viewport, no scroll overflow.
- Normal-input functional pass: actual horizontal touch swipes, desktop next/previous controls, centerpiece tap enters Code/AI Agents, downward swipe returns, rapid alternating interruption, menu overlay open/close. Transition and settled screenshots inspected; decorative objects do not leak into the project section or the overlay. Selected Code decoder plays while Music/Mixes are paused. Reduced-motion context creates no videos.
- Off-happy-path: all decorative image requests aborted while real menu opens and works; no page errors, splash gate, logo squares or blank main artwork. Rapid interrupted switching returns to the correct material without extra decorative requests (one per family).
- Initial browser harness lacked the required ANGLE instancing capability; corrected the owned test browser to SwiftShader before signoff. Final browser page errors zero. This was a test-environment issue, no site workaround added.
- QA screenshots and `qa.json`: `C:/Projects/Muvs/output/menu-decor-qa/`. Physical handset unavailable; Chrome mobile emulation was used.

## Commits / publication

`dfa57af`: restore previous Music. `e0668e1`: generated cutouts/provenance. `d5e3876`: optional scene scatter/helper/tests.

Atomic production release `/var/www/muvs-releases/d5e38760079f` verified. All three bare public image URLs return200 and SHA256 equals the selected local assets. Fresh mobile live context renders all three correct material families after real touch navigation with one request per family and zero page errors. Settled screenshots saved as `live-{music,mixes,code}-390.png`. Public CMS SHA256 is unchanged: `dc2d30237a353a3caa4460531bb5aa13aaf10e217ab3bdd1c22500aefa4b7523`.
