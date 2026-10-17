# App Group — must match or shares silently vanish

The Share Extension writes pending URLs into an App Group `UserDefaults` suite.
The WebView shell reads that same suite. **If the strings differ, share → Saved ✓
works, but reopen never shows the categorize overlay.**

| Target | Repo default |
|--------|----------------|
| `ios/Playbook` + `PlaybookShareExtension` | `group.com.playbook.app` |
| `ios/WebViewShell` (for `com.wymas.Playbook`) | `group.com.wymas.Playbook` |

## Morning check (2 minutes)

1. Open the **Share Extension** entitlements → copy the `com.apple.security.application-groups` string.
2. Set the **same** string in:
   - WebView shell entitlements
   - `WebShellAppGroup.id` in `SharedURLStore.swift`
3. Clean build → install → Share from X → reopen Playbook → categorize overlay appears.

Do **not** mix `group.com.playbook.app` and `group.com.wymas.Playbook` across the two targets you archive together.
