# Playbook

Football coaches save play clips from Twitter/X and Instagram into a categorized, searchable digital playbook. Share a link from any app, categorize it, and watch clips auto-play in a Reels-style viewer — no leaving the app.

## v1 scope

| Screen | Status |
|--------|--------|
| Home | Stub — recent saves list |
| Playbook | Category browser → reel viewer |
| Profile | Auth + settings |
| Share Extension | Receives URLs from share sheet |

## Architecture

```
Twitter/Instagram  →  iOS Share Extension  →  App Group (pending URL)
                              ↓
                     CategorizeClipView (pick category)
                              ↓
              Supabase Edge Function: ingest-shared-url
                              ↓
         Extract video → Upload to Storage → Update plays row
                              ↓
                     PlayReelView (AVPlayer loop)
```

### Backend (Supabase)

- **`categories`** — hierarchical play types per user (seeded on signup)
- **`plays`** — clip metadata + storage path + processing status
- **`play-videos` bucket** — private per-user folders (`{user_id}/{play_id}.mp4`)
- **`ingest-shared-url` Edge Function** — downloads Twitter video via syndication API, uploads to storage

### iOS (SwiftUI)

- **Supabase Swift SDK** for auth, database, storage signed URLs, and Edge Functions
- **Share Extension** writes URL to App Group; host app opens categorize flow
- **`LoopingVideoPlayer`** — `AVQueuePlayer` + `AVPlayerLooper`, muted by default

## Prerequisites

- **macOS + Xcode 15+** (iOS development cannot run on Windows)
- **Supabase Pro** project (or any plan with Edge Functions + Storage)
- Optional: [XcodeGen](https://github.com/yonaskolb/XcodeGen) to generate `.xcodeproj` from `project.yml`

## Setup

### 1. Supabase

```bash
# Install CLI: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Apply schema
supabase db push

# Deploy edge function
supabase functions deploy ingest-shared-url
```

Set function secrets (auto-injected in hosted Supabase, but verify):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Enable **Email auth** in Supabase Dashboard → Authentication → Providers.

### 2. iOS project (on Mac)

```bash
cd ios

# Option A: XcodeGen (recommended)
brew install xcodegen
xcodegen generate

# Option B: Create Xcode project manually and add all files under ios/Playbook and ios/PlaybookShareExtension
```

1. Open `Playbook.xcodeproj`
2. Set your **Development Team** in Signing & Capabilities
3. Enable **App Groups** (`group.com.playbook.app`) on **both** main app and Share Extension targets
4. Copy `Playbook/Info.plist.example` → `Playbook/Info.plist` and fill in:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
5. Add Supabase Swift package if not using XcodeGen:
   - `https://github.com/supabase/supabase-swift` (2.x)

### 3. Apple Developer

- Register App ID + Share Extension App ID
- Enable App Groups capability for both
- Register URL scheme: `playbook://`

## User flow

1. Coach shares a tweet/post URL → **Playbook** in share sheet
2. Extension saves URL; host app shows **Categorize Clip**
3. Coach picks category (e.g. Pass Plays → Rub Routes) → **Save**
4. Edge function extracts video, uploads to storage, marks play `ready`
5. **Playbook** tab → category → vertical reel viewer with autoplay loop

## Video extraction notes

| Platform | v1 support |
|----------|------------|
| **Twitter/X** | Works via public syndication endpoint (may break if X changes API) |
| **Instagram** | Not yet — saves link with `failed` status and friendly message |

Instagram requires authenticated scraping or a paid extraction service for reliable server-side downloads. Plan for v1.1:

- Third-party extractor API, or
- In-app WebView capture (less reliable), or
- Manual upload fallback

## Project structure

```
Playbook/
├── supabase/
│   ├── migrations/          # Schema, RLS, storage policies
│   └── functions/
│       └── ingest-shared-url/
├── ios/
│   ├── project.yml          # XcodeGen spec
│   ├── Playbook/            # Main SwiftUI app
│   └── PlaybookShareExtension/
└── README.md
```

## Security

- RLS enabled on all tables — users only see their own data
- Storage policies scoped to `{user_id}/` prefix
- Edge Function uses service role only server-side; client sends user JWT
- Never ship `service_role` key in the iOS app

## Next steps

- [ ] Wire Supabase project and test Twitter ingest end-to-end
- [ ] Instagram extraction strategy
- [ ] Push notifications when processing completes
- [ ] Offline caching for signed video URLs
- [ ] Community/shared playbook (v2)
