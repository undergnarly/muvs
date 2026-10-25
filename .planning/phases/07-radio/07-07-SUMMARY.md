# 07-07 — Complete, section-wide Radio shadows

## Delivered

Commit `c2e78ea`. Admin → Radio now defaults to **Весь раздел Radio — меню и
станции**, with optional menu / Roots / Y2K / New Era exceptions. Every profile
can control enabled, opacity, direction, length, blur, X and closer/farther.
Radio-only limits: length0.1–6×, X±6 scene units, depth±5 opaque-object heights;
positive depth is farther. Global/non-Radio limits and all camera/art geometry
remain unchanged. Both SpriteShadow normalizations honor the scoped limits.

The reported discrepancy was reproduced from the current owner's data: only
menu.custom=true,length3,X.01,depth1 was saved; the eras correctly inherited
global length2.25/depth.42. This was not a missing slug. For old menu-only data,
a lightweight pure helper virtually promotes that profile to the common Radio
basis and makes menu inherit. Existing independent eras block promotion. No
production write occurs on GET, startup or deployment; persistence waits for
the owner's explicit save. An explicit all.custom=false marker distinguishes
new intentional menu-only presets. Sparse style fields inherit global→Radio→
receiver without injected defaults. The client confirmation merge preserves
this migration and newer unsubmitted targets when acknowledgements reorder.

Native controls reuse the existing admin form, linked validation and keyboard
focus. First custom enable captures the current inherited appearance; target
switches retain drafts, cancel restores saved data, disabled custom restores
inheritance. Exceptions are listed. Saves patch only changed targets, retain
drafts on failure, require confirmed success and retain the existing20s abort
deadline. Failed initial data reads still block unsafe saves. Public pages
should be refreshed after saving. No dependencies, new draw calls or RAF added.

## Verification

- Full529tests:525pass,4existing skips,0fail. Production build and diff check
  pass; scoped ESLint clean, inherited Home7/Ring9/DataContext1 unchanged.
- Independent58focused tests/review: schema/inheritance, migration/no-mutation,
  actual isolated authenticated API persistence/restart, origin/auth/atomic
  rejection, concurrent targets and renderer limit propagation; no blockers.
- Real mobile browser controls on a copy of current owner data: all eight
  fields, typed common→Roots inheritance,500/retry, changed-target-only save,
  reload, New Era override, exception summary, invalid-target focus, cancel and
  restore inheritance. No production save or qualified play/download.
- Common visible shadow preset applied to all eras; common enabled=false
  visibly removes all three casts. Native return to main menu also verified.
  New frontal art07-08 tested jointly.320/390/1440 initial/fields/actions fit;
  no horizontal clipping, persistent feedback and number/range labels intact.
 320px failed-full-image + reduced-motion retains matching inline artwork.
- Screenshots and JSON: ignored `output/radio-modern-v2/`. CDP viewport capture
  avoids an unrelated external Google-font request occasionally delaying
  Playwright's screenshot font readiness. No font-source changes made here.
  Physical handset QA and blanket security/launch approval are not claimed.

## Publication / preservation

Combined07-07+07-08 release `d6458f380198` published through the existing guarded
immutable Linux build/atomic switch. API online/restarts0/exact release path;
origin health and Nginx configuration pass. Server dependency audit0; inherited
frontend audit debt remains unchanged and is not a whole-site security signoff.
Eight public JS/CSS files exactly match local build hashes; all three public
WebP200/hashes and three server inline source hashes match the final assets.
Fresh live390px Roots→Y2K→New Era via native buttons and touch return to Radio
menu inspected, with zero page errors/attempted writes. Anonymous admin redirects
to login. No production test saves, analytics plays/downloads or migration write.

Current owner-updated data stayed byte-identical before/after live browser QA:

- PublicCMS `904de59ea18ffa934130362ffc146459f325fc17ded07613f586ad010bb04eba`.
- PrivateDB `8997e37e13e0eabd90aea8dade293581ef3a24d0e581aaed7c95f233d03dc38f`.
- Catalog `20e5fe92600ce22d6d094a1c3c876e664f8c89f764d048caf7d6b4d4d501e410`.
- Analytics `d4a5e19a97d686e1c2be2fcfcfb3afa2d9c4d85ea691e5600365f58dacef4063`.

Guarded retention removed only old owned releasec7e9934e4bba; the earlier07-06
cleanup removed e942d2b232a2. Both rebuildable from Git; owner notified together.
No owner files/data or unrelated services removed. Owned browser/preview cleaned
up after final checks. No required work remains in07-07; prior launch gates stay.
