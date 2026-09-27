# State

2026-09-27: Dubplates implemented from clean main `50cb262`. Backend commit `97b2509`, library/admin commit `6acd583`. Separate DATA_DIR storage prevents general DB overwrites. Four helper tests and five backend suites pass; scoped ESLint/build pass. Browser desktop/mobile and real ZIP download verified. Admin error/recovery tests pass. Deployment is next via existing atomic release and a narrowly scoped nginx include.

User follow-up implemented: gyroscope events, permission prompts, camera tilt, layer parallax and obsolete admin controls removed. Mouse/touch/swipe and camera stops preserved (code equality checked). Browser instrumentation records zero sensor subscriptions. Combined build passes. Deploy together with Dubplates.

No existing .planning directory existed before this task. Do not infer that older website features have passed current regression tests.

Production `4070347d1ed8` verified: library200, admin401, HTML noindex, empty catalog, main menu works and zero gyro listeners; existing public CMS payload SHA256 unchanged. Final proxy hardening: trust official Cloudflare ranges only for this API and lower audio limit to95MB for baseline CDN compatibility. Frontend dependency audit warnings predate this feature; server audit is clean.
