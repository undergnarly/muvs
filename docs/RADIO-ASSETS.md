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
