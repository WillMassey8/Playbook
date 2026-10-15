# Share Extension checklist (WebView shell)

The quiet share UI already lives in `ios/PlaybookShareExtension/ShareViewController.swift`.

When wiring `com.wymas.Playbook`:

1. Share Extension App Group **must equal** `WebShellAppGroup.id` in `SharedURLStore.swift`
2. Activation rules: WebURL + WebPage + Text (see Share Extension Info.plist)
3. On success always show **Saved to Playbook ✓** then dismiss — never silent fail
4. Enqueue URL via `SharedURLStore.enqueuePendingURL` even if server ingest fails
5. Optional: read JWT from App Group (`pendingUserToken`) for best-effort `ingest-shared-url`
