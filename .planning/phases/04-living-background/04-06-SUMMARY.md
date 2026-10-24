# 04-06 — Compatible server security patches

## Complete — local and production verification

The server lockfile was unchanged since 2026-09-27, but a fresh 2026-10-24 production audit reported four high findings and one critical finding. `body-parser` compressed-body parsing runs before authentication; the new process-crash advisory therefore warranted the AGENTS security deviation. No exploit request was sent to production.

Resolved updates, all within the original constraints:

- `express@5.2.1 -> body-parser` 2.3.0 -> 2.4.0: [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828).
- `compression` 1.8.1 -> 1.8.2: [GHSA-vc2v-76pw-4v95](https://github.com/advisories/GHSA-vc2v-76pw-4v95).
- `multer` 2.4.0 -> 2.5.0: [GHSA-q7qp-rjg7-q26m](https://github.com/advisories/GHSA-q7qp-rjg7-q26m).
- `express@5.2.1 -> proxy-addr` 2.0.7 -> 2.0.8: [GHSA-jqcg-44mw-7w3h](https://github.com/advisories/GHSA-jqcg-44mw-7w3h). Existing named loopback trust does not use the advisory's vulnerable subnet form.
- `sharp` 0.35.4 -> 0.35.5: [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w), plus matching platform bindings 0.35.5/libvips packages 1.3.4. Local native smoke check reports librsvg 2.63.2 and successfully round-trips an in-memory WebP.

Expected supporting changes: body-parser's nested content-type 2.0.0 -> 2.1.0, qs 6.16.0 -> 6.16.1, and compression's destroy@1.2.0 dependency. Express, archiver, ffmpeg-static and direct `package.json` constraints remain unchanged. No major/force upgrades, application-source, data or configuration edits. All changed resolved URLs use `https://registry.npmjs.org` with SHA-512 integrity; no install-script markers were added.

Commands/results:

- `npm update compression multer sharp body-parser proxy-addr --ignore-scripts`: compatible lockfile update, audit zero.
- Reproducible `npm ci --ignore-scripts`: succeeds; intentionally skipped the existing ffmpeg-static installer, so its local binary was restored with `npm rebuild ffmpeg-static --foreground-scripts`. No lockfile change from that restoration.
- `npm audit --omit=dev --json`: zero known vulnerabilities, 167 production dependencies, zero development dependencies.
- `node --test server/*.test.js`: 19/19 pass after local FFmpeg restoration, including two new isolated regression tests. The parser child process binds only ephemeral loopback, handles valid/malformed/trailing gzip and subsequent valid requests; trust checks reject public IPv4/mapped IPv6. No persistent site API/data is imported by the new tests.
- Root full frontend/media/backend/helper suite:277/277 pass. Scoped new-test ESLint clean; no changes to frontend dependencies or the verified film bundle.
- Lockfile root/constraint equality, changed registry/SRI/script-marker assertions and `git diff --check` pass.

Independent review verified all34changed lock entries against their parents' existing ranges and official npm registry tarball URLs/SHA512. Install-script markers and Node engine requirements are unchanged. `npm ls` is clean; independent audit reports0.

## Publication

Functional commit`f9010c7`, verified live `/var/www/muvs-releases/f9010c77440a` through the existing atomic deployment. Production Linux audit independently reports0known server vulnerabilities. Runtime actually resolves compression1.8.2, multer2.5.0, Express's body-parser2.4.0/proxy-addr2.0.8 and Sharp0.35.5/librsvg2.63.2; in-memory native WebP conversion succeeds (44bytes), no image/file persisted.

Fresh live library with real unmocked public API:21tracks, GET payload42317bytes, playing dust overlay, no page errors. Public general CMS GET succeeds/hashunchanged. Verified frontend main/shared JS hashes remain exactly the04-05 values (`a57b6e5f...`/`5dd348ce...`), so the reviewed film runtime is unchanged by the server patch. No production upload, audio playback/export or analytics event was generated; no exploit request was sent to production.

Persistent invariance after publication: generalCMS`dc2d30237a353a3caa4460531bb5aa13aaf10e217ab3bdd1c22500aefa4b7523`, catalog`20e5fe92600ce22d6d094a1c3c876e664f8c89f764d048caf7d6b4d4d501e410`, full absolute-path asset manifest`c79ccdfad11557675e27cd51f8cc2eff4b81e6fee211c624ce172c7e8aced2e3`, matching pre-publication baselines. Original dependency constraints, application source, site data, server configuration and unrelated applications remain unchanged. Existing frontend audit debt and duplicate-nginx/large-bundle warnings are separate deferred issues; zero-server-audit is not an assertion of whole-site security.

No required work remains in04-06. All project edits underC:/Projects/Muvs, never OneDrive.
