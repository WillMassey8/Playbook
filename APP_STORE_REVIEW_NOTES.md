# App Store Connect — Review Notes (paste)

**App:** Playbook / Play Save  
**Bundle ID:** `com.wymas.Playbook`

## What to test

1. Launch → Get Started → complete onboarding → sign in with Apple **or** email.
2. On a device with X/Twitter (or Safari open on an X post): Share → Playbook.
3. Share sheet shows **Saved to Playbook ✓** and dismisses (no categorize questions in the sheet).
4. Reopen Playbook → full-screen muted video of the shared clip → pick a category → Save.
5. Clip appears under that category in Playbook.
6. Profile → Privacy Policy / Terms open hosted pages.
7. Profile → Delete Account (type DELETE) removes the account and returns to sign-in.

## Demo account (if Apple Sign In is not yet live in reviewer’s region)

Email: _(create a TestFlight reviewer account morning-of and paste here)_  
Password: _(paste here)_

## Compliance notes for reviewers

- The Share Extension saves **URLs only**. We do **not** download or rehost third-party social video files into our storage (Guideline 5.2.3).
- In-app playback uses **official platform embeds** and, for X, **temporary muted CDN streams** resolved at view time.
- Creator attribution and a Source link to the original post are shown on clips.
- Account deletion is available in Profile (Guideline 5.1.1(v)).

## Privacy / Terms URLs

- Privacy: https://playbook-pink.vercel.app/privacy.html
- Terms: https://playbook-pink.vercel.app/terms.html
- Support: https://playbook-pink.vercel.app/support.html
