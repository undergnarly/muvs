# Radio artwork

Generated with the built-in imagegen tool on 2026-10-25 (no CLI or external API
key). Exact prompts: [radio-image-prompts.json](../scripts/radio-image-prompts.json).
Three separate transparent-alpha 1280-square originals were visually inspected;
the modern receiver is reused for the main-menu hero. No existing site art was
replaced. Generated artwork has no baked floor, so the site's floor/shadow system
can ground it consistently. No stream or third-party media is embedded.

Mechanical preparation: `node scripts/prepare-radio-artwork.cjs modern.png
oldschool.png y2k.png`. Sharp resizes to 768-square WebP quality 84, alpha quality
100; inline recovery images are 192-square quality 48. No semantic image edits.

| Era | Public file | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Modern / menu | public/images/radio/radio-modern-v1.webp | 188088 | b682e096dfc82fec991a141db22fd7c6a32c11ddf998013706c30b57a77ae109 |
| Roots | public/images/radio/radio-oldschool-v1.webp | 173350 | 745d515dfc5e2d2594fffdbfd3841db1d9a9bdac5984a8f08db89424efd57c92 |
| Y2K | public/images/radio/radio-y2k-v1.webp | 117044 | fe4c9cf200a140a285250a5e45ff3a939ae88d73cce3c5c89d58e0658c933e62 |

All six outputs have genuine alpha, not an opaque checkerboard. Public total:
478482 bytes. Inline fallbacks total 33368 bytes; full Radio artwork is not
an additional initial Music readiness gate. Direct Radio warms only its selected
era at high priority after the loading tag and spray have painted.

Original PNG SHA-256: modern
`9b75bf818d89717b2a851416d1644f1366213eb229bd5c3be65d65858db61ebf`,
oldschool `5c8600c053fc2d4b7f4c004eadcfe83f17b4bb46c60bed5d025acd8157adb7a6`,
Y2K `7a0923c9d203fb160a2baabd84cd8ae6c30c51f72674a6aa51cea9d9abcc4ca8`.

## Minimal modern receiver v2 — 2026-10-25

Owner-requested replacement for main-menu Radio and New Era only. Generated
through the built-in image_gen tool with transparent_background=true, not CLI.
Exact final prompt and source path: [radio-modern-v2-prompt.json](../scripts/radio-modern-v2-prompt.json).
New matte-white polymer body, charcoal speaker/control panel, brushed-aluminium
knob/handle/antenna and restrained lime details. One isolated full object; no
baked floor/ground shadow. Roots/Y2K, camera and per-receiver shadow controls
remain unchanged. v1 files are retained for cached clients.

Mechanical preparation only: `node scripts/prepare-radio-artwork.cjs --modern-v2
<generated.png>`. Original1254²PNG SHA256
`c12face2b5b1f20c527aedd8d184aa24520a493a337cc04c5214775db253cbeb`.
Same768/192 square framing, WebP84/48, alpha100. No crop, recolor or alpha edits.

| Use | Final saved path | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Menu / New Era | public/images/radio/radio-modern-v2.webp | 81732 | 542ef437f7c2ff089a2d497cfe1605c26a0df5b45537ac98cd17ebdff6d3d1fa |
| Inline recovery | src/assets/menu-fallback/radio-modern-v2.webp | 7352 | 12b2503bc98a2a6d5e57f0f11d23d63b0fc2c7597dac394fbaafe2c83a92b930 |

Full image is56.5% lighter than v1; inline recovery42% lighter. Both have real
alpha, clear border margins and identical normalized framing. Direct New Era
preload and recovery switch together so cold/failure states never show glassv1.

## Frontal, personalized receivers — 2026-10-25

The owner's subsequent request supersedes the angled artwork for **all three
eras**: strict front-on faces and level feet, with era-specific details. Roots
retains its worn walnut, ivory, reggae stickers and analog dial. Y2K adds a
cassette deck, Jungle / Dubplate / Massive stickers and a lime gunfinger hand
sticker (not a weapon). New Era keeps white matte polymer / graphite / metal /
lime, adding restrained black calligraphic marker tags. The same modern v3 is
used in the main Radio menu. All previous public and inline files are retained
byte-identically for cached releases.

Generated using the built-in `image_gen` tool in precise-object-edit mode with
`transparent_background: true`; no external API/CLI or semantic pixel edits.
The exact prompts, edit-target reference paths, generated source paths and
source hashes are in [radio-frontal-prompts.json](../scripts/radio-frontal-prompts.json).
All originals are 1254 × 1254 PNGs with genuine alpha. Camera/material changes
and the stickers/tags were generated, not painted or transformed by a script.

Mechanical preparation:
`node scripts/prepare-radio-artwork.cjs --frontal <modern.png> <roots.png> <y2k.png>`.
Sharp finds each significant alpha silhouette (alpha ≥ 16), retains a two-source-
pixel guard, uniformly fits the full silhouette within a 706-pixel box, centers
it horizontally on a transparent 768-square canvas and aligns the foot baseline
at pixel 738 (96%). No skew, perspective transform, color adjustment, alpha
replacement or baked floor/shadow is applied. All low-resolution fallbacks are
resized from the same framed pixels to 192-square, so first/recovery and full
states match. WebP quality remains 84 / 48, alpha quality 100.

| Era | Source crop (left, top, width, height) | Framed size | Canvas offset |
| --- | --- | --- | --- |
| Modern | 30, 56, 1195, 1123 | 706 × 663 | 31, 76 |
| Roots | 16, 113, 1222, 1034 | 706 × 597 | 31, 142 |
| Y2K | 11, 34, 1232, 1154 | 706 × 661 | 31, 78 |

| Use | Final saved path | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| Menu / New Era | public/images/radio/radio-modern-v3.webp | 84646 | 5ce81c10864ce890bf75505ee2e56d857a4661f1867cdb8a59b865f0e4399a2a |
| Modern inline | src/assets/menu-fallback/radio-modern-v3.webp | 7730 | ecc38f3c775d48be2907f4b84dba699fe9480f5c67ae9cfd224bc1c1a4e7f8c2 |
| Roots | public/images/radio/radio-oldschool-v2.webp | 137834 | 7927ac08f919124b5d406fe6ead321b09c0ed36a05308e761ab54046b9791e76 |
| Roots inline | src/assets/menu-fallback/radio-oldschool-v2.webp | 7094 | e5aa404c4166055c6e051468012d44b7a193cf5a2290c124edf37f0e90cc8138 |
| Y2K | public/images/radio/radio-y2k-v2.webp | 115620 | 71b521f4b8fc76ff944dfc8b01c8d2bd58b0fde527ec3116e1fd67fbf05bd4e3 |
| Y2K inline | src/assets/menu-fallback/radio-y2k-v2.webp | 9472 | 55cd0196938e331c7fdd78dbd26c391e8158d4c73946d5cdd97a55508be54de1 |

Public artwork totals 338100 bytes; inline fallbacks total 24296 bytes. The
significant alpha foot baselines match within two full-resolution pixels, with
clear transparent safety margins and level left/right supports. All three
receivers were visually inspected on gray, white and charcoal backgrounds;
there is no opaque backdrop, baked checkerboard, floor or clipped antenna.
Main-menu art, direct era preload, inline recovery, admin thumbnail and public
SEO image records resolve to these same new files. Shadow/camera/admin behavior
is handled separately; artwork preparation does not rewrite saved settings.
