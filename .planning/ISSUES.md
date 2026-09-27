# Deferred existing issues

- Root/frontend dependency tree has existing npm audit findings (production install2026-09-27:24 including15high); no frontend packages were added by Dubplates. Investigate dependency exposure and update separately, rather than applying an unreviewed force upgrade to the 3D stack. New/updated server dependencies audit clean.
- Existing nginx configuration includes another enabled backup server block with duplicate muvs.dev names. Warnings predate this task; original working site routes preserved. Audit and disable duplicate configuration in a separately scoped server cleanup.
- Existing3D large bundle and scoped lint issues remain. Dubplates uses a separate lightweight entry and does not fetch the3D bundle.
