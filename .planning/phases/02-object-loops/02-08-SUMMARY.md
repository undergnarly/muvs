# 02-08 — Lime loading stamp and mobile title stretch

## Delivered

- Replaced the white loading line with a hand-cut, two-pass acid-lime (#CCFF00) marker trace. Horizontal clipping reveals the texture from left to right without squeezing it. The original MUVS logo is rendered black above the paint; its optimized lossless alpha is embedded in HTML, so it is visible before the application bundle or other asset requests.
- Monotonic CSS/ARIA progress preserves the existing 25/65/90/100 readiness stages and the small initial 12% mark. Invalid and late progress reports cannot corrupt or regress the display. No extra minimum loading duration or animation-completion gate was added. Existing early-bundle recovery / Reload and scene recovery remain intact.
- MUSIC, MIXES, CODE and ABOUT keep their existing appearance, then on mobile widen to about 80% of the viewport after a 220ms pause over 1.6s. A symmetric cubic displacement leaves the center close to its original shape and increases widening towards the edges. Only glyph x bounds change; font, baseline, height, camera, captions, art and desktop metrics are unchanged.
- One shared logical-selection timeline serves the ring copies. Switching items resets it; hidden time freezes; reduced motion and Save-Data use the final static shape. Geometry buffers are privately copied, updated only when needed, and have expanded culling bounds. No new animation library, RAF loop or per-frame React state was added.

## Verification

- 98/98 frontend/data/hook/script Node tests pass, including 8 progress tests, 4 inline-document/recovery tests and 6 title math/lifecycle tests. Scoped ESLint is clean, diff whitespace check passes and the final local production build succeeds. Existing RingMenu fast-refresh lint findings are unchanged. Independent motion/runtime review found no blockers.
- Real Chrome production-preview checks: inline partial/full paint, 320px and 390px mobile, 1440px desktop, reduced-motion transitions, real 18s application-bundle failure / Reload recovery, cold startup, all four touch-selected titles and interruption by rapid swipes. No page errors. Physical handset / iPhone was not tested.
- Local final 390px headings measure 311/311/312/311px wide (MUSIC/MIXES/CODE/ABOUT), with identical 50px raster height and y=233px. Reduced-motion 320px headings fit; desktop stays in its original form.
- Fresh live browser checks repeat all four touch selections and measured widths above, without page errors. A controlled 1.2s entry-script network delay exposes the loader: 12% at 648ms, 65% at 2948ms, 90% at 3331ms, 100% at 3428ms, removed at 4030ms. This is a network-delayed QA run, not a speed claim. The real #splash-screen selector is used in the saved live trace; earlier exploratory instrumentation using #splash is not evidence.
- Evidence: C:/Projects/Muvs/output/splash-paint-qa/. paint-complete-390.png is a staged 100% graphic preview; live-cold-390.png and live-title-{music,mixes,code,about}-390.png are actual live captures. live-cold-trace.json and live-title-measurements-390.json record the final verified measurements.

## Publication and scope

Functional commits: 58baa90 (loader) and 429a7cb (mobile headings). Pushed to main and published by the existing locked, atomic cron deployment. Verified live release: /var/www/muvs-releases/429a7cb530d9.

Public AppRoot-DqUZrPck.js SHA256 matches the server artifact: 3c2378dbdf42c1275fc65124392a8ccaf2517f421c99a0c6204389ee610d2eaf. Public index.html SHA256 matches the release: 19e27b92dd74d71c148ce622313ff3ca04c632d11f1bb26ec324a90e55c69abc. HTML contains the new stamp and no old splash-bar.

Public CMS SHA256 is unchanged: dc2d30237a353a3caa4460531bb5aa13aaf10e217ab3bdd1c22500aefa4b7523. No DB/CMS, covers, media, unrelated services or nginx configuration were changed. Existing dependency-audit / chunk-size and nginx duplicate-host warnings remain outside this revision. Work and evidence are outside OneDrive.
