# Morning — 15-minute submission unblock

Do these in order. Details live in `SUBMISSION_CHECKLIST.md`.

## 1. Promote web (blocks phone testing)
Vercel → Playbook → Deployments → latest **PR #5** commit → **Promote to Production**  
Confirm View Source JS ≠ `CK9iB24k` and https://playbook-pink.vercel.app/privacy.html loads.

## 2. Supabase functions
```bash
supabase functions deploy ingest-shared-url
supabase functions deploy resolve-playback-url
supabase functions deploy delete-account
```
Enable **Apple** provider if Sign in with Apple is offered.

## 3. WebView shell (Desktop Playbook / Xcode)
Implement handlers in `NATIVE_BRIDGE.md`, especially:
- `signInWithApple` → `pb-apple-session` `{idToken,nonce}`
- `requestPendingShares` → `pb-add-categorized`
- `syncAuthToken` → App Group JWT

Archive → TestFlight.

## 4. Phone acceptance
Share from X → **Saved to Playbook ✓** → reopen → categorize → persists → Delete Account works.

## Paste into App Store Connect
- Privacy: https://playbook-pink.vercel.app/privacy.html
- Terms: https://playbook-pink.vercel.app/terms.html
- Review notes: `APP_STORE_REVIEW_NOTES.md`

**PR:** https://github.com/WillMassey8/Playbook/pull/5
