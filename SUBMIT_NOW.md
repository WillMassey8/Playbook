# SUBMIT NOW — wake-up card

**PR:** https://github.com/WillMassey8/Playbook/pull/5  
**Branch:** `cursor/share-intake-apple-auth-b3d2`  
**Full steps:** `MORNING_RUNBOOK.md`

## Blockers only you can clear

| # | Action | Done when |
|---|--------|-----------|
| 1 | Vercel → latest PR deploy → **Promote to Production** | `playbook-pink.vercel.app/privacy.html` returns 200 (not 404) |
| 2 | `supabase functions deploy ingest-shared-url` + `resolve-playback-url` + `delete-account` | functions list shows all three |
| 3 | Enable Apple provider (if offering Sign in with Apple) | Apple button works on device |
| 4 | Drop `ios/WebViewShell/` into `com.wymas.Playbook` + matching App Group + `PrivacyInfo.xcprivacy` | Share → Saved ✓ → reopen categorizes |
| 5 | Archive → TestFlight → phone acceptance | Checklist §4 green |
| 6 | Create a reviewer demo account → paste into `APP_STORE_REVIEW_NOTES.md` | ASC Review Notes complete |

## Paste into App Store Connect

- Privacy: https://playbook-pink.vercel.app/privacy.html  
- Terms: https://playbook-pink.vercel.app/terms.html  
- Support: https://playbook-pink.vercel.app/support.html  
- Export compliance: **No** (uses only exempt encryption / HTTPS)  
- Review notes: `APP_STORE_REVIEW_NOTES.md`  
- Listing: `APP_STORE_LISTING.md` · Age: `APP_STORE_AGE_RATING.md` · Shots: `APP_STORE_SCREENSHOTS.md`

## Already green (do not redo)

- Preview deploy + privacy/terms/support (`index-B9bj2WA3.js`)
- Share intake, Apple bridge contract, delete-account code, openURL, embed navigation
- Privacy Manifest sample (`ios/WebViewShell/PrivacyInfo.xcprivacy`)
- Vercel CI on PR

## Status snapshot (2026-10-16 22:32 UTC)

- Production: still `index-NwAGEV6c.js`, privacy/terms/support **404** → **Promote required**
- Preview: green (privacy/terms/support 200)
- PR #5 CI: green
- Agent code path: complete — remaining work is dashboard-only (Promote, Supabase deploy, WebViewShell/TestFlight, ASC)
