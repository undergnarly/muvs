# 02-16 — Priority loader and coordinated entrance

Completed2026-10-05. All edits C:/Projects/Muvs, never OneDrive.

## Delivered

- Replaced alpha gradientstop #8f8f8fc2 with the site's opaque gradient. Drawing completion, paint flush and full-stamp dwell precede any background blending. Screenshot iteration rejected sliding the whole white background because it created a hard horizontal seam; stationary matching gradients now blend only after spray completion, while tag/spray move upward and camera descends/out on the same1.35s smootherstep clock. Final camera poses unchanged. Inputs/inert remain guarded until settled; hidden time freezes, reduced/SaveData use final pose from first render.
- Both exact supplied inline bitmap assets decode before first intro frame/heavy lazy imports. Y2K logo45,552B/hash unchanged, lime spray unchanged. Logo fades for1s from first RAF origin; spray starts afterward and follows real progress without restarting the first second on late/cached React. HTML first-paint promise defers hero preloads and heavy scene mount. Google and Vite bootstrap styles are preload/asstyle, activated onload, not blocking loader rendering. Inline html fallback does not override legacy body themes. Failed-bundle18s Reload and hidden initial-tab recovery retained.
- Main and all existing secondary3D/direct release routes wait actual rendered cover/TV/About body rather than blind500ms. Common error boundary/static recovery covers deep route failure. Lightweight Dubplates uses the shared visual completion without loading3D/CMS.
- User follow-ups: original cubic edge-weighted mobile title warp restored, milder74vw target and slower1.5s, retaining3.8s/5% breathing, desktop/preferences/wrap behavior. Decorations have no separate settled wait/.2s delay/.28s fade: prepared sprites and local analog meshes are visible with hero on first reveal/selection frame. Shared cache warms5rocks+1braces once,3500ms cap and permanently ignores late failed requests; travel fade/Code hover/physical placement preserved.

## Verification

-195/195 full Node tests pass; changed-file ESLint no new errors, AppRoot trackVisit dependency warning predates revision. Production build passes; existing large chunk and server Browserslist/nginx duplicate-hostname warnings unchanged. Independent loader review79/79 targeted tests and camera/title/decoration reviews.
- Real-browser Chrome emulation320×640,390×728,1440×900; native touch allfour menu titles; visible paint/entrance frame screenshots and final composition inspected. Actual hidden/resume frozen sharedtransform/opacity, input shield, missing video media, reduced-motion, invalid release redirect, no-WebGL direct Code fallback, direct Veiled/Mixes/Code/About/News/CV and Dubplates passed. Physical handset not available.
- With app bundle blocked and Google fonts delayed, production logo firstcontentfulpaint32–36ms locally; at434ms logo opacity.68, spray still fully masked, background1; at1498ms logo1 and first12%spray drawn. Actual18s Reload then recovery passed. These are local first-feedback measurements, not guaranteed whole-site load-time savings.
- Real first departure Music frame: all5rock textures mapped, prop visibilitytrue/materialopacity1, cameraY4.79997; they remain visible through finalY2.6. Mixes6props visible100ms after native selection, before camera settling. No secondary fade/pop. Final title screenshots confirm centered strongeredgewarp and unchanged readable caption/control lanes.
- Fresh public mobile session has zero pageerrors and opaque plane through all pre-departure frames; first departure computedpaint inset0% and opacity1, final input inertfalse. One cold live run completed entrance around19s under the test browser/network; firstfeedback still appeared while scene downloaded. No claim of4–5s guaranteed total loading improvement. All3live videos readyState4, selected-only sustained playback; Music3.06s, Mixes3.12s and Code5.92s observed. CMS GET200 remains byte-identical.

Evidence screenshots: ignored output/menu-revision-qa/02-16 (first-logo/fade/spray, entrance frame series,4titles,320/1440/reduced/Dubplates, deep routes, hidden/resume, live3video sections). One initial live instrumentation attempt read an unparsed child and threw its own getComputedStyle error; corrected recorder/fresh live session confirmed zero application errors.

## Commits and production

Functional9d4abf0(camera), cb99813(titles), f0e50b4(decor), e1d7183(loader/integration), a862eef(asset decode). Verified live release /var/www/muvs-releases/a862eef77079 via existing deployment; no server config, admin data or external content writes.

Public/server SHA256 match:

- AppRoot-yYn_KM1O.js:1cd9c66a17edd8ae0b80891a78159cde78c1c8f586d963015128fcc4b2fc5a93
- startupDive-D-Oo2XuI.js:5c194145884abc121722d21c19dc1b6d4f7fdd353cf76884eb724ccbeb2e0072
- index-B3FDyG5z.js:76e69c9704406c49bdb457bf2bb7cdb1e87dd8631254803e5ed502c633add0d4
- AppRoot-IUUeuyv9.css:11ba70e58da19d4ff777528753d8b7a639dcf857dea196fa473b8b88fd2a5eac
- CMS:dc2d30237a353a3caa4460531bb5aa13aaf10e217ab3bdd1c22500aefa4b7523

No unfinished required work in this revision. Performance optimization of the existing2.2MB scene chunk remains a separate scope from priority initial loading feedback.
