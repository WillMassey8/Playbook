# Play Save — Submission morning checklist

Ship target: **WebView app `com.wymas.Playbook`** + native share extension.  
Web code: `preview/` on branch `cursor/share-intake-apple-auth-b3d2` (PR #5).

---

## 0) Unblock production (do first — blocks everything)

Production previously served stale HTML pointing at purged `index-CK9iB24k.js`.

1. Vercel → Deployments → open latest PR #5 / this branch commit (or merge to `main` then deploy)
2. **Promote to Production** for `playbook-pink.vercel.app`
3. Confirm View Source shows a **new** JS hash (NOT `CK9iB24k`)
4. Force-quit the phone app and reopen

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
```

**Sign in with Apple (dashboard):**
1. Apple Developer → Identifiers → App ID → enable Sign in with Apple  
2. Create Services ID + key for web/native as needed  
3. Supabase → Authentication → Providers → **Apple** → enable (client id + secret)  
Until Apple is enabled, email auth still works.

---

## 3) Native WebView shell (Xcode / Desktop Playbook)

Must implement bridge handlers:

| Direction | Payload |
|-----------|---------|
| Web → native | `{type:"signInWithApple"}` |
| Web → native | `{type:"requestPendingShares"}` |
| Web → native | `{type:"categorizedIngested", urls}` |
| Native → web | `pb-apple-session` detail `{ idToken, nonce }` |
| Native → web | `pb-add-categorized` + `__pbPendingCategorized` |

Then Archive → TestFlight (share extension with **Saved to Playbook ✓**).

---

## 4) Acceptance tests (phone)

1. Fresh install / update TestFlight  
2. Get Started → onboarding → Sign in (Apple or email)  
3. From X: Share → Playbook → see **Saved to Playbook ✓**  
4. Reopen app → **full-screen video** + categorize → Save to Playbook  
5. Clip appears in Playbook category  
6. Kill app, reopen → clip still there (Supabase session + ingest)

---

## 5) App Store Connect notes

- Privacy Policy URL (required)  
- Sign in with Apple if Apple login is offered  
- Account deletion already in profile UI  
- Review notes: share extension saves links only; playback uses official embeds / temporary streams; no rehosted social files in Storage  

---

## Done when

- [ ] Production JS hash is new  
- [ ] Share → Saved ✓  
- [ ] Reopen → full-screen categorize  
- [ ] Clip persists after relaunch  
- [ ] TestFlight build submitted  
