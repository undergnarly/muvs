# 07-04 — Shadow contact and texture retention

## User correction / delivered scope

The user explicitly accepts the stretched shadow: do not shorten it or change
its style. Fix the gap at the receiver's base. Additional request: receding
3D objects must retain their textures instead of becoming white silhouettes.

Root cause of the gap: saved global depthOffset .42 translates the cast about
one world unit away from Radio's image plane; its generated three-quarter bases
also slope (left/right feet differ48–91 original pixels). Transparent image
padding and cast length/blur are not the cause.

Radio-only opt-in cached foot profiles now add a flat contact bridge from the
visible per-column base to the *unchanged* original long cast. A ray from the
authored object camera intersects the same ground plane, so both feet remain
attached in screen projection rather than guessing a global offset. Near contact
uses solid occlusion and blends into the original mask. The original first four
positions/UVs/six indices, length, direction, blur, opacity and signed depth shift
are preserved. No cancelling the owner depth slider, moving artwork or CMS edit.

Same one declarative mesh/material; <=256² readback cached per image/mode/channel/
orientation, memoized geometry, no new texture/RAF/per-frame scan/draw call.
Old objects don't opt in and their geometry remains byte-identical. Radio menu
contact uses its own authored camera and responds to desktop/mobile resize;
each section card uses its existing first camera preset in Billboard-local space.

Whitening was Three's default fog=true on the shared meshBasicMaterial: the
scene's white fog replaces texture RGB as distance increases. ArtworkMaterial
now alone has fog=false (3935bf2). Poster/video/alpha/upload/init/loading behavior,
world fog, shadows, camera timing and visibility remain unchanged. Object art
keeps its texture until the established scene visibility hides it; no new fade.
Contact runtime/tests commit: c7e9934.

## Verification

- Full501tests:497pass,4existing skips,0fail. Build passes. New/modified isolated
  files ESLint clean; Home7 and Ring9 findings are rule/message-equivalent to
  baseline, none added. Diff check clean.
-14focused material/contact tests pass; full shadow/material subset27pass.
  Actual Three projection confirms <.015px difference at320/390/1440, including
  the translated/Yπ scene root. Original cast/defaults/admin extremes unchanged.
- Per-column profile honors alpha vs green vs raw orientation/normalized masks,
  stable caching, bounded readback and taint/invalid/empty/disabled/opacity0 paths.
- Independent read-only source/math/performance review found no blocker; two
  shadow suites23tests passed at review (one later scope assertion added).
- Mobile390×724 reproduces the supplied phone screenshot aspect: Roots, Y2K
  and New Era checked separately, both sides attached with the original long
  cast still present. All three also captured at320×740 and1440×900.
- Native horizontal arrows, menu return/reentry and actual deep Music stop
  navigation work. A local-only slow3s/no-film diagnostic captures receding
  Music still brown/green at the formerly fog-white distance, then confirms
  normal section hiding/centred return. Production timing/presets unchanged.
- Full Radio images blocked + reduced motion: inline art/contact still renders,
  native era navigation works. No blank/white object; no production test save,
  qualified play or download. Original fixture restored after diagnostics.

Evidence: ignored output/radio-shadow-contact/. No physical handset is claimed.

## Publication

Functional c7e9934 is verified live at
`/var/www/muvs-releases/c7e9934e4bba`. Guarded Linux build, Nginx validation,
atomic symlink/exact-API replacement and origin health pass. Eight public
JS/CSS hashes match the local production build, including the shared material
and contact shaders. No original image/video asset or general CMS changed.

Fresh live390×724 Roots → Y2K → New Era and native menu return inspected.
Native Radio → Music → enter captures the distant sound system retaining its
brown/green texture at the former whitening point. Zero page errors or blocked
production POSTs. Coming soon/player/menu behavior remains unchanged.

Public CMS SHA256 before/after:
`2e83ee09b3606db2bec08f8215bcf2b6c2a7b2b1e9327b77fbf534de43b3b361`.
Private DB `5114810ddaf06338dcf181dce128648ca82e4d9ee27bea69caacdd37dec2fc25`;
Dubplates catalog `20e5fe92600ce22d6d094a1c3c876e664f8c89f764d048caf7d6b4d4d501e410`;
analytics `d4a5e19a97d686e1c2be2fcfcfb3afa2d9c4d85ea691e5600365f58dacef4063`.
All remain exactly unchanged after live browser QA. No production test save,
play/download or unrelated app/config change.

Guarded retention removed only old owned build297228b12524, rebuildable from Git;
user notified. Owned local browser/preview sessions cleaned up. No required
work remains in this revision; physical handset validation not claimed.
