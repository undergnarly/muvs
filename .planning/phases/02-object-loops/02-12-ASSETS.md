# 02-12 — Desktop clip provenance

Only the three new 2026-10-05 files supplied on Desktop were used. Other Desktop media was not opened or changed. Originals remain intact.

| Source | Site object | Published stem | MP4 bytes | SHA256 |
|---|---|---|---:|---|
| C:/Users/sezfo/Desktop/mixes.mp4 | Mixes bronze DJ | mixes-v4 | 1946455 | 14251367c1f61d259d23cce520feaaadb31855e8b0e26da7063d6fce5459b9f2 |
| C:/Users/sezfo/Desktop/aiagents.mp4 | Code marble/laptop | code-v4 | 487942 | 769441d80c16560e09a482359c14877f3f6105cbd529faf6d94da65a14062a78 |
| C:/Users/sezfo/Desktop/ai agents.mp4 | AI Agents glass brain | agents-v2 | 1078332 | ea91923f7c6bfe692c9d9159402716917dcb940943684d1ecdfc947b9f498fd7 |

Prepared with existing scripts/prepare-object-loop.cjs native RGB mode and exact original alpha/rim. Sources 1280x720 H264/AAC,24fps,144frames/6s; exact crop720x720:x280:y0, no camera stabilization or generative alteration, eroded opaque-interior transfer and .25s endpoint return to original RGB. Outputs720x720,24fps,144frames/6s,H264High3.1,yuv420p,CRF20,faststart,noaudio. No gray chromakey on translucent brain.

Runtime files per stem: public/videos/objects/{stem}.mp4, {stem}-alpha.png, {stem}-decoded-poster.webp. Decoded posters exactly match the final encoded first-frame RGB at visible pixels and retain original alpha (changedVisibleRgb=0,changedAlpha=0); original alpha files equal prior masks byte-for-byte.

Registration drift0px and warnings[] for all three. Encoded wrap MAE Mixes1.312,Code0.971,Agents1.335; wrap brightness steps-.088,-.015,-.045, below maximum adjacent-frame changes. White composite inspection shows intact silhouettes, glass detail and alpha without gray halos.

Private local QA/provenance JSON, unused original-base posters and white contact sheets are retained under output/desktop-animation-review, not public runtime files. Correct contact sheets end -contact-white-v2.png; initial unversioned sheets had an inspection-only Sharp operation-order artifact and were not used for signoff.

Music music-v3 and the new static About portrait are unchanged. Original public media remains for cached clients. CMS artwork URLs and all content are unchanged; only sidecar registration and two early decoded-poster preloads change. AI Agents now gets a resolved decoded poster instead of the old upload preview during loading.
