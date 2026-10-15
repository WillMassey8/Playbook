# Drop-in WebView shell for `com.wymas.Playbook`

Copy these files into the Desktop / Xcode WebView app that loads
`https://playbook-pink.vercel.app`.

1. Add App Group (must match Share Extension) — e.g. `group.com.wymas.Playbook`
2. Enable Sign in with Apple on the App ID
3. Register `WKScriptMessageHandler` name **`playbook`**
4. Point `WKWebView` at production (or the PR preview URL while testing)

See also `/NATIVE_BRIDGE.md`.

Also copy `Playbook.entitlements.sample` → your target entitlements (Sign in with Apple + App Group).
