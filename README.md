# Playbook

Football coaches save play clips from **X (Twitter), TikTok, Instagram, and Facebook** into a categorized digital playbook. Share a link from any app, categorize it, and watch clips in-app via each platform’s **official embed** — no downloading or rehosting third-party video.

## v1 scope

| Screen | Status |
|--------|--------|
| Home | Recent saves |
| Playbook | Category browser → reel viewer |
| Profile | Auth + settings |
| Share Extension | Receives URLs from share sheet |

## Architecture

```
X / TikTok / Instagram / Facebook
        ↓ (share URL)
iOS Share Extension → Categorize → ingest-shared-url
        ↓
plays row: source_url + official embed_url (no social MP4 storage)
        ↓
PlayReelView → EmbedPlayerView (WKWebView official embed)
             → LoopingVideoPlayer only for coach-owned uploads
```

### Backend (Supabase)

- **`categories`** — hierarchical play types per user
- **`plays`** — link metadata + official `embed_url` (not re-hosted social video)
- **`ingest-shared-url`** — detects platform, stores link + official embed URL
- **`resolve-playback-url`** — returns official embed URL only (no CDN MP4 extraction)

### iOS (SwiftUI)

- **`EmbedPlayerView`** — WKWebView loads official platform embeds
- **`PlaybackResolver`** — builds official embed URLs from source links
- **`LoopingVideoPlayer`** — used only for coach-owned uploads in Storage

## Supported platforms

| Platform | In-app playback | Method |
|----------|-----------------|--------|
| **X / Twitter** | Yes | Official Tweet embed (`platform.twitter.com/embed`) |
| **TikTok** | Yes | Official embed (`tiktok.com/embed/v2/{id}`) |
| **Instagram** | Yes* | Official `/embed/captioned/` page |
| **Facebook** | Yes* | Official `plugins/video.php` embed |

\* Private, deleted, or login-walled posts fall back to “Open in [platform]”.

## App Store compliance notes

- **Guideline 5.2.3:** We do **not** download, convert, or rehost third-party social video. Playback uses official embeds; Storage is for coach-owned uploads only.
- Creator attribution and a **Source** link to the original post are always shown.
- Unavailable embeds show a graceful open-on-platform prompt.

## Prerequisites

- **macOS + Xcode 15+**
- **Supabase** project with Edge Functions
- Optional: [XcodeGen](https://github.com/yonaskolb/XcodeGen)

## Setup

### 1. Supabase

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy ingest-shared-url
supabase functions deploy resolve-playback-url
```

### 2. iOS (on Mac)

```bash
cd ios
xcodegen generate
```

Open `Playbook.xcodeproj`, set Development Team, enable App Groups on app + Share Extension.

## User flow

1. Coach shares a post URL → **Playbook** in share sheet
2. Pick a category → **Save**
3. Edge function stores link + official embed URL
4. Playbook reel viewer plays via WKWebView embed (or opens source if unavailable)
