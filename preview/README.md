# Playbook iOS UI Preview

Vite + React frontend that mirrors the SwiftUI iOS app inside an **Xcode-style iPhone simulator** (bezel, Dynamic Island, status bar, home indicator, device templates).

## Run (live HMR)

```bash
cd preview
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`). Edits under `preview/src` hot-reload inside the phone frame.

Shortcuts:

- `?skip=1` — skip the auth screen (`http://localhost:5173/?skip=1`)
- Toolbar **Device** menu — switch iPhone templates (16 Pro, Pro Max, 16, 15, SE)

## Layout

| File | Role |
|------|------|
| `src/IPhoneSimulator.tsx` | Simulator chrome + device templates |
| `src/simulator.css` | Desk / bezel / island styles |
| `src/App.tsx` | Screen flows matching the iOS app |

This preview is **iOS-only** visual QA — it does not replace running the SwiftUI target in Xcode on a Mac.
