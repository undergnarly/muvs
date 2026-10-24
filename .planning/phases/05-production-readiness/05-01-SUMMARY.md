# 05-01 — Production readiness, 2026-10-25

## Outcome / signoff boundary

Production changes are implemented and the functional release is published/verified. The public CDN still serves an older cached HTML response at the exact `/robots.txt` URL. Origin and a fresh query return the corrected plain-text robots. No scoped Cloudflare credential or available integration exists in this task, so **exact-URL purge is an owner gate**, not a completed SEO signoff. No indexing/ranking guarantee is made.

Working checkout: `C:/Projects/Muvs`, never OneDrive. Baseline `34564ae`. Final measured live functional release `02a4a5dd2b3a`; metadata-only publication does not change these assets.

## Measurements

Same owned native Chrome, fresh browser cache with normal reuse inside each visit, 390×844/DPR3 mobile emulation. Primary profile: 1.6Mbps down, 0.75Mbps up, 150ms latency and 4× CPU slowdown. Two cold runs before and two after. No concurrent build/backup/Lighthouse during primary timings. This is a controlled lab, not a physical Xiaomi, field75th percentile, INP result or load-capacity test.

| Measurement | Before | Final02a4a5d |
| --- | --- | --- |
| Complete usable3D scene, cold weak4G |17.54 /17.75s |11.42 /11.58s |
| Visible logo/spray |0.97 /0.82s |1.06 /0.98s |
| HTML TTFB |198 /205ms |245 /144ms |
| First-load owned JS, actual wire bytes |~923KB |~726KB (−21.3%) |
| Three required poster files |1,106,376B |390,656B (−64.7%) |

Fast-network/normal-CPU cold run: scene3.52s, logo0.26s. Much of this minimum is the retained intentional intro/dive. Weak4G scene readiness improved about35% (median17.64→11.50s), but **11–12seconds is still heavy**. Large future wins require progressive scene/media architecture and device/field evidence, not disguising the wait with a loader.

LCP is principally the loader logo, **not** the completed3D scene. Measured readiness is actual splash removal after the artwork readiness/departure sequence. HTTP(S)-only transfer accounting excludes inline `data:` fonts. Media transfer totals at35s are not a claim that every video is completely downloaded. No synthetic FPS score is presented as phone performance.

Lighthouse13.5.0, same default simulated mobile CLI, one baseline and one final-release run: Performance84→81; Accessibility100→100; Best Practices96→100; SEO82→92. TTI12.30→10.85s; TBT556→599ms; LCP1.34→1.43s; CLS0→0.030 (controlled35s cold runs themselves bothCLS0). Do not hide the slightly lower overall performance score: CPU/3D initialization and media remain substantial, despite faster measured scene readiness. An intermediate50d9fac audit was71/TBT1534ms before hidden details were deferred; its separate artifact is retained rather than substituted for the final result. SEO's remaining failed audit is the stale public CDN robots response. Source maps/unused code/media weight also remain tooling/performance findings. Neither score implies complete manual accessibility/security coverage.

Raw local evidence (ignored from Git): `output/production-readiness/browser-measurements.json`, `before-lighthouse.*`, intermediate `after-lighthouse.*`, `final-lighthouse.*`, admin fixtures/reports and mobile/desktop/failure screenshots. Controlled measurements exclude concurrent builds/backup/audits; preserve all runs and do not compare disabled-cache stress runs as ordinary cold visits.

## Implemented

- Start AppRoot import after confirmed logo/spray paint, in parallel with CMS/provider work. Build-derived modulepreload starts at that same event, matches import credentials and fetches once. Exactly six required decoration images warm at low priority. Direct Dubplates never fetches the main3D entry/CMS.
- Split six optional legacy routes from the initial scene; keep recovery Music/Mixes/Code paths available. Retain all supplied videos, alpha masks, backgrounds, effects, fonts, loader opacity and user presets. Smaller q90 WebP posters retain exact720² alpha bytes; original artwork remains available.
- Stop settled DOM interpolation RAFs and invisible duplicate particle work; reuse scratch math objects. Defer heavy hidden section details until accepted first entry and retain them on return/reentry. Eager cover shell is outside the deferred font boundary.
- Public HTML/head uses current allowed CMS content: real per-route title/description/canonical, OG/Twitter/schema, semantic fallback, crawlable links, no-JS reading and true404. Scene URL/head changes stay aligned without remounting the experience. Empty auxiliary pages remain noindex/off sitemap. Robots/sitemap are generated from current public data; **Dubplates is never advertised**.
- Confirm all admin writes before committing local state/closing drafts. HTTP401/500/network errors retain drafts and show focused retry feedback; pending forms cannot double-submit. News settings now persist, legacy malformed stats do not crash Dashboard, and login reloads authenticated provider data. Expired sessions can be renewed in another tab without losing the draft.
- Remove rejected public stats writes and external IP geolocation. Keep genuine private Dubplates insights, with no test plays/downloads on production. Historical general-site statistics are labeled honestly.
- Fix menu focus trapping/return/Escape, inert closed content, stable accordion controls/links, accessible login and real player row/seek keyboard controls. Replace the unused legacy contact form's fake success with actual configured contact links. Sanitize all rich-HTML sinks with an inert allowlist; attack-fixture native tests verify no execution/request side effects.
- Typography quality gate found inherited phone clipping: Code titles/subtitles now use measured glyph bounds and perspective-safe uniform downscaling only when necessary; captions use observed local bounds. All five projects fit320px,390px and restore their original desktop scale. No new font, title wrapping, stored-position changes, extra RAF or per-frame DOM measurements.
- Patch compatible production dependency findings without force upgrades. Fresh frontend production audit0 and server audit0. All-tree frontend development tooling still has26 findings (20high/4moderate/2low); no critical. Whole-repository lint is not clean, but changed source adds no findings against its baseline.
- Remove historically tracked DB/uploads from the public Git tip, keeping local files and existing ignore rules. **History still contains the old DB/PIN**; private comparison confirmed it is not the active PIN. Rotate it if reused elsewhere. No history rewrite/credential reset was performed without an owner decision.

## Operations and recovery

- Correct data directory0777→0755 and DB0644→0600, preserving root writer and Nginx media traversal. This closes replacement of a root-executed backup script via a world-writable parent. No broad ownership/chmod migration.
- Guarded deploy builds before atomic switch, changes only named `muvs-api`, verifies exact candidate/API/origin and rolls back on failure. PM2's retained old absolute script-path issue is explicitly handled. Five validated releases retained, current+previous protected; only obsolete build directories pruned, recoverable from Git. Persistent data never reverted.
- Merge only artist-site Nginx locations/snippets. Every unrelated application route/include is preserved byte-for-byte. Move the exact duplicate backup vhost recoverably outside `sites-enabled`; clean `nginx -t`. Scoped CSP allows required inline loader, Troika blob workers/data fonts and real embeds, without `unsafe-eval`; authenticated JSON no-store, hash assets immutable, stable art refreshable, uploads no-transform, canonical www redirect and hidden/missing files404.
- Existing MUVS backup schedule now creates full private archives, retention7; separate5-minute local health log never restarts apps. Other cron/legacy8080 checks are unchanged. There is **no external alert recipient or off-host backup**.
- Full actual live-data archive verified: `/var/backups/muvs-site/muvs-site-20261024T195350Z.tar.gz`,1,451,658,338B, SHA256 `edf5d73145431359e9278efe2561da92627bf38baa9bf6f012c8df2c437cb761`. Directory0700; archive/checksum0600.
- Isolated root-private restore, not over live data:219 safe members,191 files/1,480,801,142B, five valid JSON documents,21tracks/22assets,43WAV/MP3 format references and12CMS upload references. Every restored byte hash matches fresh source-before and source-after. Receipt: `/root/muvs-restore-verify-20261024T195339Z-tkFXne/receipt.json`. No production writes or audio HTTP/events.
- Live CMS/DB/catalog/analytics/all audio assets unchanged; active runtime remained healthy through recovery checks. API remains root on loopback (inherited shared-host setup); service-user migration is separate. Disk after retained restore79%/43GiB free. TLS renewal timer active; certificate expires2027-01-09. Local API response sampling3–7ms indicates client payload/initialization, not this small server sample, is the first-load bottleneck; this is not a concurrency stress test.

Operational instructions and rollback compatibility boundary: `docs/PRODUCTION-OPERATIONS.md`.

## Verification

Final source:437 tests/433pass/4platform-or-opt-in skips,0fail; production build. Strengthened final phone-fit/entry helper tests6/6. Separate native Linux12/12 operational tests include actual isolated PM2 success/rollback and archive extraction; native sanitizer27DOM assertions/10malicious inputs. All current15public CMS image/audio references return200. Changed-file lint signatures remain at/below baseline, not a whole-repository clean-lint claim.

Native Chrome QA covers320/390/1440, menu accordion/Escape/focus, real swipes/keyboard, actual selected Music/Mixes/Code video progression, deep route/head/canonical synchronization, first entry/return/reentry, no-JS release, unknown404, blocked media/poster fallback, final CSP and isolated admin confirmed-save/error/retry/login. No production test saves/downloads/listens. Physical Android/iOS/Safari and field CWV are not verified.

Final functional receipt20:07:44UTC: correct absolute PM2 entry/cwd in02a4a5dd2b3a, PID581166 online/restarts0; scheduled local health success20:05, clean Nginx syntax with no duplicate-host warnings. Published entry/AppRoot/CSS hashes match the locked local build. Public CMS SHA256 remains `78a0703e266fccd5acbbecc4de4e35b83c4950b007d43d87957336773bd46e8b`; private DB/catalog/analytics match original audit/verified archive. No owner-data drift or production test activity.

## Owner actions before promotion

1. Purge exactly `https://muvs.dev/robots.txt` in Cloudflare; verify public plain text, then verify Search Console ownership and submit `https://muvs.dev/sitemap.xml` through the owner's account. Do not submit Dubplates.
2. Veiled: upload or intentionally hide the three missing audio placeholders; confirm Shanti Roko currently pointing to a file named `Deep Rhythm (premaster)` is correct. Fill intended streaming links.
3. Replace/hide published Mixes `Test`; fill its description/date (recordDate is currently`1`). Review About references to Live/Bio. Keep unfinished News/CV/Lecture outside the index until real content exists.
4. Choose an off-host backup destination and, if wanted, an external failure-alert recipient. Local recovery is verified but cannot survive complete host/disk loss.
5. Before paid promotion, test a real phone on normal and constrained mobile internet. Decide whether preserving the complete3D entrance is worth the remaining weak-network wait; progressive loading would be a separate measured improvement, not a promise of instant performance.

## Commits

`7af5c21` startup/public safety; `7a430b2` confirmed admin persistence; `ad8ea9f` SEO documents/operations; `e7d158e` stop tracking data snapshots; `50d9fac` loader-painted critical preload; `d91e53b` hidden-detail first-entry latch; `02a4a5d` measured phone typography. Final metadata commit follows these verified functional commits.

## Method references

Lighthouse is a lab audit, not field/device coverage: [Chrome documentation](https://developer.chrome.com/docs/lighthouse/overview). Separate first-scene readiness from the standard metrics and do not invent field INP: [Core Web Vitals](https://web.dev/articles/vitals). Current public HTML/links/statuses complement, rather than replace, the interactive app: [Google JavaScript SEO guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).
