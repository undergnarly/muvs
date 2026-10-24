# 04-08 — Saved visual-style controls

Functional commit `7cfc7d5` verified live at `/var/www/muvs-releases/7cfc7d54366d`, deployed2026-10-24 20:21:50+08 through the existing atomic release/PM2/nginx process. No unrelated server changes; production dependency audit0. Existing duplicate-nginx-host and old Browserslist/large-chunk warnings remain outside scope.

## Delivered

Settings now begins with a dedicated Russian **Визуальный стиль** panel, using the existing dark/lime admin identity and native labelled controls. Four fieldsets: transition film, random orange light leaks, film dust/scratches, and continuously moving handheld camera. Independent save/status/error and draft-only restore-default action; the user refreshes an open public page after saving. No new library, renderer, generated media or persistent migration.

Canonical `siteSettings.visualEffects` defaults preserve the established film/camera appearance:

| Group | Settings / defaults | Safe ranges |
| --- | --- | --- |
| Transition | Enabled; camera duration .6s; opacity .7; exit100ms | .2–3s,0–100%,0–500ms |
| Idle light leaks | Enabled; duration1s; opacity .32; random9–15s quiet gap | .2–3s,0–100%,3–120s |
| Film dust/scratches | Enabled; duration2.4s; opacity .5; random6–7s start cadence | .2–4s,0–100%,3–120s |
| Handheld | Enabled; strength1x, speed1x | strength0–6x, speed.25–3x |

Actual 3D transition film continues to follow base camera/world motion, with configurable exit; handheld never extends it. Legacy non-3D/library gesture film keeps its1s baseline, scaled by the configured camera-duration ratio. Shared single-player priority/quiet gap means idle inserts can occur later when navigation/another insert occupies it; the panel explains this. Longer excerpts loop safely. Disabled/zero-opacity families have no warm/decode/deadlines; opacity0/fade0/strength0 are not coerced to defaults.

Camera timing is now elapsed-time based at30/60/120Hz, not a frame-count dependent .08 factor. Saved duration approximates settling across menu/vertical/horizontal moves and exact hub travel; max3s/four-item jump settles below4s, within the existing8s safety bound. Continuous handheld strength/speed change safely, with phase continuity, no accumulation or new RAF. Obsolete duplicate timing controls in the camera tuner point to Settings instead of silently changing an ignored value.

## Persistence and recovery

- Existing authenticated/origin-protected `/api/data` saves only `{key:'siteSettings',value:{visualEffects:...}}`; unrelated content is untouched. DataContext updates local state only after confirmed successful persistence, using functional patch merge.
- General Settings Save explicitly omits `visualEffects`, preventing stale form or in-flight saves from overwriting a newer effect preset.
- Initial data GET failure cannot masquerade as saved defaults: `siteSettingsReady` blocks writes and the effect panel offers reload without creating an editor over unknown settings. POST failure preserves draft and prior saved state, with retry.
- New read-only/no-store `/api/visual-effects` exposes only the already-public effect branch. Direct Dubplates does not import/fetch full CMS or Three; its optional configuration fetch has a2.5s timeout, gates only film, and falls back without blocking tracks/controls.

## Verification

- Full331/331 tests; new modules scoped ESLint clean; existing lint counts unchanged (Home12, AppRoot1, DataContext3, AdminSettings2, Dubplates0). Production build passes; inherited large-bundle warning remains. Diff whitespace check passes.
- Independent review found and root fixed the general-save race and cold-data-load risk. Schema validation, film scheduling/toggles, timing/FPS bounds, handheld scaling and admin dirty/range/order helpers covered. Real API persistence/auth/origin/restart test uses an ephemeral loopback server and separate temporary database; original releases/about/stats/admin data remain exact, unrelated site settings survive patch saves. No real credentials or production writes used.
- Browser native controls: edit and save all groups, keyboard sliders, reload retained1.2s/42%/180ms and3x/.75x; POST500 kept1.8 draft versus saved1.2, retry succeeded. Blank field and inverted intervals visibly invalid/unsavable. All four toggles round-trip; opacity0/strength0 save exactly. Restore defaults changed draft only, no POST; reload retained persisted preset. General Save omitted effects. Unrelated fixture CMS equality checked around an effects-only save.
- Initial GET500: no effect editor/save, clear reload recovery; successful reload restored prior1.8s without writes. Responsive screenshots inspected at1440,390DPR3,320DPR3 including transition, dust, handheld/save and error states: no horizontal overflow, clipped controls, illegible contrast or page errors. Save failure and unsaved status remain next to the action.
- Production-preview phone gestures with saved1.8s/.42/180ms: start visible in the accepted event at.42; motion ended after1609ms, layer off188ms later. Dust duration709ms and configured4s cadence; light leak813ms; original Music/Mixes native loops continue. Handheld3x remains continuous in idle with zero false transition events. Reduced motion/Save-Data still produce zero film requests. All families disabled: no source/film requests.
- Settled idle3x actual projected3D-caption trace:297samples/1.8s, smooth2.86px horizontal and2.41px vertical range, no false navigation pulses. Initial startup dolly was explicitly excluded from this measurement.
- Library independently uses one small settings request, zero `/api/data` or Three/AppRoot requests; configured dust duration700ms. Search21->1 works without audio playback/downloads/statistics writes. With settings delayed4s, all21tracks were usable at450ms and optional film recovered after the2.5s timeout. Desktop browser phone emulation/native touch, not a physical Xiaomi handset.

Screenshots ignored under `output/04-video-overlay/` (`admin-effects-*`, `settings-custom-transition-mobile.jpg`, `library-custom-effects.jpg`). Main visual policy preserves logo/spray priority, readable controls, hidden/prefs safety and screen-space bounded handheld; no animation-library migration.

## Production invariance baseline

Before publication, the existing server's siteName/siteDescription changed externally relative to04-07. No production settings POST was performed here; the new preset remains absent and defaults apply until the owner saves. Preserve the newer complete public CMS SHA256 `4920cf5f75cfe50a8d200072c891bdcabade26b8992bd0b22837545a72d71e80`, not the old04-07 snapshot. Catalog remains `20e5fe92600ce22d6d094a1c3c876e664f8c89f764d048caf7d6b4d4d501e410`; full sorted absolute-path assets manifest remains `c79ccdfad11557675e27cd51f8cc2eff4b81e6fee211c624ce172c7e8aced2e3`. All source and screenshot writes in `C:/Projects/Muvs`, never OneDrive.

All three hashes match after publication. Fresh live phone session: managed default.7 film starts with accepted input, completes normally, Music/Mixes actual native playback works, no page errors. Splash removal8102.8ms precedes first film request8103.4ms. Live library actual21track GET/title search works; effects-only GET200/486.5ms, no CMS request. `/api/visual-effects` returns`{visualEffects:{}}` withno-store; actual anonymous auth/session returnsfalse.

Live admin assets visually inspected with a local session-status fixture only, real public CMS/default values and no production writes; genuine authenticated save/restart was verified against the isolated real API, not falsely claimed as a production login. Public DataContext/AppRoot/AdminSettings JS and both CSS SHA256 match active server files exactly (admin JS `b3e21d9ebb55d6a639cda11369dd21774e8ad2991521affeca8d13e999964e7d`; DataContext JS `45161fffc541ff5c1dc6563526a023f4a70c146c1c7d9b085d74de78f02c41f7`). Final independent review confirms initial-load protection/general-save isolation; no blockers. No required work remains; owned QA browser/dev/preview processes closed.
