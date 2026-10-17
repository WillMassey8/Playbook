# App Store Connect — App Privacy (nutrition labels)

Match `ios/WebViewShell/PrivacyInfo.xcprivacy`. Update if you add analytics/ads later.

## Tracking

- **Do you or your third-party partners track users?** → **No**

## Data collection

| Data type | Collected? | Linked to identity? | Used for tracking? | Purposes |
|-----------|------------|---------------------|--------------------|----------|
| Email Address | Yes (account) | Yes | No | App Functionality |
| User ID | Yes (Supabase auth id) | Yes | No | App Functionality |
| Product Interaction | Yes (saved plays / categories) | Yes | No | App Functionality |
| Other User Content | Yes (source URLs, titles, categories) | Yes | No | App Functionality |
| Purchase History | Yes (if IAP entitlement synced) | Yes | No | App Functionality |

Not collected: Location, Contacts, Precise/Coarse Location, Photos, Camera, Microphone, Device ID, Advertising Data, Search History, Sensitive Info, etc.

## Third parties

- **Supabase** — auth + database (functionality)
- **Apple** — Sign in with Apple / IAP when enabled
- Social platforms only when the user opens/embeds a source post (their policies apply)

## Privacy Policy URL

https://playbook-pink.vercel.app/privacy.html  
(Requires Vercel **Promote** first — currently 404 on production until then.)
