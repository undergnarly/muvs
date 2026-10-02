# 02-02 — Single-lizard motion, statue lighting and automatic playback

## Changes

- Removed the artwork Pause/Play/Retry control from all scenes and deleted its component/styles. Legacy session-stored manual pause is ignored.
- Selected visible media starts preparing during navigation; playback waits for the camera to settle. One shared decoder per URL, at most one playing source. Muted inline playback, hidden-tab/context-loss/reduced-motion/Save-Data gates remain.
- Autoplay-policy rejection keeps the clean poster and prepared source. A trusted interaction or visible return can retry, with a two-retry bound; decoding errors do not create retry loops.
- Music's original still already contained three reptiles. Flow cleaned the left-side animals; only two localized donor patches were composited onto the original, preserving every outside pixel and the complete source alpha. The remaining lower-right lizard and top bird are retained. The cleaned poster is a sidecar override; CMS cover data is unchanged.
- A new Flow source contains one lizard but develops body stretching later. Only frames 0–18 (0–0.75s) are accepted. A six-second cosine-eased forward/reverse schedule with holds uses whole frames, never interpolated/ghosted animals. Motion is limited to the lower-right interior region; the rest of the sound system remains fixed.
- Mixes uses deterministic, localized warm reflection passing across left bronze trim, statue and right trim. Code uses varying white-blue laptop spill on face/chin hand/chest/typing hand. Geometry, background and silhouette stay fixed. Code also serves Vibe Production. AI Agents is unchanged.
- Versioned media URLs invalidate rejected cached clips. No camera/navigation transforms, gyro behavior, admin data, AdsUp artwork or server configuration were changed.

## Provenance and reproduction

Flow project: https://flow.google.com/project/85818385-22da-4514-ba1c-2d24f6e4fea8

- Clean reference asset: `822c22a6-e62a-42fd-b272-503840ee4764`.
- New video asset: `22587581-1efa-428c-8f05-20e33a0d4c09`, `MUVS_music_SINGLE_lizard_loop_v02`, Omni 1.1 Flash, one candidate, quoted/approved 10 credits. One reference-image edit was also made; its separate price was not shown. Account panel after completion shows **101 credits**, previously111; do not infer separate billing from the net counter. No purchases/subscription changes.
- `scripts/prepare-music-reference.cjs` localizes the still cleanup; `scripts/retime-object-motion.cjs` restricts the source frames; `scripts/prepare-object-loop.cjs` composites/encodes Music; `scripts/prepare-object-relighting.cjs` produces Mixes/Code lighting.
- Raw sources, intermediate rejected versions, contact sheets and detailed reports are retained under ignored `C:\Projects\Muvs\output\flow-muvs-v2`, not OneDrive. Final light sources are in `relighting-reviewed/`.

## Verification

- Production build passes. New/modified runtime and manifest ESLint passes; existing Home/Ring lint has no regression. Main bundle size warnings predate this revision.
- Desktop and390x844 production preview inspected. Chrome CDP touch emulation confirms horizontal swipes switch artwork and only one observed source plays. This is not a physical iPhone/Safari test.
- Legacy stored pause=true does not stop playback. Muted/playsInline flags verified; Mixes and Code currentTime advances automatically. Reduced-motion pauses all observed clips and restores posters; clearing it resumes selection.
- Network-blocked MP4 keeps the cleaned Music poster without a Pause/Retry button. A one-shot simulated NotAllowedError keeps Mixes paused at0 with its poster; a trusted key event automatically resumes the same source. Temporary QA instrumentation and browser overrides are removed afterward.
- Final independent media review caught old interior-mask erosion obscuring the moving lizard head. A narrowly bounded interior-motion mask fixes the composite without changing the exported source alpha. Rejected v2 media is not the final Music asset.

## Final release

- Commits: media `227957d`, automatic playback `f83b53e`, interior-mask correction `99ecf89`.
- **46/46 tests pass**, including the two regression tests for internal alpha defects. Local and server production builds pass. Existing frontend dependency audit and nginx duplicate-host warnings remain outside this media revision; server dependency audit reports zero vulnerabilities.
- Functional release `/var/www/muvs-releases/99ecf89eaccc` deployed atomically. Home and Dubplates return200, Music byte-range returns206. Live SHA256 matches all four new selected assets (Music v3, Mixes v2, Code v2, cleaned Music poster). The original Music alpha hash remains `1c536b764e74602efde4eec2a9d57862fc48b75642b03dcdb16c734c4f038011`.
- Public CMS SHA256 unchanged: `bc822560dfc613054629a62ac838fe6971cfa28e39a3589ea0532a593b09ad3f`.
- A fresh tab initially reused old HTML from its browser cache; disabling cache and reloading confirmed current media URLs. Final live390x844 Music screenshot: `output/flow-muvs-v2/live-music-final-mobile.jpg`. Live Mixes automatic playback and touch navigation verified as well. Real iPhone/Safari remains untested.
- Final Music: `music-v3.mp4`,788450bytes,720square,24fps,6seconds,silent; processed with `--motion-region 423,488,95,156 --interior-motion`. Same original alpha, zero coarse drift, encoded wrap mean error1.448 and brightness delta−0.126/255. Mixes1003816bytes; Code291858bytes. Older media URLs are retained for in-flight cached bundles, but are not selected by the current manifest.
