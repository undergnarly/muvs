# 02-05 — Caption typography

## Delivered

- All shared object captions use Josefin Sans Bold 700 and near-black #222222: Music, Mixes, Code, About, plus the five Code project short descriptions. Existing Code emphasis remains #111, also near-black.
- The unmodified Google Fonts Latin WOFF2 is self-hosted and inlined in the CSS chunk. Its SIL OFL 1.1 license is included. No new remote font request or startup dependency.
- Explicit b/strong weight 700 avoids synthesizing a heavier face.
- Narrow-screen menu captions wrap within a perspective-safe width. A proportional downward offset keeps additional lines below the artwork instead of expanding upward into it.
- Titles, buttons, body prose, handwritten About labels, CMS content, media, camera and navigation remain unchanged.

## Verification

- Production build passes. Existing large-chunk warning remains.
- 78/78 Node tests pass; git diff --check passes. Independent scoped review found no new lint/logic issues; RingMenu's existing export-only diagnostics remain baseline.
- Desktop and mobile computed styles confirm Josefin Sans, weight 700 and rgb(34, 34, 34).
- Mobile 390×844 Music and Mixes screenshots checked against the final build. At 320×740, Mixes keeps all eight lines below the artwork, with its visible caption spanning x=25.7–294.3px. Code project descriptions at 390px have equal scroll/client height: no clipped overflow.
- Screenshot evidence is in ignored output/caption-type-qa/. Physical-device testing was not performed.

## Publication

- Functional commit: ce0f52c.
- Pre-publication public CMS SHA256: bc822560dfc613054629a62ac838fe6971cfa28e39a3589ea0532a593b09ad3f.
- Atomic release /var/www/muvs-releases/ce0f52c211c7 deployed on 2026-10-05. Home responds 200; public CMS SHA256 is unchanged.
- Live computed styles confirm all four menu captions use the requested family, 700 and #222. document.fonts.check confirms the face is loaded. The deployed AppRoot CSS SHA256 matches the local production build: 3a20155e896a732ac1046d7652178fffe34a399b9b8f3f5833e0e2cc269bdd78.
- Existing deployment warnings (frontend dependency audit, bundle size and duplicate nginx host declarations) are outside this typography change. No dependencies or server configuration were changed. A metadata-only follow-up may produce an identical-code automatic release.
