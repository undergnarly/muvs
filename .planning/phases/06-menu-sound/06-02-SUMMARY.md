# 06-02 — Saved menu caption color

## Delivered

The user's follow-up supersedes a fixed white-only change. Settings →
Визуальный стиль → Подписи меню now provides a native color picker,
editable HEX field and immediate preview. The existing confirmed Save
changes action persists the setting; the public page uses it on refresh.
Default is white, with a small text shadow to distinguish it on the pale
floor. An explicit hint asks the owner to check chosen-color readability.

The setting is `siteSettings.visualEffects.menuCaptions.color`. Only
`#RGB` and `#RRGGBB` are accepted, trimmed and normalized to lowercase
six-digit opaque HEX. Invalid stored input safely falls back to white;
invalid editing remains visible with an associated error and cannot save.
Old presets retain their numeric effect values, and no new enabled flag,
animation, dependency, request or frame loop is introduced.

The normalized color is inherited through a CSS custom property scoped to
HomeNewPage and consumed only by `.mp3d-menu-caption`. Fonts, layout,
copy, transitions, artwork, player and audio layer are unchanged. All five
Code project descriptions remain gray (`#666666`) with no text shadow.

## Verification

- Full Node suite: **468 tests, 464 pass, 4 existing skips, zero failures**.
  Includes canonical/malformed HEX, old preset preservation, equality,
  validation, and the actual isolated authenticated settings API with
  persistence across restart and unrelated data preservation.
- Production build and new/changed scoped ESLint succeed. HomeNewPage
  retains 7 baseline findings with the same rule IDs, no additional finding.
  Independent schema and UI/scope reviews found no blocker.
- Native mobile touch journey inspected all four white hub captions,
  Code dive/return and unchanged Code descriptions. Public custom-color
  fixture changes every hub copy to `rgb(204, 255, 0)`; a staged invalid
  persisted CSS-like string falls back to white and does not alter layout.
- Admin browser checks use an isolated in-memory API fixture, never live
  POSTs: native picker and HEX remain synchronized; `#AbC` saves as
  `#aabbcc`, survives reload, and changes public rendering. A staged 503
  shows failure, preserves the draft and allows successful retry. Blank /
  malformed HEX blocks save with `aria-invalid` and a linked error.
- Other saved visual-effect groups remain exactly unchanged in the fixture;
  POST body contains only the visualEffects settings patch, not general
  settings or content.
- Screenshots inspected at 320 / 390 / 1440 px, plus main-menu desktop.
  Picker and text input are 44 px high, no horizontal or internal preview
  overflow; keyboard Tab reaches the HEX field with a visible accent focus
  outline. Resize/loading animation was allowed to settle before signoff.
- No browser page errors. Evidence: ignored `output/white-menu-captions/`.

The browser fixture verifies the real form/data-provider wiring, while the
separate actual server test verifies authenticated disk persistence. It is
not presented as a production settings write or physical-handset test.

## Publication

Functional commit: `28e5b2a`; preview-label contrast follow-up: `c86a74b`.
Guarded code-only deployment is live at
`/var/www/muvs-releases/c86a74b88fac`, with successful API/origin health.
Eight public AppRoot / admin / startup / entry JS and CSS files match local
production SHA-256 hashes exactly. A fresh live phone-sized view confirms
white public captions and the admin picker/HEX/preview with white default.
Changing an unsaved draft to `#123456` renders preview `rgb(18,52,86)`;
restoring white returns the form to clean. The live admin view uses a staged
client session for read-only rendering, not real authentication or a live
save test. All production writes were blocked; zero POSTs/page errors.

Public CMS SHA-256 before/after remains
`2e83ee09b3606db2bec08f8215bcf2b6c2a7b2b1e9327b77fbf534de43b3b361`.
Private DB remains `5114810ddaf06338dcf181dce128648ca82e4d9ee27bea69caacdd37dec2fc25`;
Dubplates catalog remains `20e5fe92600ce22d6d094a1c3c876e664f8c89f764d048caf7d6b4d4d501e410`;
analytics remains `d4a5e19a97d686e1c2be2fcfcfb3afa2d9c4d85ea691e5600365f58dacef4063`.
No production preset/content/audio write or unrelated app/Nginx change.
Routine guarded retention removed old owned builds `50d9facae9f2` and
`02a4a5dd2b3a`, recoverable by rebuilding their Git revisions; user notified.

## Handoff

Open `/admin/settings`, choose a color under **Визуальный стиль → Подписи
меню**, save changes, then refresh the website. White is the default, not
a forced overwrite of an existing owner choice. The preview/shadow do not
guarantee WCAG contrast for arbitrary owner-selected colors. No physical
phone test or unrelated November launch-gate resolution is claimed.
