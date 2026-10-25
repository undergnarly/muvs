# 06-03 — Code captions match the menu

## Delivered

All five short descriptions below the Code objects now use the same
white-by-default color and restrained text shadow as the main menu.
The existing `visualEffects.menuCaptions.color` setting controls both;
admin help now explicitly includes Code project captions. No new control,
schema, dependency, layout, font, content, artwork or animation change.
Headings and full descriptions remain unchanged.

The rule is confined to `.hn-code-short`. Rich caption formatting inherits
the normalized color, including bold spans. Existing positioning, phone
text fitting and geometry are untouched. Historical 06-02 notes about
Code staying gray are superseded by this explicit user follow-up.

## Verification

- Full suite: **468 tests, 464 pass, 4 existing skips, zero failures**.
  Production build succeeds, changed admin JSX ESLint and diff check clean.
  Independent read-only scope review found no blocker.
- Fresh 390 px direct `/code`: AI Agents, Websites, Vibe Production,
  AdsUp.pro and Fable Labs all compute white with the exact menu shadow.
  Native Next navigation inspected each card; every caption stays fully
  inside the viewport and clear of the bottom controls. Screenshots reviewed.
- 320 px mobile and 1440 px desktop inspected, with no caption clipping or
  horizontal overflow. Fonts, spacing and placement remain unchanged.
- Native return from the last Code item to its hub works. A staged custom
  `#ccff00` setting applies to both menu and every Code description through
  a native Music → Mixes → Code → enter journey. Restoring the fixture API
  to its original no-color preset and reloading restores white. No page errors.
- Only an isolated browser API fixture is edited; no production settings,
  track plays, downloads, catalog or analytics writes used for testing.
- Generated evidence: ignored `output/code-caption-color/`.

## Publication

Functional commit `2a7ec72` is live at
`/var/www/muvs-releases/2a7ec7225359`, guarded deployment/origin API health
passes. Eight public AppRoot / admin / startup / entry JS/CSS files match
the local production SHA-256 hashes exactly. Fresh live 390 px `/code`
confirms all five captions are white with the matching shadow; native
Next navigation reaches Fable Labs with no page errors or production POSTs.

Public CMS before/after SHA-256 is unchanged:
`2e83ee09b3606db2bec08f8215bcf2b6c2a7b2b1e9327b77fbf534de43b3b361`.
Private DB: `5114810ddaf06338dcf181dce128648ca82e4d9ee27bea69caacdd37dec2fc25`;
Dubplates catalog: `20e5fe92600ce22d6d094a1c3c876e664f8c89f764d048caf7d6b4d4d501e410`;
analytics: `d4a5e19a97d686e1c2be2fcfcfb3afa2d9c4d85ea691e5600365f58dacef4063`.
All match predeployment values. No settings/content/audio writes or
unrelated app/Nginx changes. Routine guarded retention removed only old
owned build `fdda7917a1b2`, rebuildable from Git; user notified.

## Handoff / limits

Code captions now share the existing color control under Settings →
Визуальный стиль → Подписи меню. White remains the default; save and
refresh the website to use another color. No physical phone or arbitrary
selected-color WCAG contrast guarantee is claimed.
