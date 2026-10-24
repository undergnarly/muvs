# 04-01 — Living gray background

## Result

Shared dependency-light `Atmosphere` on the existing 3D shell (home/sections/deep routes) and standalone Dubplates. Retained gray-to-white gradient and all existing composition/media/input. Static monochrome160px grain tile, seven tiny far motes, six intermediate soft motes, three larger defocused foreground motes; mobile renders12 of16. Fixed deterministic positions/phases,25–45second soft trajectories, no layout/random-per-render jitter. Main far/grain behind canvas; near plane below controls; all atmosphere pauses/fades with floor view. Dubplates both planes sit at negative z inside its isolated page, below normal content/sticky toolbar/player/dialog.

No new raster/video files, libraries, WebGL canvas, animated filters, scroll polling or rAF. Small radial-gradient sprites animate only transform/opacity. Single temporary body observer waits for splash removal, then disconnects; document/preference/connection listeners clean up. Reduced-motion or Save-Data keeps only grain; hidden/floor pauses freeze existing phases. Loader/spray/camera/video preparation remain unchanged and priority assets still paint first.

## Verification

- 231/231 full Node tests, including5 new layout/lifecycle/policy tests; scoped ESLint and production build pass. Existing large3Dchunk warning remains; no dependency migration.
- Independent read-only motion/stacking/lifecycle review: no release blockers. Fixed the review's library alpha cascade issue and removed unnecessary content stacking rules.
- Browser390×844 and320×640 mobile,1440×900 desktop. Reviewed Music/Mixes/Code/About, in-transition and settled frames, native touch selection, Code entry/floor/return. Gradient/near plane opacity0 and paused on floor,1/running on return. No page errors or horizontal overflow.
- Dubplates search→empty→reset, open filters/tag filter/reset, selection/export dialog/Escape, sticky toolbar and fixed player exercised with actual inputs. No real exports/listens generated. Mobile narrow view and desktop long list inspected. Atmosphere is behind all controls; dialog remains top layer.
- Actual reduced-motion change hides every mote; Save-Data has0 dust animations. Staged document visibility transition freezes exact transform across800ms and resumes (headless Chrome does not model real OS tab visibility); pure lifecycle tests cover event handling. No physical handset available.
- CDP LayerTree confirms small2–106px dust textures, each painted once;0 new paint events over3seconds steady Dubplates motion. Negative-z simplification does not claim a reduction of the existing long-content compositor surfaces. No scrolling/layout measurement loop added.
- Built preview: cold splash plane opacity1; selected `music-v3.mp4` playing/ready4; no errors. All-video failure at320px still renders the fallback artwork and starts atmosphere. Standalone library loads no AppRoot/Three resources.
- Screenshot evidence (ignored): `output/04-atmosphere/`, including all four mobile sections, transition, floor,320fallback/SaveData/filter recovery, desktop home/library/sticky and export.

## Source and publication

Functional commits: `dc8e978` (shared atmosphere/integration), `de200fc` (library stacking and additional lifecycle coverage).

Verified live atomic release `/var/www/muvs-releases/de200fc97679` on2026-10-24. Fresh bare-URL mobile session shows grain opacity.075,12 running motes,0 errors/no horizontal overflow, real Music and native-swipe Mixes video playback (ready4, advancing time). Real public Dubplates search finds/restores tracks, atmosphere behind content atz-1, no AppRoot/Three requests. Public AppRoot/shared atmosphere/Dubplates JS+CSS byte hashes equal observed release files; allthree atmosphere source hashes match local sources. API online. No server configuration changes and no edits to unrelated dirty `/root/muvs` checkout.

Pre/post-deploy persistent data hashes match: catalogSHA256 `20e5fe92600ce22d6d094a1c3c876e664f8c89f764d048caf7d6b4d4d501e410` (21published tracks); sorted original/preview audio manifest `7dc0a48c382c2acf525d068d5f8f7873e22efc3ba5e5b39e2883cc905937426c`; general CMS `dc2d30237a353a3caa4460531bb5aa13aaf10e217ab3bdd1c22500aefa4b7523`. No data/audio/stat writes are part of this task. All local writes C:/Projects/Muvs, never OneDrive.
