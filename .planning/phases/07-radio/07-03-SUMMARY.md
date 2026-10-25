# 07-03 — Radio verified and published

## Verification

- Full suite: **487 tests, 483 pass, 4 existing skips, zero failures**.
  Production build passes locally and on Linux. New/changed isolated source,
  AppRoot and admin files lint clean. Existing Home7 / Ring9 / header-menu4
  findings are rule/message-equivalent to the baseline (only source-frame line
  numbers shifted); no added scoped finding. Diff check clean.
- Independent read-only navigation, route and final scene review: no actionable
  defect. 84 focused independent tests pass. Fixed the discovered single-stop
  sampler hazard without altering any multi-stop interpolation.
- Native phone-emulated touch cycles the five-item menu, wraps Radio↔Music and
  enters/returns Radio. Era arrows, left/right touch, body arrow keys and focused
  native-button Enter reach Roots / Y2K / New Era with truthful first/last bounds.
  Header submenu era link and reload keep the selected era/canonical URL.
- Exploratory real-timing path: deep Music view → menu → Code → Fable Labs →
  menu → Radio. No exception or diagonal lane regression. Same-Radio reentry
  retains the selection; crossing from another section uses the established
  first-item behavior. Transition and settled screenshots inspected separately.
- All three eras reviewed at390×844,320×740 and1440×900. Menu Radio and wraps
  inspected. No final-state antenna/title/object/caption/control clipping or
  horizontal overflow; 48px phone navigation targets remain inside the viewport.
  Dedicated Radio framing corrected the initial oversized/overlapping preview.
- All full Radio images blocked + reduced-motion/Save-Data: inline receiver
  remains visible and native era navigation works. WebGL disabled: honest static
  Radio fallback lists all eras/genres and reload action; no endless loader.
- Existing original Music video advances1.606→2.273seconds over650ms, while hidden
  Mixes/Code decoders stay paused. No audio/stream request or context on fresh
  Radio/menu before opt-in. Music regression naturally requests its existing
  release audio metadata; no playback/qualified listen/download was triggered.
- Current status is announced for assistive tech. Disabled Play is genuinely
  disabled; Radio never falls through to AlbumPlayer or starts a pretend stream.
  New caption field merges old CMS; no production test save.

Evidence: ignored `output/radio/`, including viewport, transition, failure,
live screenshots and verification.json. Physical handset/Safari is not claimed.

## Publication

Functional c053d8a is verified at `/var/www/muvs-releases/c053d8a11e8b`.
The existing guarded deployment fetched the separate mirror, built, validated
Nginx, atomically switched the release and replaced only exactmuvs-api. Health
passes; correct absolute runtime path and zero restarts. No legacy dirty checkout,
unrelated service, Nginx setting, CMS/settings/audio or catalog write.

Public `/radio` and each era return200 with truthful title/canonical/Coming soon
metadata. Sitemap includes Radio +three eras and still excludes Dubplates. Eight
public JS/CSS bundle SHA-256s match local build; all six generated artwork/fallback
hashes match deployed source, and all three bare public artwork URLs return200
with exact prepared bytes. An early predeployment404 was briefly CDN-cached;
waited for expiration and verified exact URLs rather than claiming a cache-busted
query proved the normal asset worked. No cache/config mutation required.

Fresh live390px native Next reaches every era, vertical return shows the Radio
hub, Radio↔Music wrap/reentry works. Zero page errors, production POSTs or station
audio requests. Main-menu sound control stays menu-only, not over station footer.

Pre/post public CMS SHA-256:
`2e83ee09b3606db2bec08f8215bcf2b6c2a7b2b1e9327b77fbf534de43b3b361`.
Private DB `5114810ddaf06338dcf181dce128648ca82e4d9ee27bea69caacdd37dec2fc25`;
Dubplates catalog `20e5fe92600ce22d6d094a1c3c876e664f8c89f764d048caf7d6b4d4d501e410`;
analytics `d4a5e19a97d686e1c2be2fcfcfb3afa2d9c4d85ea691e5600365f58dacef4063`.
All unchanged after live browser QA. Existing general-DB permission observation
is logged separately in ISSUES, not silently changed by this feature.

Guarded retention removed only old owned build28e5b2a5ab92, rebuildable from Git;
user notified. Production current/previous and all content remained intact.

## Handoff

Radio is shipped as an honest visual preview, not a broadcasting service.
Future work requires actual stream endpoints and an explicitly scoped playback/
stream-management implementation. No scheduler, stream admin editor or backend
service is implied by the null streamUrl field. Existing November owner launch
gates remain unchanged. Built-in imagegen provenance/prompts in docs/RADIO-ASSETS.
All project writes C:/Projects/Muvs, never OneDrive.
