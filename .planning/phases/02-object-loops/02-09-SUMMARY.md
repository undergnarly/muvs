# 02-09 — Updated Music photo

## Delivered

The user's supplied sound-system JPG replaces Music's previous artwork. Built-in imagegen prepared the transparent cutout; the user explicitly permitted transparent-background regeneration. Optimized project assets:

- C:/Projects/Muvs/public/images/menu/music-20261005.webp — 1024 square RGBA, 295458 bytes.
- C:/Projects/Muvs/src/assets/menu-fallback/music-20261005.webp — matching 96 square RGBA inline fallback, 3840 bytes.

Both have actual transparent surroundings (all four full-image corner alpha values are zero) and matched alpha coverage. Generated input remains at C:/Users/sezfo/.codex/generated_images/019ff5a2-542f-7de3-b96e-dc5a1dc8abbf/exec-1862675e-ee2c-43c8-b03e-6657ef3fd6a9.png. No work was written to OneDrive. Sharp performed only mechanical resizing/WebP encoding of the selected generated cutout.

Music cover, early HTML preload, menu preparation and inline/WebGL recovery use the new versioned asset consistently. Removed only Music's old loop registration, so music-v3 video cannot replace the new photograph. Static artwork is filtered out before video-cache preload, avoiding a null-spec startup failure. Mixes/Code/Agents loops and old public files for cached clients remain unchanged. Existing camera dolly, title stretch, caption placement, navigation and CMS data were not modified.

## QA

- 99/99 frontend/hook/data/script Node tests pass; independently reviewed diff and 40/40 focused startup/cache/manifest tests pass. Scoped ESLint and production build pass, with no new baseline warnings. Regression covers static Music/no old-video mapping and non-null warming of only Mixes/Code.
- Real Chrome production-preview: cold 390px open, early/final dolly and heading frames, 1440px desktop, 320px reduced-motion with both full/preview image requests blocked, and no-WebGL recovery. New art is shown in full and fallback states, without black rectangle or old-art flash. The 96px fallback intentionally has lower sharpness than the full photo.
- Actual touch Music→Mixes→Code→Mixes→Music cycle and desktop next/previous section buttons pass. Mixes/code selected video times advance (>3s); the unselected video pauses. On return to Music both are paused and new static artwork remains. No page errors on normal/image-failure paths, no requests for music-v3 or music2.webp, viewport390x844 has no document overflow. Screenshots visually fit without clipping. Injected no-WebGL enters existing static recovery with the new inline Music image.
- Live release /var/www/muvs-releases/77fb39726a68, functional commit77fb397. Public HTML preloads the new photo and no old Music poster. Bare image URL returns200 after the temporary Cloudflare prepublication404 cache expired; exact live bytes match local SHA256: 8a1334c236ee0b52cb60f363a8a739ef3f50731274abf0664f5359d20337e7f7.
- Fresh live390px reload has the new full-quality transparent artwork, no page errors and no old Music requests. Public CMS SHA256 unchanged: dc2d30237a353a3caa4460531bb5aa13aaf10e217ab3bdd1c22500aefa4b7523. No DB, unrelated service or nginx changes. Physical handset not tested.
- Evidence: C:/Projects/Muvs/output/music-photo-qa/ — music-early-390.png, music-final-390.png, music-return-390.png, music-desktop.png, music-fallback-320.png, music-webgl-recovery-390.png, mixes-unchanged-390.png, code-unchanged-390.png and live-music-390.png.

## Imagegen provenance / final prompt

Mode: built-in imagegen edit, transparent_background=true, referenced_image_paths set to the user attachment. No API/CLI fallback or paid Flow generation was used.

> Use case: background-extraction. Asset type: existing website MUSIC section sound-system transparent cutout. Image 1 is the exact edit target, not inspiration. Remove ONLY the solid black empty backdrop around the supplied weathered moss-covered stone sound system, vegetation, rocks and rubble. Produce a genuinely transparent RGBA background. Preserve the existing sound system exactly: same geometry, speaker count and size, top carved plaque, perspective, camera, colors, lighting, age textures, moss, fine vines/grass, ground rocks, silhouette, shadow details, original square framing and subject scale/placement. Keep the dark speaker cones and deep black cavities INSIDE the sound system opaque; do not interpret those as backdrop. No redesign, relighting, additions, animals, lettering, logo, watermark, crop, new background or image enhancement. Clean fine edges without a white/black halo. This is strictly background removal of the provided artwork.
