# 02-17 — Occasional loading mesh

## Implemented

Decorative inline CSS grid behind the unchanged Y2K logo/lime aerosol in the opaque loading plane. First appearance is1.75–3seconds after the inline assets paint, so it does not compete with their intro. One-second opacity-only ease-out/ease-in pulse, then a randomized8–13second quiet gap (at least9seconds start-to-start). No new media, dependencies, controls, blocking requests or additional minimum loading wait.

Single timer, no frame polling. Hidden tabs clear an active pulse and wait a fresh safe gap on return; pending waits preserve visible time. Departure/error are immediately CSS-suppressed, and a narrowly scoped observer cleans timers/listeners on departure/failure/hidden/removal. Page exit and a later reduced-motion preference also clean up. Initial reduced motion/SaveData skip the effect entirely. Shared generated Dubplates HTML inherits the same loader.

Functional commit: `6ae6512`.

## Verification

-203/203 tests pass, including8 new tests of the actual inline runtime: firstpaint, randomized minimum cadence, active/pending cleanup, hidden resume, preferences, missing overlay and page exit. Scoped ESLint and production build pass; inherited large-chunk warning unchanged.
- Independent read-only motion/lifecycle review: no blocking findings. Staging/layering and opacity-only performance validated; user-requested ambient1second pulse is not an interactive response delay.
- Browser screenshots inspected at320×640,390×728 and1440×900, pulse and off states. No overflow/clipping, stamp remains focal, grid pointerEvents none, loading plane opacity1. Evidence in ignored `output/menu-revision-qa/02-17/`.
- Held application bundle: two real browser pulse starts2801.2ms and12067.8ms,9266.6ms apart.18second connection error suppresses the grid and exposes working Reload. Real Reload removes the overlay and restores a rendered menu with root.inert false, zero page errors.
- Controlled browser visibility staging: active pulse cleared, no new pulse during hidden wait/first7900ms after resume; next start at14138.9ms after first2817.5ms. Actual browser media preference change during that pulse clears it and hides the grid. Initial reduced-motion session records no pulse.
- Fresh local normal startup and actual Menu/MIXES clicks pass with no page errors; no grid persists over the scene. Physical handset unavailable, mobile checks are Chrome emulation.

## Production

Verified atomic release `/var/www/muvs-releases/6ae6512d13fe` (deploy log22:27:18+08:00). Public home and Dubplates contain the new grid; exact normalized inline runtime matches source SHA256 `74a4a7152c49e37a216835286c39ca97b26c98330ae98e0509bbd0752aa65d52`. Dubplates noindex preserved. Public CMS SHA256 `dc2d30237a353a3caa4460531bb5aa13aaf10e217ab3bdd1c22500aefa4b7523` unchanged.

Fresh live390×728 session: real pulse at3733.8ms, plane opacity1, grid opacity.833 screenshot inspected. Releasing the briefly held AppRoot request completes normal rendered scene entry, removes the grid/splash, restores root.inert false and leaves zero page errors/overflow. Actual Menu/CODE clicks reveal the expected project submenu, with no grid reappearing. Existing server Browserslist and duplicate nginx hostname warnings remain outside scope.

All work in C:/Projects/Muvs; no OneDrive, CMS, admin data or server configuration writes. This is a loader visual effect, not a whole-site performance optimization or a mesh over the finished3D scene.
