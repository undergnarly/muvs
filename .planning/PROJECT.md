# MUVS

Existing artist / creative-development website at muvs.dev. Worktree: C:\Projects\Muvs (never OneDrive). Preserve existing public releases, 3D navigation, admin data and unrelated server applications.

Visual direction2026-10-24: preserve gray-to-white gradients and sculptural artwork, add fine photographic grain and sparse slow suspended white dust at multiple apparent depths. Shared lightweight CSS/DOM atmosphere, not another WebGL scene; quieter behind Dubplates content. Keep navigation/captions/player readable, respect reduced-motion/Save-Data/hidden tabs, and do not compromise priority logo/spray startup. See phase04-01 summary for verified implementation.

## Active addition: Dubplates

Unlisted, password-free track library for producers and friends at `/dubplates`. No public navigation or sitemap entry. Noindex is discovery control, not access control; anyone with a URL can share/download published tracks. Admin-only publishing through `/admin/dubplates`.

Browse/search/filter by title/artist, type, genre, BPM and EP/release; sort newest/oldest/title/BPM. Real waveform seeking, one audio player, persistent selection and WAV/MP3 ZIP export. WAV masters generate MP3 previews/downloads; MP3 uploads never masquerade as lossless WAV. Keep track data and masters separate from the site's general public data payload.

2026-10-18: Multiple tags and optional Sketch/Mixed/Mastered stage, whole-source integrated LUFS-I (measurement only), internal owner rating0–10 omitted from public payloads. Default ZIP or direct single-file downloads use Artist - Title without index prefixes. Admin-only aggregate completed-download/qualified-listen activity helps compare track interest; no individual producer identification or historical reconstruction. Private analytics is a separate atomic persistent store. Existing21tracks/22assets preserved and measured; details in phase03 summary and docs/DUBPLATES.md.
