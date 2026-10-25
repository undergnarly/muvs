# 07-02 — Radio surface

Functional commit c053d8a adds `/radio` and direct era selections
`?item=roots`, `?item=y2k`, `?item=new-era`. Three frozen shared records carry
title, era, genres, artwork, coming-soon status and null stream URLs/empty tracks.
No station pretends to be live, no real station audio is fetched or created.

Radio reuses the existing object-led 3D scene rather than adding a card dashboard.
Visual/UX review shaped a dedicated antenna-safe camera/heading/object/caption
preset, one camera stop, native 48px phone arrows and disabled future Play pill.
Descriptions follow the existing white-by-default configurable caption color;
native status announces current era/count/availability. Horizontal swipe, arrows,
keyboard and header children all use actual canonical era URLs. Return is centered,
and same-section reentry retains selection. Crossing sections uses the existing
selection-reset behavior. No inheriting unrelated release/item CMS camera poses.

Extracted camera sampler handles a single frozen stop by cloning its nested
vectors; all existing multi-stop fractions are numerically identical. Accidental
AlbumPlayer fallthrough now checks activeSection.simple. No TV/CamDolly in Radio.

Added header Radio children, optional main-menu caption admin field, public
server/client metadata, canonical/sitemap/reserved slug and honest static Radio
fallback if WebGL fails. Production CMS/settings were not changed. Captions/scene
presets still use the established owner tuning mechanism. No streaming backend,
radio scheduler, track upload UI or station URL admin editor is claimed.

Independent source review found no actionable issue; 84 focused independent
tests pass. See 07-03 for the full functional/visual/publication evidence.
