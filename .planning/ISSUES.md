# Deferred existing issues

- Updated05-01: production frontend/server dependency audits are both0 after compatible lock patches. All-tree frontend tooling still has26 findings (20high/4moderate/2low), no critical. Review tooling upgrades separately; do not force-upgrade the live3D stack.
- Resolved05-01: exact duplicate enabled Nginx backup vhost moved recoverably outside sites-enabled; syntax clean and unrelated app locations/includes preserved.
- Existing3D large bundle and scoped lint issues remain. Dubplates uses a separate lightweight entry and does not fetch the3D bundle.
- Resolved05-01: measured phone-only Code title/subtitle/caption fit prevents the inherited320px clipping, including Vibe Production. All five projects checked at320px,390px and desktop resize/reset; fonts, text, stored positions and desktop scale preserved.
- Resolved05-01: rejected unauthenticated visit/stat writes and public IP geolocation removed. Dashboard labels retained statistics as historical; new general-site analytics would require an explicitly scoped privacy-conscious endpoint. Dubplates insights remain active/private.

## November launch follow-up — 05-01

- Owner gate: Cloudflare still caches the old HTML response for exact `/robots.txt`; fresh query/origin returns the corrected text. No scoped Cloudflare credential or available integration was found. Purge exactly `https://muvs.dev/robots.txt` and recheck the public URL before Search Console submission; never advertise Dubplates in robots/sitemap.
- Owner content: Veiled has three intentional missing audio placeholders. Confirm Shanti Roko's current `Deep Rhythm (premaster)` filename is the intended audio. Replace/hide published Mixes `Test` and correct its metadata; review About's Live/Bio references. Keep unfilled News/CV/Lecture outside the index.
- Recovery: full daily local archive and isolated live-data restore are verified. An off-host destination and external alert recipient are not configured; local backups/logs do not protect against host loss or guarantee somebody sees failures.
- Security: old tracked DB/uploads removed from the public Git tip; Git history still contains the legacy DB/PIN. A private comparison confirmed it is not the active PIN. Rotate it anywhere it was reused; history rewrite would need an explicit owner decision.
- Operations: API still runs as root on loopback, inherited from the existing shared host. Dedicated service-user migration is a separate coordinated task, not a claim of complete host hardening.
- Performance: preserve the artist's intentional intro/video/3D identity, but the scene remains heavy on weak4G/slowCPU. Further large wins require progressive scene/media architecture and real-device/field measurements, not loader-only LCP claims.
