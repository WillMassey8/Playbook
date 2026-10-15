# Native WebView bridge — `com.wymas.Playbook`

Ship path: native WKWebView shell loads `https://playbook-pink.vercel.app` + Share Extension.

Web implementation: `preview/src/lib/nativeBridge.ts`.

**Drop-in Swift:** `ios/WebViewShell/` (`PlaybookWebBridge.swift`, `PlaybookWebViewController.swift`, `SharedURLStore.swift`).

## Message handler

Register `WKUserContentController` handler named **`playbook`**.

```swift
config.userContentController.add(self, name: "playbook")
```

## Web → native

| `type` | Payload | Native action |
|--------|---------|---------------|
| `signInWithApple` | — | Run `ASAuthorizationAppleIDProvider`. On success dispatch `pb-apple-session` with `{ idToken, nonce }`. On cancel/fail dispatch `{ error }`. |
| `requestPendingShares` | — | Peek App Group queue → inject (do not clear until `categorizedIngested`). |
| `syncAuthToken` | `token: string \| null` | Save/clear JWT in App Group (`pendingUserToken`) for Share Extension. |
| `categorizedIngested` | `urls: string[]` | Remove those URLs from the App Group queue. |
| `purchase` / `restore` | `plan?` | StoreKit (optional for v1 free). |

## Native → web

Inject JS (main frame) after load **and** whenever shares arrive:

### Apple session

```javascript
window.dispatchEvent(new CustomEvent('pb-apple-session', {
  detail: { idToken: '...', nonce: '...' }
}));
```

Web calls `supabase.auth.signInWithIdToken({ provider: 'apple', token: idToken, nonce })`.
Do **not** send a Supabase access token from native — identity token + nonce only.

### Pending shares (inbox → full-screen categorize)

```javascript
window.__pbPendingCategorized = [{ url: 'https://x.com/...' }];
window.dispatchEvent(new CustomEvent('pb-add-categorized', {
  detail: { items: window.__pbPendingCategorized }
}));
```

Bare `{ url }` (no `categoryId`) opens the full-screen categorize overlay.

## App Group (Share Extension)

Must match the Share Extension entitlements exactly:

- Default in this repo’s native targets: `group.com.playbook.app`
- If the WebView shell uses `com.wymas.Playbook`, create/use a matching group
  (e.g. `group.com.wymas.Playbook`) on **both** the shell and the Share Extension.

Keys:

| Key | Purpose |
|-----|---------|
| `pendingShareURLQueue` | `[String]` queue of shared URLs |
| `pendingShareURL` | legacy single URL |
| `pendingUserToken` | Supabase access JWT from `syncAuthToken` |

Share Extension behavior (already in `ios/PlaybookShareExtension`): enqueue URL → show **Saved to Playbook ✓** → dismiss. No categorize UI in the sheet.

## Minimal handler sketch

```swift
func userContentController(_ ucc: WKUserContentController,
                           didReceive message: WKScriptMessage) {
    guard message.name == "playbook",
          let body = message.body as? [String: Any],
          let type = body["type"] as? String else { return }

    switch type {
    case "signInWithApple":
        startAppleSignIn() // dispatch pb-apple-session when done
    case "requestPendingShares":
        let urls = SharedURLStore.consumePendingURLs()
        injectPendingShares(urls)
    case "syncAuthToken":
        if let token = body["token"] as? String, !token.isEmpty {
            SharedURLStore.saveUserToken(token)
        } else {
            SharedURLStore.clearUserToken()
        }
    case "categorizedIngested":
        break // queue already drained on requestPendingShares; optional ack
    default:
        break
    }
}

func injectPendingShares(_ urls: [URL]) {
    let items = urls.map { ["url": $0.absoluteString] }
    guard let data = try? JSONSerialization.data(withJSONObject: items),
          let json = String(data: data, encoding: .utf8) else { return }
    let js = """
    window.__pbPendingCategorized = \(json);
    window.dispatchEvent(new CustomEvent('pb-add-categorized', {
      detail: { items: window.__pbPendingCategorized }
    }));
    """
    webView.evaluateJavaScript(js, completionHandler: nil)
}
```

## QA

1. Production HTML must not reference purged hashes (confirm View Source).
2. `?shareTest=1` on the web origin simulates intake without the extension.
3. After Sign in with Apple / email, confirm Share Extension can read JWT (optional server ingest) and always shows **Saved to Playbook ✓**.
