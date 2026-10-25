# 07-05 — Radio shadow controls and restored legacy cast

## Delivered

User override supersedes 07-04 contact bridging: original single-quad cast is
restored, with `src/utils/spriteShadow.js` byte-identical to c7e9934's parent.
Removed camera-derived foot/contact geometry and obsolete tests. Keep 3935bf2
`ArtworkMaterial fog={false}` so distant images/video retain actual textures.

Admin → Radio (`/admin/radio`) now selects main-menu receiver, Roots, Y2K or
New Era. Enable own length/position, adjust length0.1–3×, X−3–3 scene units and
depth−1–1 opaque-height units. Positive X is screen-right; positive depth is
farther behind the receiver. Only shadow moves; object/floor/camera stay fixed.
Profiles default to exact global inheritance. First enable starts from current
global length/depth without a jump. Direction/blur/opacity/enabled remain global.

Native Russian numeric/range controls, receiver thumbnail, field-linked errors,
invalid-target focus, visible keyboard focus, all-target retained drafts,
cancel/inheritance and confirmed dirty-target-only saves reuse existing admin
styling. Refresh public page after saving. Failed initial reads block writes;
failed/unconfirmed/timed-out saves retain drafts and allow retry. Settings saves
have a20s abort/deadline including JSON body; late success never commits state.

Strict shared numeric/key validation, authenticated same-origin API and nested
merge preserve other receivers and unrelated settings. Confirmed client merges
handle reordered different-target acknowledgements. General settings omit this
managed branch; camera tuner now sends narrow configuration patches rather than
stale full settings. No new deps, extra draw/RAF/media/readback or CMS write.

Runtime commit7a0f5f8; admin/persistence commit4af5d96. Receiver redesign paused
pending user clarification; no image generation/replacement in this revision.

## Verification

- Full511tests:507pass,4existing skips,0fail; build and diff check pass.
  New/modified isolated files lint clean; inherited Home7/Ring9/DataContext1
  findings unchanged. Independent43focused tests/review: no remaining blocker.
- Actual isolated API verifies auth/origin, invalid patch atomic rejection,
  interleaved targets, unrelated content/effects invariance and restart storage.
- Native mobile form: four selections, no-jump initialization, retained drafts,
  two-target patch, HTTPfailure/retry, save/reload, cross-target invalid focus,
  cancel, inheritance, keyboard range, initial-read-failure/reload. Actual
  stalled browser request recovers at20307ms and retries without losing draft.
- Screenshots inspected at320/390/1440: no horizontal clipping, coherent native
  controls/status. Admin is intentionally scrollable. Public default three eras
  restore legacy appearance; custom lengths and both signs move only shadows;
  native era arrows and menu return/reentry work.320px blocked full image plus
  reduced motion retains inline receiver/floor. No page errors or public writes.
- Evidence: ignored `output/radio-shadow-admin/verification.json` and captures.
  No physical handset test or subjective shadow preset approval claimed.

## Publication

4af5d96 verified live at `/var/www/muvs-releases/4af5d96791b7`: guarded Linux
build/Nginx/atomic switch, API online/restarts0/exact path and origin health pass.
Eight public JS/CSS byte hashes match local build. Fresh live390px all three
eras captured; Roots/New Era visually inspected, anonymous admin redirects to
login. Zero live page errors, attempted writes, qualified plays or downloads.

PublicCMS hash unchanged:
`2e83ee09b3606db2bec08f8215bcf2b6c2a7b2b1e9327b77fbf534de43b3b361`.
PrivateDB `5114810ddaf06338dcf181dce128648ca82e4d9ee27bea69caacdd37dec2fc25`;
catalog `20e5fe92600ce22d6d094a1c3c876e664f8c89f764d048caf7d6b4d4d501e410`;
analytics `d4a5e19a97d686e1c2be2fcfcfb3afa2d9c4d85ea691e5600365f58dacef4063`.
All exact before/after live browser QA. Existing images/videos/owner presets and
unrelated services untouched. Existing frontend dependency audit debt unchanged;
production server dependency audit0, no whole-site security claim.

Guarded retention removed only old owned buildd13483fcbb2c, recoverable from Git;
user notified. Owned local browser and preview sessions cleaned up. No
required shadow-control work remains; earlier owner launch gates unchanged.
