# 04-05 — Supplied film overlay asset provenance

Prepared 2026-10-24. Source attachments were read only. All derived media and QA images were written under `C:/Projects/Muvs`; attachment directories were not modified. The source filenames and hashes below identify the user-provided inputs without storing personal absolute attachment paths. This records provenance, not independently verified licensing or redistribution rights.

## Inputs

| Family | User-supplied attachment | Bytes | Measured container duration | Video / original audio | SHA256 |
| --- | --- | ---: | ---: | --- | --- |
| Light leaks | `1-VID_20261024_190037_027.mp4` | 1,770,332 | 39.125624s | 640×360, H.264 Main, 24000/1001fps, yuv420p; AAC stereo | `27fd57ad96077bb749f140f54a2982e47cdc86d79d0f64d54e0b39e989f4f8f7` |
| Dust / scratches | `1-VID_20261024_191017_395.mp4` | 3,814,878 | 101.308662s | 640×338, H.264 Main, 30fps, yuv420p; AAC stereo | `6cec4125eb36c2bdededcafb37e68ef4d460c5e150f48cef2411ff7260ba209e` |

The first input contains an introductory promotional slate and a later branded demonstration/outro. Selected light-leak windows are inside the clean abstract-overlay section, not those slates or demonstration footage. The dust selections contain irregular white specks, small hairs/scratches and weak edge haze on black; inspected windows contain no title, promotional slate or visible branding. Film-edge markings within the abstract light texture are part of the supplied imagery, not new site copy.

## Derived media

All paths below are relative to `public/videos/atmosphere/`. Source windows are half-open extraction requests `[start, end)` in seconds. Encoded durations/frame counts are measured separately with ffprobe; source-frame alignment can quantize the final frame count. In particular, light clip D is 29 frames / 1.208333s rather than the requested 1.25s. Runtime excerpt selection must use measured native `video.duration`, not assume every light clip is exactly 1.25s.

| Output | Source window | Encoded duration / frames | Bytes | SHA256 |
| --- | --- | --- | ---: | --- |
| `film-leak-a-v1.mp4` | 13.25–14.50 | 1.250000s / 30 | 83,892 | `f49dc69533a9e06ff7f574c2088fc187660e6c6c327961b9000435194989da92` |
| `film-leak-b-v1.mp4` | 15.25–16.50 | 1.250000s / 30 | 74,221 | `629d4bf301de5025ab19913fee917ed015c814dbe79b6b0911a580eb0c68b435` |
| `film-leak-c-v1.mp4` | 17.25–18.50 | 1.250000s / 30 | 114,015 | `882c91a6bb5f8282cf433c8bf1d01bf45f3f5884346e03b955ef98e0e03d4855` |
| `film-leak-d-v1.mp4` | 21.25–22.50 | 1.208333s / 29 | 58,332 | `19d0d434e501330a522762310245a2c27328d3e819fddaac4c03237ef85c8e4d` |
| `film-dust-a-v1.mp4` | 8.60–11.10 | 2.500000s / 60 | 55,862 | `172b3e7800a59a500b36cd1b61e98a981adf0841f9e853e4b7b6b9be22852fa7` |
| `film-dust-b-v1.mp4` | 33.60–36.10 | 2.500000s / 60 | 45,466 | `0bb05e4a18c4bc9228c0c52caeab0277eba4272821e99dab27a68458edf4f42e` |
| `film-dust-c-v1.mp4` | 70.20–72.70 | 2.500000s / 60 | 35,823 | `07aa618905e1c0b007ecd80fe2a0c410783bc3b44f743bacc68c12cf7058e3f3` |
| `film-dust-d-v1.mp4` | 89.20–91.70 | 2.500000s / 60 | 45,731 | `dd71141b46c7ce5f71b4eba6618ecb7148df5c259725c0ed3b6f79ec97e824b3` |

Light family: **330,460 bytes**. Dust family: **182,882 bytes**. All eight: **513,342 bytes**. Assets are selected individually by one native video player; this is not a request to preload all eight at startup.

All outputs are silent, one video stream only, H.264 **Constrained Baseline**, level 3.0, yuv420p, 24fps, square pixels and MP4 faststart. Light outputs retain 640×360; dust outputs retain 640×338. No alpha channel is encoded. Native CSS `mix-blend-mode: screen` makes the true-black floor visually neutral over the scene; the runtime fades the effect with a maximum opacity of **0.5**, not an opaque video cover. Portrait dust rotation is a runtime presentation choice, not a baked-in orientation or second download.

## Encoding recipes

Tool measured locally: `ffmpeg version 9.0.1-full_build-www.gyan.dev`. Input variables stand for the read-only user attachments. Output names and source start times are taken from the table above. No package download or remote processing was used. Hashes in the table identify the actual delivered files; encoder versions and timestamp rounding can change reproduction bytes.

Light-leak processing: 24fps, three-frame weighted temporal smoothing to soften abrupt source flicker, black-floor cleanup on all RGB channels, then web-friendly Baseline H.264. Each extraction requests 1.25 seconds.

```powershell
ffmpeg -hide_banner -loglevel error -ss $filmLightStart -i $filmLightSource -t 1.25 `
  -map 0:v:0 -an -sn -dn -map_metadata -1 `
  -vf "fps=24,tmix=frames=3:weights='1 2 1',lutrgb=r='max(0,val-12)*255/243':g='max(0,val-12)*255/243':b='max(0,val-12)*255/243',format=yuv420p" `
  -c:v libx264 -preset slow -crf 23 -profile:v baseline -level:v 3.0 `
  -g 12 -keyint_min 12 -sc_threshold 0 -movflags +faststart -y $filmLightOutput
```

Dust/scratches processing: preserve source size, convert 30→24fps, mildly crush TV-range luma values below 24 toward black 16, preserve highlight range, neutral chroma, remove audio and metadata. This reduces unintended gray background wash while retaining the varied white hairs/specks. Each extraction requests 2.5 seconds.

```powershell
ffmpeg -hide_banner -loglevel error -ss $filmDustStart -t 2.5 -i $filmDustSource `
  -map 0:v:0 -an -sn -dn -map_metadata -1 `
  -vf "fps=24,scale=640:338:flags=lanczos,lutyuv=y='max(16,min(235,16+(val-24)*219/211))':u=128:v=128,setsar=1" `
  -c:v libx264 -profile:v baseline -level:v 3.0 -pix_fmt yuv420p -crf 20 -preset slow `
  -g 12 -keyint_min 12 -sc_threshold 0 -movflags +faststart `
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -y $filmDustOutput
```

## Media QA evidence

- Inspected full-source contact sheets and detailed candidate-window sequences before selecting cuts. Source introduction/outro and branded demonstration sections were excluded from the light clips.
- Inspected encoded light and dust contact sheets plus full-resolution dust frames: abstract colored light transitions vary; dust clips vary in density, edge distribution and white scratch/speck shapes. No new titles or watermarks were added. Dust retains only restrained edge haze.
- Decoded every output completely with `ffmpeg -hide_banner -loglevel error -i <output> -f null -`: no decode errors reported.
- ffprobe confirms eight one-stream silent Baseline/yuv420p/24fps outputs with the durations and frame counts above.
- Checked top-level MP4 atoms: `moov` begins at byte 32 in all eight files, before `mdat` (light A/B/C byte 1027, light D byte 1035, dust byte 1124), confirming faststart placement.
- Ignored local QA images: `output/04-video-overlay/source-contact.jpg`, `source-detail.jpg`, `leak-encoded-contact.jpg`, `dust-source-contact.jpg`, `dust-a-source-detail.jpg` through `dust-d-source-detail.jpg`, `dust-encoded-contact.jpg`, `dust-encoded-full-detail.png`.

This media inspection does not replace the runtime checks for visible rendered frames, no stale seek or black rectangle, controls above the effect, loader-first priority, preference/hidden cleanup and actual mobile/desktop navigation. Those checks belong in the 04-05 implementation summary.
