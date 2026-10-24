# 04-09 — Independent film duration complete

Functional commit `023fb56`, live `/var/www/muvs-releases/023fb5636c3b` (2026-10-25).

- Settings→Визуальный стиль→Переходы now has «Длительность анимации плёнки», 0–5 seconds; 0 retains old full-motion behavior. Positive length includes fade and never prolongs a shorter camera move. Camera timing, user presets and unrelated content unchanged.
- Separate visible-film deadline from actual navigation priority. Coalesced retargets cannot extend the deadline; idle bursts stay blocked until actual camera settlement. Late decode/expired handoff, abort, hidden/preferences and stale end IDs do not flash or leak leases.
- Independent review found/resolved P2 at `FilmLeakOverlay.jsx` / `filmLeak.js`: late JS callback could start the full fade after its budget. Absolute deadline, onset compositor hold/fade and remaining-budget clamp now prevent this overrun; final review clear.
- 341/341 full tests, focused51 and independent55 tests, scoped ESLint, build and diff checks pass. Isolated real API patch/auth/origin/restart verified; no production preset write. Native admin save/reload .5, invalid6, failed-save draft retention, 0 mode and mobile320/390+desktop1440 inspected.
- Built mobile native swipe: film visible at acceptance, hidden after509ms while camera settles after1971ms; no idle burst during the remaining move. Legacy0 mode follows1979ms camera then~100ms fade. No browser page errors. Mobile emulation, not a physical phone. Evidence in ignored `output/04-video-overlay/cap-*`.
- Public AppRoot JS SHA `d37d3f48791a1ecbd04c2720e01b3a8f7457c9deba2de022b9eeafe0c9b1c359` and shared startupDive SHA `e91aed0561a142462c6b9a07873f949d4ff28cf714e89a638a5a3022bc538a5d` match active server files; shared module includes the new field. Public CMS SHA `f2b4bb853e825f252d1d149f7ddc0f2e365cf72291a1ac147ca4d20658f30d0a` unchanged; private DB SHA `7d79bee55b295d5c59d4c003988d7c3a54ff8a76f5e3230beb83fd202c4ffbd8`, catalog `20e5fe92600ce22d6d094a1c3c876e664f8c89f764d048caf7d6b4d4d501e410` and full asset manifest `c79ccdfad11557675e27cd51f8cc2eff4b81e6fee211c624ce172c7e8aced2e3` unchanged.

User's subsequent sprite shadow task is tracked separately in 04-10. All writes C:/Projects/Muvs, never OneDrive.
