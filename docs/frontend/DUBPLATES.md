# Dubplates UI contract

Project stage: finished artist site, additive library surface. Core users: invited producers and friends; core objects: track, release/EP, audio master, selected tracks. Entry: direct shared URL, not public navigation. First decision: find or audition a track. Success: listen, select, download correct-format ZIP. Recovery: retry load/play/export, clear filters; preserve selection. Mobile primary actions: play and export.

Temperament: a quiet music library, not a marketing landing page. Keep existing React, Urbanist and icon system; native form controls and audio provide the interaction foundation. References: existing MUVS identity and the user's SoundCloud-style seekable waveform pattern. Do not show storage paths, job identifiers, fake waveforms or invented release content.

Palette: graphite #696969, middle gray #a3a3a3, mist #d8d8d8, paper #f3f3f3, ink #171717, existing accent #ccff00. Urbanist 400–800, tabular timing numerals. Left-aligned typography, generous side gutters, square covers and calm dividing rows. No 3D canvas or auto-playing effects on this route.

Layout: small logo/site link; compact Dubplates heading; sticky search/type/genre/EP/BPM/sort toolbar; selection strip and waveform rows; fixed compact player/export dock. Mobile condenses filters behind a disclosure and puts waveform below track metadata. Export modal lists availability and requires a deliberate format/download action. Selection survives filters, with a count explaining hidden selections.

Risks: fixed chrome obscures final row, sticky toolbar consumes small screens, multiple audio elements play simultaneously, WAV exports buffer huge blobs, filters silently lose selection, lossy uploads offered as lossless, admin failed saves reported as success. Verify all explicitly. Test loading/empty/no-results/error, long labels, keyboard focus, reduced motion, desktop and mobile screenshots, actual ZIP contents and audio Range responses.

Design review: retain the requested grayscale rather than introduce a dashboard card grid. Waveforms are the distinctive element; all motion responds to user actions. Uppercase limited to the existing MUVS wordmark and standard MP3/WAV/BPM labels.
