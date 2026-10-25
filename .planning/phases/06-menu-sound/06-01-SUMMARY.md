# 06-01 — Opt-in menu sound draft

## Delivered

A bottom-right native sound toggle in the main Music / Mixes / Code / About
3D hub. Sound starts only after deliberate activation. The draft contains a
quiet 24-second ambient pad with faint vinyl-like hiss, section-dependent
filter/gain, and four short air / softened metal / digital navigation cues.
Accepted navigation dispatches the cue synchronously, rather than waiting
for the new scene to settle. Exact motion IDs preserve the existing film
transition handoff and prevent stale endings from stopping a newer cue.

The control and audio are unavailable in section/player views, the expanded
navigation overlay, the loader and hidden pages. Returning to the hub may
resume an already unlocked document. Reloading never treats stored intent
as browser permission: another explicit activation is required. Dubplates,
login/admin, uploaded music and player behavior remain unchanged.

The engine is lazy, uses one AudioContext and one ambient loop, caps gains,
fades before suspension, and handles cancelled loads, interrupted contexts,
failed media, timeout, rapid toggles and unmount without late playback.
Loading can be cancelled; errors and blocked contexts offer a truthful retry.
No additional dependency, RAF, third-party runtime service or critical-path
audio preload was introduced.

## Assets and reproducibility

Five self-hosted MP3s total **223,726 bytes (about 219 KiB)**, fetched only
after opt-in. All sources have publisher-verified CC0 permissions; see
[source / processing record](../../../docs/MENU-AUDIO-ASSETS.md).
The public manifest records exact file hashes, duration, peak/RMS levels,
clipping and seam measurements. The checked-in preparation script verifies
source checksums and can regenerate or offline-verify the outputs.

The decoded pad is exactly 24 seconds at 44.1 kHz with zero clipped samples.
Its maximum loop-boundary step is 0.00141382, below the ordinary adjacent
difference RMS of 0.00444522. These objective measurements do not replace
listening approval. Runtime master gain is 0.7, pad gain 0.3, cue gains
0.34–0.4, with further section filtering and conservative hard caps.

## Verification

- Full Node suite: **465 tests, 461 pass, 4 existing documented skips,
  0 failures**. Includes 21 engine, 4 integration/control and 3 asset tests.
- Production build succeeds. New JS/JSX scoped ESLint is clean;
  HomeNewPage retains exactly the same 7 inherited findings, with zero new
  diagnostics. Independent read-only review found no release blocker.
- Real Chrome Web Audio in a fresh mobile context: zero contexts, source
  starts or audio requests before activation; one running context, five
  lazy requests and nonzero analysed PCM after a native button click.
- Native CDP touch navigation across all four items starts the correct
  bounded cue within 1 ms of the accepted navigation event. Ambient keeps
  one loop across horizontal selection, including beyond its loop length.
- Diving to `/veiled` removes the button and suspends the context; returning
  to the menu restores a single loop. Enter/Space toggle sound without
  accidentally navigating the scene; focus is visible.
- Expanded navigation and staged document visibility pause the layer.
  Reload with stored `on` creates no context, requests or playback.
- Native browser tests cover a 503 asset response/retry, delayed-load
  cancellation with zero late starts, staged blocked resume/retry, rapid
  toggles with one context, and unsupported AudioContext with an honest
  unavailable state. No page errors were recorded.
- Screenshots inspected at 320 / 390 px and 1440 px desktop. Mobile control
  is 44×44 px, clear of the central swipe hint, with safe-area positioning
  and no horizontal overflow. Desktop has a labelled pill; reduced-motion
  disables its decorative CSS transition.
- Direct `/code`, `/veiled`, `/dubplates` and `/login` have no sound control,
  menu audio requests or contexts. Production track play/download/export
  and analytics writes were not used as test traffic.

Generated evidence is in ignored `output/menu-sound-qa/`.

## Publication

Functional commits: `09927d3` (licensed assets), `be074f7` (engine),
`fdda791` (menu integration). Existing guarded deployment published
`/var/www/muvs-releases/fdda7917a1b2`; origin document/API health succeeds.
All five public MP3s return `audio/mpeg`, exact lengths and matching SHA-256;
public AppRoot JS/CSS and entry JS match the local production build.

A fresh live 390 px session confirms zero pre-opt-in audio requests or
contexts, then one running context and nonzero PCM RMS 0.00757 after the
native button click/fade-in. A Mixes swipe starts its 0.7 s cue 0.1 ms after
the accepted event. `/veiled` hides the button and suspends audio, returning
restores the control, mute suspends, and direct live Dubplates has zero
menu audio/context/control. No page errors were recorded.

Data hashes before/after deployment are identical:

- Public CMS: `2e83ee09b3606db2bec08f8215bcf2b6c2a7b2b1e9327b77fbf534de43b3b361`
- Private DB: `5114810ddaf06338dcf181dce128648ca82e4d9ee27bea69caacdd37dec2fc25`
- Dubplates catalog: `20e5fe92600ce22d6d094a1c3c876e664f8c89f764d048caf7d6b4d4d501e410`
- Dubplates analytics: `d4a5e19a97d686e1c2be2fcfcfb3afa2d9c4d85ea691e5600365f58dacef4063`

The newer externally saved CMS/DB state differs from the previous phase's
record and was preserved, not overwritten. No production data/config write
or real track test playback/download occurred. Routine guarded retention
removed only old owned build `34564aeb8301`; it can be rebuilt from Git.
No unrelated application or Nginx configuration was changed.

## Limits / handoff

No audio-capable audition input or physical phone is available here.
The browser confirms actual decoded audio output, not subjective timbre
or speaker/headphone balance. The owner should try the first draft via
the bottom-right speaker, especially on their Xiaomi and on iPhone Safari,
before approving final sound character and loudness. Safari-compatible
gesture unlocking and interrupted-state recovery are implemented and
tested, but no physical-device guarantee is asserted.

This task does not change the separate November launch gates recorded in
phase 05 (Cloudflare robots cache, content approval and off-host backup).
