# 02-01 — Subtle object video loops

## Implementation

- Media: `f20be73`; integration: `200a52f`.
- Exact poster-path sidecars in `src/data/objectLoops.js`; original CMS covers, camera math, plane geometry and navigation remain unchanged. No gyroscope code was reintroduced.
- Music, Mixes, Code and AI Agents have six-second loops. Vibe Production shares the Code artwork/loop. About, Websites, AdsUp and Fable Labs are unchanged.
- Mixes, Code and Agents retain original RGB geometry with only bounded, blurred Flow lighting changes. This deliberately avoids generated face/hand/lettering deformation. Music retains restrained interior motion with its silhouette protected.
- H.264, 720 square, 24fps, fast-start, no audio; four MP4s total 3,490,114 bytes. Original resized alpha is stored in separate grayscale maps (358,144 bytes total). No rectangular matte.
- One cached VideoTexture/decoder per source, at most one playing source, lazy selection/visibility gating. Pause/play, reduced-motion, Save-Data, hidden-tab/context-loss pause, original poster on error, explicit retry. No additional animation loop.

## Provenance and credits

Flow project: https://flow.google.com/project/85818385-22da-4514-ba1c-2d24f6e4fea8

Gemini Omni 1.1 Flash; one candidate each, 6 seconds, 720p, 24fps. Reference is the unchanged source artwork at 720 square, centered in a 1280x720 neutral-gray frame, supplied as both endpoint frames. Prompts require locked camera/composition, no geometry changes, very restrained motion, matching endpoints and silence. Music requests slight foliage/lizard movement; Mixes bronze highlights; Code soft stone lighting; Agents small green impulses in existing pathways. Full prompts and source generations remain in the Flow project.

Approved four generation quotes of 10 credits each, without retries, purchases or subscription changes. Starting UI balance was 121; the refreshed final account panel shows 111. Quoted total is 40, but actual net billing is not inferred from inconsistent UI counters. Flow does not expose a token counter here.

Raw downloads, references, contact sheets and detailed QA JSON are retained locally under ignored `output/flow-muvs/`, outside OneDrive. `scripts/prepare-object-loop.cjs` is the reproducible processing tool (`--lighting-only --light-limit 8`, or `8,20,8` for Agents). The original alpha/edge pixels and smooth endpoint blend protect composition and loops.

## Verification

- 19/19 automated tests: 12 decoder/lifecycle tests and seven media preparation tests.
- New files ESLint clean; no lint regression in existing Home/Ring files. Production build passes. Existing large bundle/dependency audit warnings were not introduced or addressed in this media task.
- Media stream metadata and alpha dimensions verified. First/last pre-encode RGB frames equal the original. Encoded seam error is below the largest ordinary adjacent-frame change; coarse registration found no translation (diagnostic resolution 4px, not a proof of subpixel invariance).
- Production preview inspected at desktop and 390x844: all four artworks retain transparent contours; AI Agents works inside Code; manual pause freezes playback; selected Code/Agents/Mixes transition leaves only one observed decoder playing.
- Reduced-motion emulation pauses video and restores the poster. Network-blocked media produces the original artwork and Retry control; removing the block and retrying restores playback. Temporary browser overrides are reset after testing.
- Development HMR briefly produced stale hook-order errors while integration files changed, and dev-mode WebGL context loss. A fresh production build renders without that issue; no unrelated camera/renderer refactor was made.

Deployment verification is recorded in STATE.md after the atomic release completes.
