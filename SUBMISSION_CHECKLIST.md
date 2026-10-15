# Play Save — Submission morning checklist

Ship target: **WebView app `com.wymas.Playbook`** + native share extension.  
Web code: `preview/` on branch `cursor/share-intake-apple-auth-b3d2` (PR #5).  
Bridge contract: [`NATIVE_BRIDGE.md`](./NATIVE_BRIDGE.md).

**App Store Connect URLs (copy/paste):**
- Privacy: `https://playbook-pink.vercel.app/privacy.html`
- Terms: `https://playbook-pink.vercel.app/terms.html`

---

## 0) Unblock production (do first — blocks everything)

Preview (verified overnight): https://playbook-git-cursor-share-intake-a-c09719-will-masseys-projects.vercel.app  
Production `privacy.html` is **404 until Promote**.

1. Vercel → Deployments → open **latest** PR #5 / this branch commit
2. **Promote to Production** for `playbook-pink.vercel.app`
3. Confirm View Source shows a **new** JS hash (NOT `CK9iB24k`)
4. Confirm `/privacy.html` and `/terms.html` load
5. Force-quit the phone app and reopen

---

## 1) Merge + deploy web

```bash
# After review
git checkout main && git pull
git merge cursor/share-intake-apple-auth-b3d2
git push origin main
```

Vercel Root Directory must be `preview`. `preview/vercel.json` sets no-cache HTML.

---

## 2) Supabase

```bash
supabase db push
supabase functions deploy ingest-shared-url
supabase functions deploy resolve-playback-url
supabase functions deploy delete-account
```

**Sign in with Apple (dashboard):**
1. Apple Developer → Identifiers → App ID `com.wymas.Playbook` → enable Sign in with Apple  
2. Create Services ID + key for web/native as needed  
3. Supabase → Authentication → Providers → **Apple** → enable (client id + secret)  
Until Apple is enabled, email auth still works.

**Account deletion:** Profile → Delete Account calls `delete-account` (required for Apple review).

---

## 3) Native WebView shell (Xcode / Desktop Playbook)

Implement handlers in [`NATIVE_BRIDGE.md`](./NATIVE_BRIDGE.md):

| Direction | Payload |
|-----------|---------|
| Web → native | `{type:"signInWithApple"}` |
| Web → native | `{type:"requestPendingShares"}` |
| Web → native | `{type:"syncAuthToken", token}` — App Group JWT for Share Extension |
| Web → native | `{type:"categorizedIngested", urls}` |
| Native → web | `pb-apple-session` detail `{ idToken, nonce }` |
| Native → web | `pb-add-categorized` + `__pbPendingCategorized` |

App Group on shell **and** Share Extension must match (repo default `group.com.playbook.app`; wymas shell may use `group.com.wymas.Playbook` — keep both targets identical).

Then Archive → TestFlight (share extension with **Saved to Playbook ✓**).

---

## 4) Acceptance tests (phone)

1. Fresh install / update TestFlight  
2. Get Started → onboarding → Sign in (Apple or email)  
3. From X: Share → Playbook → see **Saved to Playbook ✓**  
4. Reopen app → **full-screen video** + categorize → Save to Playbook  
5. Clip appears in Playbook category  
6. Kill app, reopen → clip still there (Supabase session + ingest; web merges remote plays)  
6b. Categorized clip keeps its play type on reopen (ingest resolves `category_name` → UUID)  
7. Profile → Privacy Policy / Terms open hosted pages  
8. Profile → Delete Account (type DELETE) removes account / returns to auth  

Dev without native: `?shareTest=1` on the web origin.

---

## 5) App Store Connect notes

- Privacy Policy URL: `https://playbook-pink.vercel.app/privacy.html`  
- Terms URL: `https://playbook-pink.vercel.app/terms.html`  
- Sign in with Apple if Apple login is offered  
- Account deletion in Profile (edge function `delete-account`)  
- Review notes: share extension saves links only; playback uses official embeds / temporary streams; no rehosted social files in Storage  
