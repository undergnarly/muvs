# 02-07 — Code caption placement aligned

## Result

Production CMS layout data updated for Websites, Vibe Production, AdsUp.pro and Fable Labs. All five Code projects now use AI Agents' existing caption position, tilt, scale and text box settings. AI Agents, copy, covers, camera stops, other site settings and all private DB fields were preserved. No frontend source, media, service restart or build required.

## Root cause and correction

AI Agents has an individual scene config with a tuned `codeCaption`; the shared `codeNewConfig` did not have one. Websites, Vibe Production and Fable Labs therefore used the old low default. AdsUp has a separate full config, and hydration replaces a missing caption with the same old default rather than inheriting the shared section caption.

Copied the exact AI caption into only two CMS paths:

- `siteSettings.codeNewConfig.codeCaption`
- `siteSettings.sceneItemConfigs.code.1783953605006.codeCaption`

Values: position `(0, 0.69, -2.55)`, tilt `34`, rotation `0`, scale `5`, width `360`, fontSize `14`, lineHeight `1.25`, letterSpacing config `0`, maxHeight `23.5`. Runtime typography remains Josefin Sans 700, gray `#666666`, CSS tracking `.035em` from revision 02-06.

## Persistence and recovery

Verified PM2 `muvs-api` uses `/var/www/muvs-data` and the DB matches public API before mutation. Server-only mode-600 backup: `/var/www/muvs-data/backups/code-caption-layout-2026-10-05T06-26-35.527Z.json`. Atomic rename guarded against concurrent writes, original owner/mode preserved. Deep comparisons before and after strip the two targeted paths and confirm every other DB field is identical. Source record commit: `60a6987`.

DB SHA256 before `c5277e78f00cd622e822987baea148abee48d13ef00db54d6d95878dd625aec2`, after `047d13451b1b121fba17050e2bc0d76ecf6bd8a71910f15a7396c3ff3d712004`. Public API raw-body SHA256 after `dc2d30237a353a3caa4460531bb5aa13aaf10e217ab3bdd1c22500aefa4b7523`; live API equals persistent settings, and all five resolved captions equal AI Agents. To undo later, remove only these two added keys from the then-current DB; do not overwrite newer CMS edits with the full backup.

## Verification

- Live Chrome at 390×844: all five captions top `585.40px`, bottom `626.67px`, height `41.27px`. Make Request begins at `774px`, leaving `147.33px` below the caption. All four changed projects visually checked; no caption/artwork or caption/control overlap.
- Desktop: all five captions top `548.87px`, bottom `587.56px`, with `119.77px` gap to the control row; navigation settles and text remains centered.
- 320×740: matching caption top/bottom (`513.27` / `549.45px`) and `120.55px` control gap. Existing width/projection can clip some text at this very narrow aspect ratio, including unchanged AI Agents; logged separately rather than modifying the requested reference tuning.
- Existing oversized Vibe Production heading also clips horizontally on mobile; unrelated to caption placement and logged separately.
- No physical handset test. Browser viewport restored. No synthetic source test/build rerun for this data-only mutation; scoped DB invariance and live API/render checks provide the relevant verification.

Evidence stored outside OneDrive under `C:/Projects/Muvs/output/code-caption-layout-qa/`: Websites/Vibe/AdsUp/Fable 390px screenshots, Fable 320px screenshot, desktop Websites screenshot and measured mobile/desktop geometry JSON. Independent read-only agent confirmed configuration precedence and the need to also update AdsUp's own config.
