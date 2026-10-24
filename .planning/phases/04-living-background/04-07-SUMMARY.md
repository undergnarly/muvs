# 04-07 — Centred navigation, synchronous film and continuous handheld

## Implementation

Functional commit `b496b57`. User clarification: handheld is continuous in idle/static shots, not a swipe-only effect. No content, CMS, audio, analytics, dependencies or server configuration changes.

- Camera lane is independent of selected carousel index. Move the section root instead, preserving exact authored projection and orientation. Freeze the current lane on accepted entry/return, rebase only the hidden menu, and silently reset item offset only when changing sections. Same-section reentry retains the selected project. Tests cover first/fractional/last selections, authored off-axis floor poses, interrupted input, direct routes and 56-unit wrapping.
- Accepted navigation dispatches synchronously from input handlers, rather than a later React state effect. A single managed film lease survives retargets; stale end events cannot stop a new move. The base camera AND structural world origin determine settling, before handheld is added. Three stable samples and a 64ms minimum prevent premature endings; an 8s watchdog bounds failures.
- Orange transition maximum opacity increases from .5 to .7. The layer shows immediately using a tiny inline frame while the muted native video prepares in parallel; preparation is fenced by the motion signal/token and a 500ms budget. Motion completion cancels preparation and triggers a 100ms opacity exit. Late decode cannot start an after-transition flash. Idle dust/light timings remain unchanged.
- Handheld uses the existing R3F frame loop, no extra RAF or React updates. Smooth multi-frequency local position plus tiny pitch/yaw/roll, bounded in screen space (~0.808 CSS px worst measured centre displacement). It continues in stationary shots, does not accumulate drift, pauses for hidden/reduced-motion/Save-Data/loading, and eases back over .85s. It cannot keep transition film alive.

## Asset provenance

No new generated or third-party media. Four 192x108 WebP snapshots from existing user-supplied `film-leak-[a-d]-v1.mp4` at .25s, FFmpeg/libwebp quality72, are inlined in `src/data/filmLeakPosters.js`. Decoded bytes: a100, b1280, c1052, d890 (3322 total; 4528 data-URI characters). Only the existing four small native clips are cache-warmed, after the priority splash has gone. Warm response bodies are fully consumed and requests abort on pause/cleanup. Original MP4s are unchanged.

## Verification

- Full suite 304/304; scoped new/modified modules ESLint clean; HomeNewPage retains its 12 pre-existing findings, no new findings. Production build succeeds; existing large-chunk warning remains. `git diff --check` passes.
- Independent read-only strict-lane/managed-lifecycle review: no blockers; 44 focused tests pass. Resolved motion issues are at `HomeNewPage.jsx:934/1036` (base settling before additive handheld), `centeredSectionCamera.js:11` (root compensation), `HomeNewPage.jsx:1026` (hidden rebase), and `FilmLeakOverlay.jsx:141` (100ms exit). Existing cinematic navigation duration is intentional user direction, not replaced with generic short UI timings.
- Fresh mobile390x844 DPR3: managed start visible in the same event at opacity .7; DOM active mutation ~.9ms later. 55ms screenshot shows orange overlay while the scene is moving. Completion to layer-off 109.3ms. Native video is playing by230ms on warmed media. All four warm responses complete with their full bodies.
- Artificial1300ms film delay: immediate underlay still appears; motion ends at4594.3ms, layer off4703.4ms. After another1700ms video remains paused/hidden, no late flash.
- Idle1.8s actual-camera trace:294 samples, small changing position/quaternion, zero false managed navigation events. Unit tests independently verify continuity, amplitude, no drift, hidden/resume and preference resets.
- Production preview native mobile gestures: Websites/index1 and final Fable Labs return/reentry preserve selection; rapid horizontal-to-entry-to-return and circular menu journey pass. Screenshots inspected at320x740,390x844 and1440x900; no overflow at320 and no page errors. Original selected-only Music/Mixes/Code clips actually play; hidden pauses all and releases film source, visible resumes correctly.
- Reduced motion and Save-Data: zero film requests/source, still mode. Dubplates remains non-Three;21 tracks and title search21->1->21 work, without audio playback, download or analytics test writes.
- Browser is desktop Chromium with real touch dispatch and phone emulation, not a physical Xiaomi handset. An inconsistent long-lived dev/HMR renderer was not used as production evidence; final visual QA used the built production preview.

Screenshots are ignored under `output/04-video-overlay/`, including onset55ms,320px home, desktop Code, Websites return/reentry, Fable reentry, rapid return and library.

## Publication

Functional commit `b496b57` verified live at `/var/www/muvs-releases/b496b57ac46a`, deployed2026-10-24 20:02:25+08. Existing immutable atomic release/PM2/nginx workflow; no changes to the dirty deployment checkout or unrelated server applications. Server production audit remains0; inherited duplicate-nginx-host warnings remain outside scope.

Fresh live390px session: Music/Mixes native loops play, managed swipe immediately visible at .7, no page errors. Priority splash removed at8734.9ms and first film request8735.6ms, so no film steals loader priority. Real Websites selection/return/reentry preserves Websites and immediate managed film. Live library uses its actual GET API,21tracks and working21->1 title search, no downloads/audio/statistics writes. Public AppRoot JS/CSS and shared startupDive JS/CSS SHA256 all exactly match active server files (AppRoot JS `aa66cebe77eaa5b30afc47610aa9af13040ab42a7f5daeac4ccfe468c26cd617`, shared JS `b2a71106075664abff410087d3f6fdf3d0d2f2813ac172e545ad6a180ebd963e`).

Read-only persistent invariance checks during and after deployment: public CMS SHA256 `dc2d30237a353a3caa4460531bb5aa13aaf10e217ab3bdd1c22500aefa4b7523`; catalog `20e5fe92600ce22d6d094a1c3c876e664f8c89f764d048caf7d6b4d4d501e410`; full sorted absolute-path assets manifest `c79ccdfad11557675e27cd51f8cc2eff4b81e6fee211c624ce172c7e8aced2e3`, all unchanged. All work in `C:/Projects/Muvs`, never OneDrive.
