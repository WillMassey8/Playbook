# Playbook

Football coaches save play clips from **X (Twitter), TikTok, Instagram, and Facebook** into a categorized digital playbook. Share a link, categorize it, and **muted-autoplay** clips inside the app — no play tap, no leaving the app for normal public posts.

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
PlayReelView → LoopingVideoPlayer (X temporary CDN stream, muted autoplay)
             → EmbedPlayerView (TikTok / IG / FB official embeds + autoplay)
             → LoopingVideoPlayer for coach-owned uploads
```

### Backend (Supabase)

- **`categories`** — hierarchical play types per user
- **`plays`** — link metadata + official `embed_url` (not re-hosted social video)
- **`ingest-shared-url`** — detects platform, stores link + official embed URL
- **`resolve-playback-url`** — returns official embed URL helpers

### iOS (SwiftUI)

- **`LoopingVideoPlayer`** — muted looping AVPlayer autoplay (no play button chrome)
- **`PlaybackResolver`** — X temporary stream URLs + official embed URLs
- **`EmbedPlayerView`** — WKWebView official embeds with autoplay kick

## Supported platforms

| Platform | In-app autoplay | Method |
|----------|-----------------|--------|
| **X / Twitter** | Yes | Temporary muted CDN stream at view time (not stored) |
| **TikTok** | Yes* | Official embed (`tiktok.com/embed/v2/{id}?autoplay=1`) |
| **Instagram** | Yes* | Official `/embed/` page |
| **Facebook** | Yes* | Official `plugins/video.php` with `autoplay=true&mute=1` |

\* Private, deleted, or login-walled posts fall back to “Open in [platform]”.

## App Store compliance notes

- **Guideline 5.2.3:** We do **not** download or rehost third-party social video into Storage. X streams are temporary session URLs for muted in-app playback only. Storage is for coach-owned uploads.
- Creator attribution and a **Source** link to the original post are always shown.
- Unavailable clips show a graceful open-on-platform prompt.

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
