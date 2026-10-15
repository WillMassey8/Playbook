# Morning — 15-minute submission unblock

**TL;DR card:** [`SUBMIT_NOW.md`](./SUBMIT_NOW.md)

Do these in order. Details: `SUBMISSION_CHECKLIST.md`.

## 0. Smoke-test Preview (already green)

https://playbook-git-cursor-share-intake-a-c09719-will-masseys-projects.vercel.app

Confirm `/privacy.html`, `/terms.html`, and `?skip=1&shareTest=1` intake.

## 1. Promote web (blocks phone testing)

Vercel → Playbook → Deployments → latest **PR #5** → **Promote to Production**  
Confirm https://playbook-pink.vercel.app View Source JS ≠ `CK9iB24k`  
and https://playbook-pink.vercel.app/privacy.html loads.

As of latest check: production is still on stale `index-NwAGEV6c.js` and privacy/terms/support are **404 until Promote**.


## 1b. Optional: TestFlight before Promote

If you need phone testing before Production Promote, temporarily point the
WebView `startURL` at the Preview deploy:

`https://playbook-git-cursor-share-intake-a-c09719-will-masseys-projects.vercel.app`

Then switch back to `https://playbook-pink.vercel.app` after Promote.

## 2. Supabase functions

```bash
supabase functions deploy ingest-shared-url   # includes category-preserve + URL canonicalize
supabase functions deploy resolve-playback-url
supabase functions deploy delete-account
```

Enable **Apple** provider if Sign in with Apple is offered.

## 3. WebView shell (Desktop Playbook / Xcode)

Drop in `ios/WebViewShell/` (see `NATIVE_BRIDGE.md`; entitlements sample included):

- Handler name: **`playbook`**
- `signInWithApple` → `pb-apple-session` `{idToken,nonce}`
- `requestPendingShares` → peek queue → `pb-add-categorized`
- `syncAuthToken` → App Group JWT
- `categorizedIngested` → remove acked URLs

Match App Group on shell **and** Share Extension (`group.com.wymas.Playbook` or your existing group).

Archive → TestFlight.

## 4. Phone acceptance

Share from X → **Saved to Playbook ✓** → reopen → categorize → persists → Delete Account works.

## App Store Connect paste

- Privacy: https://playbook-pink.vercel.app/privacy.html
- Terms: https://playbook-pink.vercel.app/terms.html
- Support: https://playbook-pink.vercel.app/support.html
- Review notes: `APP_STORE_REVIEW_NOTES.md`
- Age rating: `APP_STORE_AGE_RATING.md`
- Screenshots: `APP_STORE_SCREENSHOTS.md`
- Listing copy: `APP_STORE_LISTING.md`

**PR:** https://github.com/WillMassey8/Playbook/pull/5
