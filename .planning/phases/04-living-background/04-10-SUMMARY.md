# 04-10 — Configurable ground shadows complete

Functional `5889c5a`, verified live `/var/www/muvs-releases/5889c5a82686` on 2026-10-25.

## Delivered

- Primary menu and section sprites cast their existing static RGBA/green-sidecar silhouette onto horizontal world-space geometry. Gray/sharp/strong contact becomes progressively softer and more transparent with distance. Same artwork parent preserves perspective, section motion and 56-unit wrapping; no screen-attached effect or picking interception.
- Opaque alpha-foot anchoring avoids transparent image-box padding. Music/Mixes reuse the approved small-prop ground, rather than the unrelated global Y0 that would detach the shadow. Artwork, camera, captions and content have not moved.
- Small rocks/cassettes/vinyl/reels reuse their existing two contact quads as anchored core plus directional soft cast; true posed model height or measured rolled sprite support sets length. Flat vinyl remains very close to the ground. Global disable/zero opacity removes all ground shadows; floating Code details have none.
- Settings→Визуальный стиль→Тени объектов: enabled, native direction presets, precise0–360° angle, length.1–3×height, blur0–100%, opacity0–100%. Direction0=back,90=right,180=front,270=left in object-local coordinates. Shipped restrained defaults143°/.55×/50%blur/26%opacity; user's saved settings always win. Existing independent film-cap field preserved.
- One extra two-triangle quad per visible primary sprite, fixed nine-tap shader, cached at-most256px CPU mask analysis once per image/channel/orientation. No new media request, shadow-map pass, canvas renderer, decoder or RAF. Borrowed textures are never disposed; declarative geometry/material lifecycle, safe CORS/readback fallback, correct alpha vs green-mask sampling, fog/depth handling.

## Verification

- 362/362 full tests; independently reviewed primary12 and related small-prop48/58 tests, scoped ESLint clean. Existing Home10errors/2warnings and Ring8errors unchanged, no new lint findings. Build/diff checks pass. Real isolated server API patch persistence/auth/origin/restart includes the new group without touching other data.
- Native admin preset/exact143.25/non-rounded custom angle, invalid361+disabled Save, keyboard sliders with focused page, failed-save draft retention, retry, reload and toggle verified. Mobile320/390 and desktop1440 fieldsets inspected without overflow. No production test settings/audio/analytics writes.
- Built mobile all four heroes, AI Agents/Websites, horizontal navigation, section entry and floor dive; back/front and exact90° side casts, static reduced-motion320, disabled all-shadows zero count, desktop, and Dubplates21-track/no3D-entry regression inspected. Existing Music video plays; live CDP confirms Mixes repeated playback loops and Music pauses on selection change. No page errors or non-runnable GPU shader programs. Physical phone not available; mobile emulation is not a handset test. Ignored evidence `output/04-video-overlay/shadow-*`.
- Resolved motion/visual P2 at `spriteShadow.js:103`: rotating the flattened baseline caused a detached strip. The corrected shear preserves every alpha-foot-row pixel at the original X/Z baseline at all eight headings, with explicit generated-geometry regression tests. Independent final visual/math/GPU reviews clear. A small .15 side-cast thickness prevents90°/270° collapse; this is a lightweight imitation, not inter-object physical light occlusion.
- Public/server asset hashes match: AppRoot `64344def5fe0b4bb597c8e0fb1739f1d6c7cde139681b7d9899c04b5fc1aa06b`; shared startupDive `a136b92625f6001a09439a2e63d26936b2507734b298f761c3c24bccd4e2d99e`; admin JS `01ead26cee1aa4f4f3cfe4d05fcaa561bdd8bab5e1e27638fd4683e3bb1a7f11`, admin CSS `5861087e98c240c60798613279cb0709c6e1d52a2f2e1b4143b4bfd0f7f7ea0f`.

## Data preservation

CMS/private DB were unchanged at initial cutover. During final read-only browser verification an external admin save added exactly `transition.effectDurationSeconds=0` and shadows `{enabled:true,opacity:.26,directionDegrees:180,length:2.25,blur:.5}`; these latest settings were preserved, never restored to test/default values. All other public CMS fields compare equal to the predeploy snapshot. Final public CMS SHA `ace169f237157902811898147a5a69773e89f902447ddae81ab9d4d29fbff5ac`, private DB SHA `09eaa5588a825324234b552b5dc51e678ebd8c91ab8a6520422ee1ffd958a191`.

Catalog SHA `20e5fe92600ce22d6d094a1c3c876e664f8c89f764d048caf7d6b4d4d501e410` and complete original/preview asset manifest SHA `c79ccdfad11557675e27cd51f8cc2eff4b81e6fee211c624ce172c7e8aced2e3` unchanged. Existing large-bundle/Browserslist/nginx duplicate-host warnings remain separately tracked. All project writes C:/Projects/Muvs, never OneDrive. No required task work remains.
