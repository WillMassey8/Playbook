import { useState, useRef, useEffect, useContext, createContext } from "react";

// ─── Theme context ────────────────────────────────────────────────────────────
type ThemeMode = "dark" | "light";
const ThemeCtx = createContext<{ isDark:boolean; toggleTheme:()=>void }>({
  isDark: true, toggleTheme: () => {}
});
function useTheme() { return useContext(ThemeCtx); }

// ─── Likes context ────────────────────────────────────────────────────────────
const LikesCtx = createContext<{
  likedIds: Set<string>;
  toggleLike: (id:string) => void;
}>({ likedIds: new Set(), toggleLike: () => {} });
function useLikes() { return useContext(LikesCtx); }

// ─── Streak context ───────────────────────────────────────────────────────────
// Research-backed: Duolingo saw 40% more 7+ day users after making "one action per day"
// the streak trigger. Loss aversion kicks in around Day 7. So every save extends the
// streak, streak freezes protect it, and we surface a celebration at 7 days.
type StreakState = {
  count: number;             // consecutive days of activity
  lastActiveDate: string;    // YYYY-MM-DD in local time
  totalSaves: number;        // lifetime saves
  freezes: number;           // saved days when they don't act (unlocked at 7)
  celebratedMilestones: number[]; // [7, 30, 100...] milestones already shown
};

const STREAK_KEY = "playbook.streak.v1";
function loadStreak(): StreakState {
  if (typeof window === "undefined") return emptyStreak();
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return emptyStreak();
    const parsed = JSON.parse(raw);
    return { ...emptyStreak(), ...parsed };
  } catch {
    return emptyStreak();
  }
}
function emptyStreak(): StreakState {
  return { count: 0, lastActiveDate: "", totalSaves: 0, freezes: 0, celebratedMilestones: [] };
}
function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function daysBetween(a: string, b: string): number {
  if (!a || !b) return 999;
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((db - da) / 86400000);
}

const StreakCtx = createContext<{
  streak: StreakState;
  recordSave: () => { milestone: number | null };
  acknowledgeMilestone: (m:number) => void;
}>({
  streak: emptyStreak(),
  recordSave: () => ({ milestone: null }),
  acknowledgeMilestone: () => {},
});
function useStreak() { return useContext(StreakCtx); }

// ─── Toast context ────────────────────────────────────────────────────────────
const ToastCtx = createContext<(msg: string) => void>(() => {});
function useToast() { return useContext(ToastCtx); }

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(m: string) {
    setMsg(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2200);
  }

  return (
    <ToastCtx.Provider value={showToast}>
      {children}
      {msg && (
        <div style={{
          position:"fixed", bottom:90, left:"50%", transform:"translateX(-50%)",
          background:"rgba(23,25,28,0.92)", backdropFilter:"blur(12px)",
          color:"#fff", fontSize:13, fontWeight:500, letterSpacing:"-0.01em",
          padding:"10px 18px", borderRadius:999, whiteSpace:"nowrap",
          boxShadow:"0 4px 20px rgba(0,0,0,0.3)",
          zIndex:9999, pointerEvents:"none",
          animation:"toastIn .2s cubic-bezier(0.34,1.2,0.64,1)",
          fontFamily: STEEP.sans,
        }}>
          {msg}
          <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(8px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
        </div>
      )}
    </ToastCtx.Provider>
  );
}

// ─── Steep design tokens ─────────────────────────────────────────────────────
const STEEP = {
  // Core palette
  ink:          "#17191c",
  white:        "#ffffff",
  fog:          "#f7f7f8",
  ash:          "#4c4c4c",
  graphite:     "#777b86",
  dove:         "#a3a6af",
  rust:         "#5d2a1a",
  apricotWash:  "#fbe1d1",
  skyWash:      "#d3e3fc",
  // Fonts
  serif:        "'Playfair Display', 'Georgia', serif",
  sans:         "'Inter', system-ui, -apple-system, sans-serif",
  // Shadow
  cardShadow:   "rgba(4,23,43,0.06) 0px 0px 0px 1px, rgba(0,0,0,0.08) 0px 20px 25px -5px, rgba(0,0,0,0.06) 0px 8px 10px -6px",
};

// ─── Theme-aware color helper ─────────────────────────────────────────────────
function th(isDark: boolean) {
  const d = (dark: string, light: string) => isDark ? dark : light;
  return {
    bg:              d("#0d0d0f",           STEEP.fog),
    bg2:             d("#111114",           STEEP.white),
    text:            d("rgba(255,255,255,0.95)", STEEP.ink),
    textSec:         d("rgba(255,255,255,0.50)", STEEP.ash),
    textFaint:       d("rgba(255,255,255,0.28)", STEEP.graphite),
    divider:         d("rgba(255,255,255,0.07)", `rgba(167,170,175,0.25)`),
    card:            d("rgba(255,255,255,0.06)", STEEP.white),
    cardBorder:      d("rgba(255,255,255,0.10)", "transparent"),
    cardShadow:      d("none",                   STEEP.cardShadow),
    accent:          d("#33D67D",               STEEP.rust),
    accentFg:        d("#000",                  STEEP.white),
    warm:            d("rgba(253,225,200,0.12)", STEEP.apricotWash),
    cool:            d("rgba(180,210,255,0.12)", STEEP.skyWash),
    // Typography
    serif:           STEEP.serif,
    sans:            STEEP.sans,
    // Glass → flattened cards in light mode
    glassGrad:       d("linear-gradient(160deg,rgba(255,255,255,0.07)0%,rgba(255,255,255,0.02)100%)", STEEP.white),
    glassBT:         d("rgba(255,255,255,0.14)", "transparent"),
    // Tab bar
    tabPill:         d("rgba(14,14,18,0.90)",    STEEP.white),
    tabBorder:       d("rgba(255,255,255,0.12)", `rgba(167,170,175,0.30)`),
    tabText:         d("rgba(255,255,255,0.90)", STEEP.ink),
    tabIcon:         d("rgba(255,255,255,0.30)", STEEP.graphite),
    tabActiveBg:     d("rgba(255,255,255,0.14)", STEEP.ink),
    tabActiveFg:     d("rgba(255,255,255,0.95)", STEEP.white),
    navBackText:     d("rgba(255,255,255,0.40)", STEEP.graphite),
    sectionLabel:    d("rgba(255,255,255,0.30)", STEEP.graphite),
  };
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        "#0d0d0f",
  surface:   "#1a1a1f",
  card:      "#1e1e23",
  accent:    STEEP.rust,
  accentDim: "rgba(93,42,26,0.12)",
  white:     "#FFFFFF",
  muted:     "rgba(255,255,255,0.45)",
  faint:     "rgba(255,255,255,0.15)",
  divider:   "rgba(255,255,255,0.07)",
  red:       "#c0392b",
  orange:    "#c8601a",
  blue:      "#2d6be4",
  purple:    "#7c4dab",
  teal:      "#1a7a6e",
};

// ─── Semantic color system ────────────────────────────────────────────────────
const PLAY_COLORS: Record<string, string> = {
  "pass":    "#2d6be4",  // editorial blue
  "run":     "#c8601a",  // warm amber/rust
  "rpo":     "#1a7a6e",  // forest teal
  "trick":   "#7c4dab",  // muted purple
  "special": "#1a7a6e",
};
function catColor(id: string): string {
  if      (["1","2","3","4","5","6"].includes(id))                return PLAY_COLORS.pass;
  else if (["7","8","9","10","11","12","13","14"].includes(id))   return PLAY_COLORS.run;
  else if (["15","16","17","18","19"].includes(id))               return PLAY_COLORS.rpo;
  else if (["20"].includes(id))                                   return PLAY_COLORS.trick;
  else if (["26","27","28","29"].includes(id))                    return PLAY_COLORS.special;
  return C.muted;
}

// ─── Mock data — pulled from NCAA Football playbook taxonomy ─────────────────
const CATEGORIES = [
  // Pass Plays (blue)
  { id:"1",  parentId:null, name:"Pass Plays",      sort:1 },
  { id:"2",  parentId:"1",  name:"Quick Game",       sort:1 },  // slants, hitches, quick outs
  { id:"3",  parentId:"1",  name:"Rub Routes",       sort:2 },  // mesh, cross, switch
  { id:"4",  parentId:"1",  name:"Screen Game",      sort:3 },  // RB, WR bubble, tunnel, slip
  { id:"5",  parentId:"1",  name:"Play Action",      sort:4 },  // PA Post, PA Flood, PA Deep Cross
  { id:"6",  parentId:"1",  name:"Shot Plays",       sort:5 },  // fade, post, corner, 4 verts, smash

  // Run Plays (amber)
  { id:"7",  parentId:null, name:"Run Plays",        sort:2 },
  { id:"8",  parentId:"7",  name:"Inside Zone",      sort:1 },  // IZ, IZ slice, split zone
  { id:"9",  parentId:"7",  name:"Outside Zone",     sort:2 },  // OZ, stretch, wide zone
  { id:"10", parentId:"7",  name:"Gap Schemes",      sort:3 },  // Power O, Power G, Counter GT, Counter H
  { id:"11", parentId:"7",  name:"Trap & Iso",       sort:4 },  // Trap, Iso, FB lead
  { id:"12", parentId:"7",  name:"Jet & Sweep",      sort:5 },  // Jet sweep, toss, reverse end around
  { id:"13", parentId:"7",  name:"QB Runs",          sort:6 },  // QB draw, QB sneak, QB power, zone read keep
  { id:"14", parentId:"7",  name:"Option",           sort:7 },  // Speed option, triple option, midline option

  // RPOs (green)
  { id:"15", parentId:null, name:"RPOs",             sort:3 },
  { id:"16", parentId:"15", name:"Bubble RPO",       sort:1 },
  { id:"17", parentId:"15", name:"Glance RPO",       sort:2 },
  { id:"18", parentId:"15", name:"Peek RPO",         sort:3 },  // QB peek = alert throw on LB flow
  { id:"19", parentId:"15", name:"Seam RPO",         sort:4 },  // TE/slot seam on ILB

  // Trick Plays (magenta) — flat, no subcategories
  { id:"20", parentId:null, name:"Trick Plays",      sort:4 },

];

const FEED = [
  { id:"p-new1", categoryId:"12", title:"Direct Snap Sweep – Fake Reverse",  platform:"twitter", sourceUrl:"https://x.com/CoachDanCasey/status/2069447298044620972", savedAt:null, liked:false, views:30500, addedAt: new Date("2026-06-23T15:47:00"), gradient:["#2a1a0d","#0d0d0f"] },
  { id:"p-new2", categoryId:"14", title:"Freeze Option – Under Center",     platform:"twitter", sourceUrl:"https://x.com/CoachDanCasey/status/2069095673417318780", savedAt:null, liked:false, views:65200, addedAt: new Date("2026-06-22T16:30:00"), gradient:["#2a180d","#0d0d0f"] },
  { id:"p1",  categoryId:"4",  title:"Screen Pass – Bubble Concept",        platform:"twitter",   sourceUrl:"https://x.com/CoachDanCasey/status/1980441997854011558", savedAt:"Screen Game", liked:true, views:1840, addedAt: new Date("2026-06-23"), gradient:["#1a2440","#0d0d0f"] },
  { id:"p1b", categoryId:"3",  title:"Speed Out Rub – Trips Bunch",         platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/2",   savedAt:null,          liked:false, views: 540, addedAt: new Date("2026-06-14"), gradient:["#1a2840","#0d0d0f"] },
  { id:"p1c", categoryId:"3",  title:"Mesh Concept – Shallow Cross",        platform:"instagram", sourceUrl:"https://www.instagram.com/p/abc123/",   savedAt:null,          liked:true,  views:2310, addedAt: new Date("2026-06-13"), gradient:["#1a2040","#0d0d0f"] },
  { id:"p1d", categoryId:"3",  title:"Rub Route – Slot vs. Man Cover",      platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/4",   savedAt:"Rub Routes",  liked:false, views: 780, addedAt: new Date("2026-06-12"), gradient:["#162038","#0d0d0f"] },
  { id:"p1e", categoryId:"3",  title:"Drive Concept – TE Drag",             platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/5",   savedAt:null,          liked:true,  views:3100, addedAt: new Date("2026-06-11"), gradient:["#1a2848","#0d0d0f"] },
  { id:"p1f", categoryId:"3",  title:"Switch Release – Trips Stack",        platform:"instagram", sourceUrl:"https://www.instagram.com/p/def456/",   savedAt:null,          liked:false, views: 420, addedAt: new Date("2026-06-10"), gradient:["#14203c","#0d0d0f"] },
  { id:"p1g", categoryId:"3",  title:"Snag Concept – Corner Flat Slant",    platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/7",   savedAt:null,          liked:true,  views:1200, addedAt: new Date("2026-06-09"), gradient:["#1a2444","#0d0d0f"] },
  { id:"p1h", categoryId:"3",  title:"Rub Pick – Bunch Formation",          platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/8",   savedAt:"Rub Routes",  liked:false, views: 960, addedAt: new Date("2026-06-08"), gradient:["#182240","#0d0d0f"] },
  { id:"p1i", categoryId:"3",  title:"Levels Concept – Hi-Lo Read",         platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/8b",  savedAt:null,          liked:true,  views: 670, addedAt: new Date("2026-06-07"), gradient:["#1a2038","#0d0d0f"] },
  { id:"p2",  categoryId:"4",  title:"Tunnel Screen to TE vs. Press",       platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/9",   savedAt:null,          liked:false, views:1550, addedAt: new Date("2026-06-14"), gradient:["#1a2440","#0d0d0f"] },
  { id:"p3",  categoryId:"6",  title:"Fade vs. Cover 2 – Back Pylon",       platform:"instagram", sourceUrl:"https://www.instagram.com/p/ghi789/",   savedAt:"Shot Plays",  liked:true,  views: 890, addedAt: new Date("2026-06-13"), gradient:["#1a2440","#0d0d0f"] },
  { id:"p4",  categoryId:"3",  title:"Speed Out Rub – Trips Bunch",         platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/11",  savedAt:null,          liked:false, views:2750, addedAt: new Date("2026-06-12"), gradient:["#1a2440","#0d0d0f"] },
  { id:"p5",  categoryId:"8",  title:"IZ Slice – H-back kicks down EMOL",   platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/12",  savedAt:null,          liked:false, views: 330, addedAt: new Date("2026-06-11"), gradient:["#2a1a0d","#0d0d0f"] },
  { id:"p6",  categoryId:"17", title:"Glance RPO vs. Cover 3 – LB conflict",platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/13",  savedAt:"Glance RPO",  liked:true,  views:1080, addedAt: new Date("2026-06-10"), gradient:["#0d2a1a","#0d0d0f"] },
  { id:"p7",  categoryId:"4",  title:"Bubble Screen – Crack & Wrap",        platform:"instagram", sourceUrl:"https://www.instagram.com/p/jkl012/",   savedAt:null,          liked:false, views: 720, addedAt: new Date("2026-06-09"), gradient:["#1a2440","#0d0d0f"] },
  { id:"p8",  categoryId:"16", title:"Bubble RPO – TE flat, slot arc",      platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/15",  savedAt:null,          liked:true,  views:1430, addedAt: new Date("2026-06-08"), gradient:["#0d2a1a","#0d0d0f"] },
  { id:"p9",  categoryId:"10", title:"Power O with TE kick – goal line",    platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/16",  savedAt:"Gap Schemes",  liked:false, views: 610, addedAt: new Date("2026-06-07"), gradient:["#2a1a0d","#0d0d0f"] },
  { id:"p10", categoryId:"20", title:"Flea Flicker – post vs. single high", platform:"instagram", sourceUrl:"https://www.instagram.com/p/mno345/",   savedAt:null,          liked:true,  views:4200, addedAt: new Date("2026-06-06"), gradient:["#2a0d2a","#0d0d0f"] },
  { id:"p11", categoryId:"13", title:"QB Power Read – kick out EMOL",       platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/18",  savedAt:null,          liked:false, views: 980, addedAt: new Date("2026-06-05"), gradient:["#2a1a0d","#0d0d0f"] },
  { id:"p12", categoryId:"5",  title:"PA Post Wheel – TE seam crosser",     platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/19",  savedAt:"Play Action", liked:true,  views:1760, addedAt: new Date("2026-06-04"), gradient:["#1a2440","#0d0d0f"] },
  { id:"p13", categoryId:"18", title:"Peek RPO – ILB triangle read",        platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/20",  savedAt:null,          liked:false, views: 510, addedAt: new Date("2026-06-03"), gradient:["#0d2a1a","#0d0d0f"] },
  { id:"p14", categoryId:"20", title:"WR Pass – motion across formation",   platform:"instagram", sourceUrl:"https://www.instagram.com/p/pqr678/",   savedAt:null,          liked:true,  views:2900, addedAt: new Date("2026-06-02"), gradient:["#2a0d2a","#0d0d0f"] },
  { id:"p16", categoryId:"12", title:"Jet Sweep – unbalanced line look",    platform:"twitter",   sourceUrl:"https://x.com/CoachSample/status/22",  savedAt:null,          liked:false, views: 840, addedAt: new Date("2026-06-01"), gradient:["#2a1a0d","#0d0d0f"] },
];

const topLevel = CATEGORIES.filter(c => !c.parentId);
function children(pid: string) { return CATEGORIES.filter(c => c.parentId === pid); }
function leafCats() {
  const hasChildren = new Set(CATEGORIES.filter(c => c.parentId).map(c => c.parentId!));
  return CATEGORIES.filter(c => !hasChildren.has(c.id));
}
function parentName(catId: string) {
  const cat = CATEGORIES.find(c => c.id === catId);
  if (!cat?.parentId) return null;
  return CATEGORIES.find(c => c.id === cat.parentId)?.name ?? null;
}
function descendantIds(catId: string): Set<string> {
  const ids = new Set<string>([catId]);
  CATEGORIES.filter(c => c.parentId === catId).forEach(c => {
    descendantIds(c.id).forEach(id => ids.add(id));
  });
  return ids;
}
function playsInCat(catId: string) {
  const ids = descendantIds(catId);
  return FEED.filter(p => ids.has(p.categoryId));
}

// ─── Link-based playback (App Store 5.2.3 safe — no re-hosted social video) ───
function extractTweetId(url: string): string | null {
  const m = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/i);
  return m?.[1] ?? null;
}

type FeedPlay = typeof FEED[number] & {
  thumbnailUrl?: string;
  videoStoragePath?: string;
};

/** Local preview files when the X video CDN blocks browser playback (dev only). */
const PREVIEW_LOCAL_STREAM: Record<string, string> = {
  "1980441997854011558": "/sample-play.mp4",
  "2069447298044620972": "/play-2069447298044620972.mp4",
  "2069095673417318780": "/play-2069095673417318780.mp4",
};

/** Resolve a temporary X stream URL for playback (not stored). */
async function resolveTwitterStream(sourceUrl: string): Promise<string | null> {
  const id = extractTweetId(sourceUrl);
  if (!id) return null;
  if (PREVIEW_LOCAL_STREAM[id]) return PREVIEW_LOCAL_STREAM[id];
  try {
    const res = await fetch(`/tw-syndication/tweet-result?id=${id}&lang=en&token=0`);
    if (!res.ok) return null;
    const payload = await res.json();
    const mediaDetails: Array<Record<string, unknown>> = payload?.mediaDetails ?? [];
    for (const media of mediaDetails) {
      const type = media.type as string | undefined;
      if (type !== "video" && type !== "animated_gif") continue;
      const variants = (media.video_info as { variants?: Array<Record<string, unknown>> })
        ?.variants ?? [];
      const mp4 = variants
        .filter(v => typeof v.url === "string" && (v.content_type === "video/mp4" || !v.content_type))
        .map(v => ({ url: v.url as string, bitrate: (v.bitrate as number) ?? 0 }))
        .sort((a, b) => b.bitrate - a.bitrate);
      if (mp4[0]?.url) return mp4[0].url;
    }
  } catch { /* syndication unavailable */ }
  return null;
}

/** Hook: resolve + cache stream URL when a feed card becomes active. */
function usePlaybackStream(play: FeedPlay | null | undefined, isActive: boolean) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!play || !isActive || play.platform !== "twitter") {
      setStreamUrl(null);
      return;
    }
    let cancelled = false;
    resolveTwitterStream(play.sourceUrl).then(url => {
      if (!cancelled) setStreamUrl(url);
    });
    return () => { cancelled = true; };
  }, [isActive, play?.platform, play?.sourceUrl]);

  return streamUrl;
}

function NativeClipVideo({ src, isActive, paused, videoRef }: {
  src: string; isActive: boolean; paused: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}) {
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (isActive && !paused) v.play().catch(() => {});
    else v.pause();
  }, [isActive, paused, src, videoRef]);

  if (!isActive) return null;

  return (
    <video
      ref={videoRef}
      src={src}
      loop muted playsInline autoPlay
      style={{
        position:"absolute", inset:0, width:"100%", height:"100%",
        objectFit:"contain", objectPosition:"center", background:"#000",
      }}
    />
  );
}

function PlayMediaBackdrop({ play }: { play: FeedPlay }) {
  if (play.thumbnailUrl) {
    return (
      <img src={play.thumbnailUrl} alt=""
        style={{ position:"absolute", inset:0, width:"100%", height:"100%",
          objectFit:"cover" }} />
    );
  }
  return (
    <div style={{ position:"absolute", inset:0,
      background:`linear-gradient(200deg, ${play.gradient[0]} 0%, #000 100%)` }} />
  );
}

const previewStreamCache = new Map<string, string>();

/** Resolve a stream URL for playbook grid thumbnails (cached, muted loop). */
function useClipPreviewStream(play: FeedPlay): string | null {
  const tweetId = play.platform === "twitter" ? extractTweetId(play.sourceUrl) : null;
  const [streamUrl, setStreamUrl] = useState<string | null>(() => {
    if (play.videoStoragePath) return play.videoStoragePath;
    if (tweetId && PREVIEW_LOCAL_STREAM[tweetId]) return PREVIEW_LOCAL_STREAM[tweetId];
    if (tweetId && previewStreamCache.has(tweetId)) return previewStreamCache.get(tweetId)!;
    return null;
  });

  useEffect(() => {
    if (streamUrl || play.platform !== "twitter") return;
    let cancelled = false;
    resolveTwitterStream(play.sourceUrl).then(url => {
      if (cancelled || !url) return;
      if (tweetId) previewStreamCache.set(tweetId, url);
      setStreamUrl(url);
    });
    return () => { cancelled = true; };
  }, [play.platform, play.sourceUrl, streamUrl, tweetId]);

  return streamUrl;
}

/** Muted looping video preview for playbook grids and category clips. */
function PlaybookClipPreview({ play }: { play: FeedPlay }) {
  const src = useClipPreviewStream(play);
  return (
    <>
      <PlayMediaBackdrop play={play} />
      {src && (
        <video
          src={src}
          muted loop playsInline autoPlay
          style={{
            position:"absolute", inset:0, width:"100%", height:"100%",
            objectFit:"cover", objectPosition:"center",
          }}
        />
      )}
    </>
  );
}

type Screen =
  | { id:"feed" }
  | { id:"playbook" }
  | { id:"category"; catId:string }
  | { id:"grid"; catId:string; label:string }
  | { id:"clip"; playId:string; from:Screen }
  | { id:"liked" }
  | { id:"profile" }
  | { id:"share-ext" }
  | { id:"auth" };

// ─── Shared UI ────────────────────────────────────────────────────────────────
function PlatformBadge({ platform }: { platform:string }) {
  const cfg: Record<string, {label:string; color:string; icon:string}> = {
    twitter:   { label:"X / Twitter", color:"#fff",    icon:"𝕏" },
    instagram: { label:"Instagram",   color:C.orange,  icon:"◎" },
  };
  const c = cfg[platform] ?? { label:"Link", color:C.muted, icon:"🔗" };
  return (
    <span style={{ fontSize:11, fontWeight:700, color:c.color, background:`${c.color}22`,
      borderRadius:99, padding:"3px 9px", display:"inline-flex", gap:4, alignItems:"center" }}>
      {c.icon} {c.label}
    </span>
  );
}

// ─── Add to Playbook sheet ────────────────────────────────────────────────────
// ─── Feed SVG icons ───────────────────────────────────────────────────────────
function IconHeart({ filled }: { filled:boolean }) {
  return filled ? (
    <svg width="22" height="20" viewBox="0 0 22 20" fill={C.red}>
      <path d="M11 18.5S1 12.5 1 6a5 5 0 0110 0 5 5 0 0110 0c0 6.5-10 12.5-10 12.5z"/>
    </svg>
  ) : (
    <svg width="22" height="20" viewBox="0 0 22 20" fill="none">
      <path d="M11 18.5S1 12.5 1 6a5 5 0 0110 0 5 5 0 0110 0c0 6.5-10 12.5-10 12.5z"
        stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" strokeLinejoin="round"/>
    </svg>
  );
}
function IconShare() {
  return (
    <svg width="20" height="22" viewBox="0 0 20 22" fill="none">
      <path d="M10 1v14M4 7l6-6 6 6" stroke="rgba(255,255,255,0.85)"
        strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1 15v4a2 2 0 002 2h14a2 2 0 002-2v-4"
        stroke="rgba(255,255,255,0.85)" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="rgba(255,255,255,0.85)">
      <path d="M0.5 0L6.2 8.5 0 15.5h2L7.2 9.7l4.8 5.8H16L10 6.9 15.8 0.5h-2L9.1 5.8 4.5 0H0.5Z"/>
    </svg>
  );
}
function IconIG({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 17 17" fill="none">
      <rect x="1" y="1" width="15" height="15" rx="4.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5"/>
      <circle cx="8.5" cy="8.5" r="3" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5"/>
      <circle cx="12.5" cy="4.5" r="0.9" fill="rgba(255,255,255,0.85)"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 8l4.5 4.5L14 3" stroke={C.accent} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─── Add to Playbook bottom sheet ─────────────────────────────────────────────
function AddToPlaybookSheet({ play, onClose, onSaved }:
  { play: typeof FEED[0]; onClose:()=>void; onSaved:(catName:string)=>void }) {
  const { isDark } = useTheme();
  const T = th(isDark);
  const [parentId, setParentId] = useState<string>("");
  const [subId,    setSubId]    = useState<string>("");
  const [saving, setSaving]     = useState(false);
  const [done,   setDone]       = useState(false);

  const parents = CATEGORIES.filter(c => c.parentId === null);
  const subs    = parentId ? CATEGORIES.filter(c => c.parentId === parentId) : [];
  // If no subs exist for the parent, the parent itself is the final selection
  const selectedId = subs.length > 0 ? subId : parentId;
  const canSave    = parentId !== "" && (subs.length === 0 || subId !== "");

  function handleParentChange(val: string) {
    setParentId(val);
    setSubId("");
  }

  function save() {
    if (!canSave) return;
    setSaving(true);
    setTimeout(() => {
      setDone(true);
      const cat = CATEGORIES.find(c => c.id === selectedId);
      setTimeout(() => { onSaved(cat?.name ?? "Playbook"); }, 800);
    }, 900);
  }

  const sheetBg   = isDark ? "#111114" : STEEP.white;
  const handleCol = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.13)";
  const inputBg   = isDark ? "rgba(255,255,255,0.06)" : STEEP.fog;
  const inputBdr  = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
  const selectStyle: React.CSSProperties = {
    width:"100%", padding:"13px 16px", borderRadius:12, cursor:"pointer",
    background: inputBg, border:`1px solid ${inputBdr}`,
    color: T.text, fontSize:15, fontFamily: STEEP.sans,
    fontWeight:400, letterSpacing:"-0.008em",
    appearance:"none", WebkitAppearance:"none",
    backgroundImage:`url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l5 5 5-5' stroke='${isDark ? "%23ffffff66" : "%2377808666"}' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
    backgroundRepeat:"no-repeat", backgroundPosition:"right 14px center",
    outline:"none", transition:"border-color .15s",
  };

  return (
    <>
      <div onClick={onClose} style={{ position:"absolute", inset:0,
        background: isDark ? "rgba(0,0,0,0.55)" : "rgba(23,25,28,0.35)",
        backdropFilter:"blur(4px)", zIndex:10 }} />

      <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:11,
        background: sheetBg,
        borderRadius:"22px 22px 0 0",
        boxShadow: isDark
          ? "0 -4px 32px rgba(0,0,0,0.55)"
          : "0 -2px 24px rgba(23,25,28,0.10), 0 -1px 0 rgba(0,0,0,0.05)",
        padding:"0 0 36px",
        display:"flex", flexDirection:"column", fontFamily: STEEP.sans,
        animation:"slideUp .26s cubic-bezier(0.34,1.1,0.64,1)" }}>

        <style>{`@keyframes slideUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

        {/* Handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 6px" }}>
          <div style={{ width:32, height:4, borderRadius:99, background: handleCol }} />
        </div>

        {done ? (
          <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
            justifyContent:"center", gap:14, padding:"32px 24px 24px" }}>
            <div style={{ width:56, height:56, borderRadius:"50%",
              background: isDark ? "rgba(93,42,26,0.18)" : STEEP.apricotWash,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="24" height="20" viewBox="0 0 24 20" fill="none">
                <path d="M2 10l7 7L22 2" stroke={STEEP.rust} strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ fontFamily: STEEP.serif, fontSize:18, fontWeight:500,
              color: T.text, letterSpacing:"-0.01em" }}>Saved to Playbook</div>
            <div style={{ fontSize:13, color: T.textSec }}>
              {CATEGORIES.find(c => c.id === selectedId)?.name}
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding:"10px 20px 16px", borderBottom:`1px solid ${T.divider}` }}>
              <div style={{ fontFamily: STEEP.serif, fontSize:18, fontWeight:500,
                color: T.text, letterSpacing:"-0.01em", marginBottom:3 }}>
                Save to Playbook
              </div>
              <div style={{ fontSize:13, color: T.textFaint,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {play.title}
              </div>
            </div>

            {/* Dropdowns */}
            <div style={{ padding:"20px 20px 4px", display:"flex", flexDirection:"column", gap:12 }}>

              {/* Category */}
              <div>
                <div style={{ fontSize:11, fontWeight:600, color: T.textFaint,
                  letterSpacing:"0.07em", marginBottom:7 }}>CATEGORY</div>
                <div style={{ position:"relative" }}>
                  <select value={parentId} onChange={e => handleParentChange(e.target.value)}
                    style={selectStyle}>
                    <option value="" disabled style={{ color: isDark ? "#666" : "#aaa" }}>
                      Select a play type…
                    </option>
                    {parents.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sub-category — only shows if parent has children */}
              {parentId !== "" && subs.length > 0 && (
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color: T.textFaint,
                    letterSpacing:"0.07em", marginBottom:7 }}>SUB-CATEGORY</div>
                  <div style={{ position:"relative" }}>
                    <select value={subId} onChange={e => setSubId(e.target.value)}
                      style={selectStyle}>
                      <option value="" disabled style={{ color: isDark ? "#666" : "#aaa" }}>
                        Select a sub-category…
                      </option>
                      {subs.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Save button */}
            <div style={{ padding:"16px 20px 0" }}>
              <button onClick={save} disabled={!canSave || saving}
                style={{ width:"100%", border:"none", borderRadius:14, padding:"15px",
                  background: canSave && !saving ? STEEP.ink : (isDark ? "rgba(255,255,255,0.07)" : STEEP.fog),
                  color: canSave && !saving ? STEEP.white : T.textFaint,
                  fontWeight:600, fontSize:15, cursor: canSave ? "pointer" : "default",
                  letterSpacing:"-0.01em", transition:"all .18s",
                  boxShadow: canSave && !saving ? STEEP.cardShadow : "none",
                  fontFamily: STEEP.sans }}>
                {saving ? "Saving…" : "Save to Playbook"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ─── iOS-style share sheet for a clip ─────────────────────────────────────────
function ClipShareSheet({ play, onClose }: { play: typeof FEED[0]; onClose: () => void }) {
  const { isDark } = useTheme();
  const T = th(isDark);
  const [copied, setCopied] = useState(false);

  function copyLink() {
    setCopied(true);
    setTimeout(() => { setCopied(false); onClose(); }, 1200);
  }

  // Sheet always uses the app's surface color (white in light, dark in dark)
  const sheetBg     = isDark ? "#111114" : STEEP.white;
  const handleCol   = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.13)";
  const rowBorder   = T.divider;
  const actionBg    = isDark ? "rgba(255,255,255,0.06)" : STEEP.fog;
  const actionLabel = isDark ? "rgba(255,255,255,0.88)" : STEEP.ink;
  const cancelBg    = isDark ? "rgba(255,255,255,0.08)" : STEEP.fog;
  const appLabel    = isDark ? "rgba(255,255,255,0.70)" : STEEP.ash;

  // Apple SF-Symbol-style icons — clean stroked paths on solid rounded squares
  const shareApps = [
    {
      label: "AirDrop",
      bg: "linear-gradient(145deg,#34aadc,#1a82e2)",
      icon: (
        // Radiating WiFi-style arcs + dot — AirDrop's system icon shape
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <circle cx="13" cy="18" r="2.2" fill="white"/>
          <path d="M8.5 14.5a6.4 6.4 0 019 0" stroke="white" strokeWidth="1.8"
            strokeLinecap="round"/>
          <path d="M5 11a11 11 0 0116 0" stroke="white" strokeWidth="1.8"
            strokeLinecap="round" opacity="0.6"/>
          <path d="M13 6v5M10.5 8.5L13 6l2.5 2.5" stroke="white" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
    },
    {
      label: "Messages",
      bg: "linear-gradient(145deg,#4cd964,#30b94c)",
      icon: (
        // Filled speech bubble with tail
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path d="M3 4h20a2 2 0 012 2v11a2 2 0 01-2 2H9l-5 4v-4H3a2 2 0 01-2-2V6a2 2 0 012-2z"
            fill="white" fillOpacity="0.95"/>
        </svg>
      ),
    },
    {
      label: "Mail",
      bg: "linear-gradient(145deg,#4a90d9,#1a6bbf)",
      icon: (
        // Envelope with flap — system Mail icon shape
        <svg width="26" height="22" viewBox="0 0 26 22" fill="none">
          <rect x="1" y="1" width="24" height="20" rx="3" fill="white" fillOpacity="0.15"
            stroke="white" strokeWidth="1.6"/>
          <path d="M1 4l12 9 12-9" stroke="white" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
      ),
    },
    {
      label: "Instagram",
      bg: "linear-gradient(145deg,#f58529,#dd2a7b 50%,#8134af)",
      icon: (
        // Camera viewfinder + lens — Instagram icon
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="2" width="20" height="20" rx="6" stroke="white" strokeWidth="1.8"/>
          <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8"/>
          <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
        </svg>
      ),
    },
    {
      label: "X",
      bg: "#000000",
      icon: (
        // X logo — two diagonal strokes forming an X
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M2 2l8.5 9.5L2 20h2.5l6.5-7.5L17.5 20H21L12 10l8-8h-2.5L10.5 8 5 2H2z"
            fill="white"/>
        </svg>
      ),
    },
    {
      label: "More",
      bg: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
      icon: (
        <svg width="22" height="6" viewBox="0 0 22 6" fill="none">
          <circle cx="3" cy="3" r="2.5" fill={isDark ? "white" : STEEP.ash}/>
          <circle cx="11" cy="3" r="2.5" fill={isDark ? "white" : STEEP.ash}/>
          <circle cx="19" cy="3" r="2.5" fill={isDark ? "white" : STEEP.ash}/>
        </svg>
      ),
    },
  ];

  const listActions = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect x="1" y="1" width="18" height="18" rx="4" stroke={isDark ? "rgba(255,255,255,0.5)" : STEEP.graphite} strokeWidth="1.5"/>
          <path d="M6 10h8M10 6v8" stroke={isDark ? "rgba(255,255,255,0.5)" : STEEP.graphite} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      label: copied ? "Copied!" : "Copy Link",
      action: copyLink,
      highlight: copied,
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M6 3h8a2 2 0 012 2v10l-4-3-4 3V5a2 2 0 012-2z" stroke={isDark ? "rgba(255,255,255,0.5)" : STEEP.graphite} strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      ),
      label: play.platform === "twitter" ? "Open in X" : "Open in Instagram",
      action: () => { window.open(play.sourceUrl, "_blank"); onClose(); },
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path d="M10 2v10M10 15v1" stroke="#ff3b30" strokeWidth="2" strokeLinecap="round"/>
          <path d="M3 18L10 2l7 16H3z" stroke="#ff3b30" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      ),
      label: "Report Clip",
      action: onClose,
      danger: true,
    },
  ];

  return (
    <>
      {/* Dim overlay */}
      <div onClick={onClose} style={{ position:"absolute", inset:0,
        background: isDark ? "rgba(0,0,0,0.55)" : "rgba(23,25,28,0.35)", zIndex:10 }} />

      {/* Sheet */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:11,
        background: sheetBg,
        borderRadius:"22px 22px 0 0",
        boxShadow: isDark
          ? "0 -4px 32px rgba(0,0,0,0.55)"
          : "0 -2px 24px rgba(23,25,28,0.10), 0 -1px 0 rgba(0,0,0,0.05)",
        fontFamily: STEEP.sans,
        paddingBottom: 32 }}>

        {/* Drag handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 6px" }}>
          <div style={{ width:36, height:4, borderRadius:99, background: handleCol }} />
        </div>

        {/* Clip preview */}
        <div style={{ display:"flex", alignItems:"center", gap:12,
          padding:"8px 18px 14px", borderBottom:`1px solid ${rowBorder}` }}>
          <div style={{ width:52, height:52, borderRadius:10, flexShrink:0, overflow:"hidden",
            position:"relative" }}>
            <PlayMediaBackdrop play={play as FeedPlay} />
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontFamily: STEEP.serif, fontSize:15, fontWeight:500,
              color: T.text, letterSpacing:"-0.01em", marginBottom:2,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {play.title}
            </div>
            <div style={{ fontSize:12, color: T.textFaint }}>Playbook AI</div>
          </div>
        </div>

        {/* App icon row */}
        <div style={{ display:"flex", gap:2, padding:"16px 10px 6px",
          overflowX:"auto" }} className="hide-scrollbar">
          {shareApps.map(a => (
            <button key={a.label} onClick={onClose}
              style={{ background:"none", border:"none", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                minWidth:66, padding:"0 4px" }}>
              <div style={{ width:52, height:52, borderRadius:14,
                background: a.bg,
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow: STEEP.cardShadow }}>
                {a.icon}
              </div>
              <span style={{ fontSize:10, fontWeight:500, color: appLabel,
                textAlign:"center", lineHeight:1.3, letterSpacing:"0.005em" }}>
                {a.label}
              </span>
            </button>
          ))}
        </div>

        {/* List actions card */}
        <div style={{ margin:"12px 16px 0", background: actionBg,
          borderRadius:14, overflow:"hidden",
          boxShadow: isDark ? "none" : STEEP.cardShadow }}>
          {listActions.map((item, i) => (
            <button key={item.label} onClick={item.action}
              style={{ width:"100%", background:"none", border:"none", cursor:"pointer",
                display:"flex", alignItems:"center", gap:14, padding:"13px 18px",
                borderBottom: i < listActions.length - 1 ? `1px solid ${rowBorder}` : "none" }}>
              <div style={{ width:22, display:"flex", alignItems:"center",
                justifyContent:"center", flexShrink:0 }}>
                {item.icon}
              </div>
              <span style={{ fontSize:15, fontWeight:400, letterSpacing:"-0.01em",
                color: item.danger ? "#ff3b30"
                  : item.highlight ? STEEP.rust
                  : actionLabel }}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Cancel */}
        <div style={{ margin:"10px 16px 0" }}>
          <button onClick={onClose}
            style={{ width:"100%", background: cancelBg, border:"none",
              borderRadius:14, padding:"15px", cursor:"pointer",
              fontSize:16, fontWeight:600, letterSpacing:"-0.01em",
              color: T.text,
              boxShadow: isDark ? "none" : STEEP.cardShadow }}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

// ─── Single full-screen feed card ─────────────────────────────────────────────
function FeedCard({ play, isActive }:
  { play:typeof FEED[0]; isActive:boolean }) {
  const [showSheet, setShowSheet]       = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [savedTo, setSavedTo]           = useState<string|null>(play.savedAt);
  const { likedIds, toggleLike }        = useLikes();
  const { recordSave }                  = useStreak();
  const liked                           = likedIds.has(play.id);
  const [likeCount]                     = useState(Math.floor(Math.random() * 600) + 80);
  const [paused, setPaused]             = useState(false);
  const [doubleTapHeart, setDoubleTapHeart] = useState(false);
  const videoRef    = useRef<HTMLVideoElement>(null);
  const lastTap     = useRef<number>(0);
  const tapTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const togglePause = () => setPaused(p => !p);

  // Double-tap → like + floating heart; single-tap → pause (delayed to distinguish)
  function handleTap(e: React.MouseEvent) {
    const now = Date.now();
    const gap = now - lastTap.current;
    lastTap.current = now;

    if (gap < 300) {
      if (tapTimer.current) {
        clearTimeout(tapTimer.current);
        tapTimer.current = null;
      }
      if (!liked) {
        toggleLike(play.id);
        recordSave();
      }
      setDoubleTapHeart(true);
      setTimeout(() => setDoubleTapHeart(false), 900);
    } else {
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        togglePause();
      }, 300);
    }
  }

  const userVideo  = (play as FeedPlay).videoStoragePath;
  const streamUrl  = usePlaybackStream(play as FeedPlay, isActive);
  const playbackSrc = userVideo || streamUrl;
  const canPlay    = !!playbackSrc || play.platform === "twitter";

  return (
    <div style={{ width:"100%", height:"100%", position:"relative",
      overflow:"hidden" }}
      onClick={playbackSrc ? handleTap : undefined}>

      <PlayMediaBackdrop play={play as FeedPlay} />

      {/* Streams from X CDN at view time — muted autoplay, not stored */}
      {playbackSrc && (
        <NativeClipVideo
          src={playbackSrc}
          isActive={isActive}
          paused={paused}
          videoRef={videoRef}
        />
      )}

      {/* Loading stream */}
      {isActive && play.platform === "twitter" && !playbackSrc && (
        <div style={{ position:"absolute", inset:0, display:"flex",
          alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
          <div style={{ width:28, height:28, borderRadius:"50%",
            border:"2px solid rgba(255,255,255,0.15)",
            borderTopColor:"rgba(255,255,255,0.85)",
            animation:"spin 0.7s linear infinite" }} />
        </div>
      )}

      {/* Subtle noise texture overlay */}
      {!playbackSrc && play.platform !== "twitter" && (
        <div style={{ position:"absolute", inset:0, opacity:0.03,
          backgroundImage:"url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize:"120px" }} />
      )}

      {/* Pause indicator */}
      {playbackSrc && paused && (
        <div style={{ position:"absolute", inset:0, display:"flex",
          alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
          <div style={{ width:64, height:64, borderRadius:"50%",
            background:"rgba(0,0,0,0.5)", backdropFilter:"blur(12px)",
            border:"1px solid rgba(255,255,255,0.2)",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="20" height="22" viewBox="0 0 20 22" fill="white" style={{ marginLeft:2 }}>
              <path d="M2 2l16 9L2 20V2z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Instagram / link-only — open source */}
      {!playbackSrc && play.platform !== "twitter" && (
        <div style={{ position:"absolute", inset:0, display:"flex",
          alignItems:"center", justifyContent:"center",
          opacity: isActive ? 1 : 0.3,
          transform: isActive ? "scale(1)" : "scale(0.9)",
          transition:"all .4s cubic-bezier(0.34,1.1,0.64,1)" }}>
          <div style={{ width:64, height:64, borderRadius:"50%",
            background:"rgba(255,255,255,0.08)",
            border:"1px solid rgba(255,255,255,0.15)",
            backdropFilter:"blur(12px)",
            display:"flex", alignItems:"center", justifyContent:"center",
            boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
            <svg width="20" height="22" viewBox="0 0 20 22" fill="white" style={{ marginLeft:2 }}>
              <path d="M2 2l16 9L2 20V2z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Double-tap floating heart animation */}
      {doubleTapHeart && (
        <div style={{ position:"absolute", inset:0, display:"flex",
          alignItems:"center", justifyContent:"center",
          pointerEvents:"none", zIndex:20 }}>
          <svg width="90" height="90" viewBox="0 0 90 90" fill="none"
            style={{ animation:"heartPop 0.9s ease forwards" }}>
            <path d="M45 75 C45 75 10 55 10 30 C10 18 19 10 30 10 C37 10 43 14 45 18 C47 14 53 10 60 10 C71 10 80 18 80 30 C80 55 45 75 45 75Z"
              fill={C.red} opacity="0.95"/>
          </svg>
          <style>{`
            @keyframes heartPop {
              0%   { transform: scale(0.3); opacity: 0; }
              30%  { transform: scale(1.25); opacity: 1; }
              55%  { transform: scale(0.95); opacity: 1; }
              75%  { transform: scale(1.08); opacity: 0.9; }
              100% { transform: scale(1); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* Right-side action stack */}
      <div style={{ position:"absolute", right:14, bottom:210, display:"flex",
        flexDirection:"column", alignItems:"center", gap:22 }}>

        {/* Like */}
        <button onClick={e => { e.stopPropagation(); if (!liked) recordSave(); toggleLike(play.id); }}
          style={{ background:"none", border:"none",
            cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
          <div style={{ width:42, height:42, borderRadius:"50%",
            background:"rgba(0,0,0,0.35)", backdropFilter:"blur(12px)",
            border:`1px solid ${liked ? "rgba(192,57,43,0.4)" : "rgba(255,255,255,0.12)"}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"border-color .2s" }}>
            <IconHeart filled={liked} />
          </div>
          <span style={{ fontSize:11, fontWeight:600,
            color: liked ? C.red : "rgba(255,255,255,0.7)",
            letterSpacing:"-0.01em" }}>{likeCount + (liked ? 1 : 0)}</span>
        </button>

        {/* Share */}
        <button onClick={e => { e.stopPropagation(); setShowShareSheet(true); }}
          style={{ background:"none", border:"none", cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
          <div style={{ width:42, height:42, borderRadius:"50%",
            background:"rgba(0,0,0,0.35)", backdropFilter:"blur(12px)",
            border:"1px solid rgba(255,255,255,0.12)",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <IconShare />
          </div>
          <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)",
            letterSpacing:"-0.01em" }}>Share</span>
        </button>

        {/* Source platform — links back to original post (ToS + DMCA compliance) */}
        <a href={play.sourceUrl} target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:5,
            textDecoration:"none" }}>
          <div style={{ width:42, height:42, borderRadius:"50%",
            background:"rgba(0,0,0,0.35)", backdropFilter:"blur(12px)",
            border:"1px solid rgba(255,255,255,0.18)",
            display:"flex", alignItems:"center", justifyContent:"center",
            transition:"border-color .15s" }}>
            {play.platform === "twitter" ? <IconX /> : <IconIG />}
          </div>
          <span style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,0.7)",
            letterSpacing:"-0.01em" }}>
            {play.platform === "twitter" ? "View on X" : "View on IG"}
          </span>
        </a>
      </div>

      {/* Bottom gradient + info */}
      <div onClick={e => e.stopPropagation()}
        style={{ position:"absolute", bottom:0, left:0, right:0,
        background:"linear-gradient(transparent, rgba(0,0,0,0.75) 40%, rgba(0,0,0,0.95) 100%)",
        padding:"60px 16px 96px" }}>

        {/* Source attribution — required by X/Instagram ToS */}
        <a href={play.sourceUrl} target="_blank" rel="noopener noreferrer"
          style={{ display:"inline-flex", alignItems:"center", gap:5,
            marginBottom:8, textDecoration:"none" }}>
          <span style={{ opacity:0.45, display:"flex", alignItems:"center" }}>
            {play.platform === "twitter"
              ? <IconX size={11} />
              : <IconIG size={11} />}
          </span>
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.45)",
            fontWeight:500, letterSpacing:"0.01em" }}>
            {play.platform === "twitter" ? "View original on X" : "View original on Instagram"}
          </span>
        </a>

        {/* Title */}
        <div style={{ fontSize:16, fontWeight:700, color:"rgba(255,255,255,0.95)",
          lineHeight:1.35, marginBottom:14, letterSpacing:"-0.01em",
          textShadow:"0 1px 8px rgba(0,0,0,0.6)" }}>{play.title}</div>

        {/* Add to Playbook CTA */}
        {savedTo ? (
          // Confirmed state — frosted pill with rust checkmark
          <div style={{ display:"flex", alignItems:"center", gap:10,
            background:"rgba(255,255,255,0.10)",
            border:"1px solid rgba(255,255,255,0.18)",
            borderRadius:14, padding:"11px 16px",
            backdropFilter:"blur(12px)" }}>
            <div style={{ width:26, height:26, borderRadius:"50%",
              background: STEEP.apricotWash,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
                <path d="M1 5.5l4 4L12 1" stroke={STEEP.rust} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: STEEP.sans, fontSize:13, fontWeight:600,
                color:"rgba(255,255,255,0.92)", letterSpacing:"-0.01em" }}>
                Saved to Playbook
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.45)", marginTop:1 }}>
                {savedTo}
              </div>
            </div>
          </div>
        ) : (
          // CTA — white pill button (Steep ink style, readable over dark video)
          <button onClick={() => setShowSheet(true)}
            style={{ width:"100%", border:"none", borderRadius:14,
              padding:"14px 16px", cursor:"pointer",
              background: STEEP.white,
              boxShadow:"0 4px 24px rgba(0,0,0,0.3)",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              fontFamily: STEEP.sans }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1v10M4 7l4 4 4-4" stroke={STEEP.ink} strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 13h12" stroke={STEEP.ink} strokeWidth="1.6"
                strokeLinecap="round"/>
            </svg>
            <span style={{ fontSize:15, fontWeight:600, color: STEEP.ink,
              letterSpacing:"-0.01em" }}>Save to Playbook</span>
          </button>
        )}
      </div>

      {showSheet && (
        <AddToPlaybookSheet
          play={play}
          onClose={() => setShowSheet(false)}
          onSaved={(name) => { setSavedTo(name); setShowSheet(false); }}
        />
      )}

      {showShareSheet && (
        <ClipShareSheet play={play} onClose={() => setShowShareSheet(false)} />
      )}
    </div>
  );
}

// ─── FEED SCREEN (TikTok-style) ───────────────────────────────────────────────
function FeedScreen() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [pullY, setPullY] = useState(0);        // 0–1 pull progress
  const scrollRef  = useRef<HTMLDivElement>(null);
  const touchStart = useRef<number>(0);
  const pulling    = useRef(false);

  const THRESHOLD = 64; // px to trigger refresh

  // ── Scroll tracking for active card ──────────────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const idx = Math.round(el.scrollTop / el.clientHeight);
      setActiveIdx(idx);
    };
    el.addEventListener("scroll", onScroll, { passive:true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ── Pull-to-refresh touch handlers ───────────────────────────────────────
  function onTouchStart(e: React.TouchEvent) {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;       // only when at top
    touchStart.current = e.touches[0].clientY;
    pulling.current = true;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!pulling.current || refreshing) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) { pulling.current = false; return; }
    const dy = e.touches[0].clientY - touchStart.current;
    if (dy <= 0) return;
    // Rubber-band: slow down pull the further you go
    setPullY(Math.min(dy / THRESHOLD, 1));
  }

  function onTouchEnd() {
    if (!pulling.current) return;
    pulling.current = false;
    if (pullY >= 1) {
      setRefreshing(true);
      setPullY(0);
      // Simulate network refresh
      setTimeout(() => setRefreshing(false), 1600);
    } else {
      setPullY(0);
    }
  }

  // Pull indicator: translate + opacity
  const pullOffset = refreshing ? THRESHOLD : pullY * THRESHOLD;
  const spinDeg    = pullY * 270;

  return (
    <div style={{ position:"relative", width:"100%", height:"100%", overflow:"hidden" }}>

      {/* Pull-to-refresh indicator */}
      <div style={{
        position:"absolute", top:0, left:0, right:0, zIndex:20,
        display:"flex", justifyContent:"center",
        pointerEvents:"none",
        transform:`translateY(${Math.min(pullOffset - 48, 16)}px)`,
        transition: pulling.current ? "none" : "transform .3s cubic-bezier(.25,.46,.45,.94)",
        opacity: refreshing ? 1 : pullY,
      }}>
        <div style={{
          width:36, height:36, borderRadius:"50%",
          background:"rgba(0,0,0,0.55)", backdropFilter:"blur(12px)",
          border:"1px solid rgba(255,255,255,0.14)",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          {refreshing ? (
            // Spinning loader while refreshing
            <div style={{ width:18, height:18, borderRadius:"50%",
              border:"2px solid rgba(255,255,255,0.2)",
              borderTop:"2px solid rgba(255,255,255,0.9)",
              animation:"spin 0.7s linear infinite" }} />
          ) : (
            // Arrow that rotates as you pull — flips at threshold
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
              style={{ transform:`rotate(${pullY >= 1 ? 180 : spinDeg}deg)`,
                transition:"transform .15s ease" }}>
              <path d="M8 3v8M5 8l3 3 3-3" stroke="rgba(255,255,255,0.85)"
                strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      </div>

      {/* Header */}
      <div style={{ position:"absolute", top:0, left:0, right:0, zIndex:5,
        display:"flex", justifyContent:"center", alignItems:"center",
        paddingTop:12, paddingBottom:8,
        background:"linear-gradient(rgba(0,0,0,0.5), transparent)" }}>
        {/* Debug tap-to-refresh (mousedown triggers refresh for desktop preview) */}
        <span
          onMouseDown={() => { setRefreshing(true); setTimeout(() => setRefreshing(false), 1600); }}
          style={{ fontSize:15, fontWeight:600, color:"rgba(255,255,255,0.9)",
            letterSpacing:"-0.01em", cursor:"default", userSelect:"none" }}>
          {refreshing ? "Refreshing…" : "For You"}
        </span>
      </div>

      {/* Streak badge — top right corner */}
      <StreakBadge />

      {/* Snap scroll */}
      <div
        ref={scrollRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{ height:"100%", overflowY:"scroll",
          scrollSnapType:"y mandatory", WebkitOverflowScrolling:"touch" as any,
          scrollbarWidth:"none", msOverflowStyle:"none" as any,
          transform: pullY > 0 && !refreshing
            ? `translateY(${pullY * THRESHOLD * 0.4}px)` : "none",
          transition: pulling.current ? "none" : "transform .3s cubic-bezier(.25,.46,.45,.94)",
        }}
        className="hide-scrollbar">
        {FEED.map((play, i) => (
          <div key={play.id} style={{ height:"100%", scrollSnapAlign:"start",
            scrollSnapStop:"always", flexShrink:0 }}>
            <FeedCard play={play} isActive={activeIdx === i} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pressable row — proper React state, works on touch + mouse ───────────────
function PressRow({ onClick, children, indent = 0 }:
  { onClick:()=>void; children:React.ReactNode; indent?:number }) {
  const [pressed, setPressed] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      style={{ cursor:"pointer", paddingLeft:indent,
        background: pressed ? "rgba(255,255,255,0.04)" : "transparent",
        transition:"background .1s" }}>
      {children}
    </div>
  );
}

// ─── PLAYBOOK SCREEN ──────────────────────────────────────────────────────────
function PlaybookScreen({ navigate }: { navigate:(s:Screen)=>void }) {
  const { isDark } = useTheme();
  const { likedIds } = useLikes();
  const T = th(isDark);
  const totalClips = FEED.length;
  const totalSaved = FEED.filter(p => p.savedAt).length;
  const likedCount = likedIds.size;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%",
      background:T.bg }}>

      {/* Header */}
      <div style={{ padding:"28px 20px 16px", flexShrink:0,
        borderBottom:`1px solid ${T.divider}` }}>
        <div style={{ fontSize:32, fontWeight:400, color:T.text,
          fontFamily:STEEP.serif,
          letterSpacing:"-0.03em", lineHeight:1.1, marginBottom:6 }}>Playbook</div>
        <div style={{ fontSize:13, color:T.textFaint,
          letterSpacing:"-0.009em", fontVariantNumeric:"tabular-nums" }}>
          {totalClips} clips
          <span style={{ margin:"0 6px", opacity:0.4 }}>·</span>
          <span style={{ color:T.accent }}>{totalSaved} saved</span>
        </div>
      </div>

      {/* List */}
      <div style={{ flex:1, overflowY:"auto", padding:"16px 16px 100px",
        display:"flex", flexDirection:"column", gap:10 }}
        className="hide-scrollbar">

        {/* Streak card — self-mastery reward, top of Playbook */}
        <StreakCard />

        {/* ── Liked Plays card ───────────────────────────────────────────── */}
        <PressRow onClick={() => navigate({ id:"liked" })}>
          <div style={{
            background: T.card,
            borderRadius:24, padding:"16px 20px",
            display:"flex", alignItems:"center", gap:14,
            boxShadow: T.cardShadow,
            border:`1px solid ${T.cardBorder}`,
          }}>
            <div style={{ width:44, height:44, borderRadius:12, flexShrink:0,
              background: isDark ? "rgba(255,77,77,0.18)" : "#fde8e8",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="20" height="18" viewBox="0 0 20 18" fill="none">
                <path d="M10 16.5S1 11 1 5.5a4.5 4.5 0 018.54-1.97L10 4l.46-.47A4.5 4.5 0 0119 5.5C19 11 10 16.5 10 16.5z"
                  fill="#c0392b"/>
              </svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, fontWeight:500, color:T.text,
                letterSpacing:"-0.009em", marginBottom:4 }}>Liked Plays</div>
              <div style={{ fontSize:12, color:T.textFaint, letterSpacing:"-0.009em" }}>
                {likedCount} clip{likedCount !== 1 ? "s" : ""}
              </div>
            </div>
            <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
              <path d="M1 1l4 4-4 4" stroke={T.textFaint}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </PressRow>

        {topLevel.map(cat => {
          const col         = catColor(cat.id);
          const kids        = children(cat.id);
          const count       = playsInCat(cat.id).length;
          const saved       = playsInCat(cat.id).filter(p => p.savedAt).length;
          const visibleKids = kids.slice(0, 3);
          const overflow    = kids.length - visibleKids.length;

          return (
            <PressRow key={cat.id} onClick={() => navigate({ id:"category", catId:cat.id })}>
              <div style={{
                background: T.card,
                borderRadius:24, padding:"18px 20px 16px",
                display:"flex", flexDirection:"column", gap:12,
                boxShadow: T.cardShadow,
                border:`1px solid ${T.cardBorder}`,
              }}>

                {/* Name + count */}
                <div style={{ display:"flex", alignItems:"center",
                  justifyContent:"space-between", gap:12 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0,
                      background:col }} />
                    <span style={{ fontSize:16, fontWeight:500,
                      color:T.text, letterSpacing:"-0.009em" }}>{cat.name}</span>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                    <span style={{ fontSize:14, color:T.textFaint,
                      fontVariantNumeric:"tabular-nums", letterSpacing:"-0.009em" }}>{count}</span>
                    <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                      <path d="M1 1l4 4-4 4" stroke={T.textFaint}
                        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height:1, background:T.divider }} />

                {/* Chips + saved */}
                <div style={{ display:"flex", alignItems:"center",
                  justifyContent:"space-between", gap:8 }}>
                  <div style={{ display:"flex", gap:5, flexWrap:"nowrap",
                    overflow:"hidden", minWidth:0 }}>
                    {visibleKids.map(k => (
                      <span key={k.id} style={{ fontSize:11, whiteSpace:"nowrap", flexShrink:0,
                        color:T.textSec, letterSpacing:"-0.009em",
                        background: isDark ? "rgba(255,255,255,0.06)" : STEEP.fog,
                        border:`1px solid ${T.divider}`,
                        borderRadius:999, padding:"3px 9px" }}>
                        {k.name}
                      </span>
                    ))}
                    {overflow > 0 && (
                      <span style={{ fontSize:11, color:T.textFaint,
                        whiteSpace:"nowrap", flexShrink:0 }}>+{overflow}</span>
                    )}
                  </div>
                  {saved > 0 && (
                    <span style={{ fontSize:11, fontWeight:500, flexShrink:0,
                      whiteSpace:"nowrap", color:col,
                      background: isDark ? `${col}18` : `${col}12`,
                      border:`1px solid ${col}30`,
                      borderRadius:999, padding:"3px 9px" }}>
                      {saved} saved
                    </span>
                  )}
                </div>
              </div>
            </PressRow>
          );
        })}
      </div>
    </div>
  );
}

// ─── Mini clip swatch strip ───────────────────────────────────────────────────
function ClipSwatches({ catId, max = 4 }: { catId:string; max?:number }) {
  const { isDark } = useTheme();
  const clips = playsInCat(catId).slice(0, max);
  if (clips.length === 0) return null;
  return (
    <div style={{ display:"flex", gap:3 }}>
      {clips.map(p => (
        <div key={p.id} style={{
          width:28, height:18, borderRadius:4, flexShrink:0,
          position:"relative", overflow:"hidden",
          border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
        }}>
          <PlaybookClipPreview play={p as FeedPlay} />
        </div>
      ))}
    </div>
  );
}

// ─── CATEGORY SCREEN ──────────────────────────────────────────────────────────
function CategoryScreen({ catId, navigate, from }: { catId:string; navigate:(s:Screen)=>void; from?:Screen }) {
  const { isDark } = useTheme();
  const T = th(isDark);
  const cat    = CATEGORIES.find(c => c.id === catId)!;
  const col    = catColor(cat.id);
  const kids   = children(cat.id);
  const direct = playsInCat(cat.id).filter(p => p.categoryId === catId);
  const total  = direct.length + kids.reduce((a,k) => a + playsInCat(k.id).length, 0);

  // Separate populated vs empty subcategories
  const populated = kids.filter(k => playsInCat(k.id).length > 0);
  const empty     = kids.filter(k => playsInCat(k.id).length === 0);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:T.bg }}>

      {/* Back nav */}
      <div style={{ padding:"14px 20px 0", flexShrink:0 }}>
        <button onClick={() => navigate({ id:"playbook" })}
          style={{ background:"none", border:"none", cursor:"pointer",
            padding:"4px 0 14px", display:"flex", alignItems:"center",
            gap:6, color:T.navBackText, fontSize:13 }}>
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
            <path d="M5 1L1 5l4 4" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Playbook
        </button>
      </div>

      <div style={{ flex:1, overflowY:"auto", paddingBottom:100 }}>

        {/* ── Hero header + View All card ─────────────────────────────────── */}
        <div style={{ padding:"0 16px 16px" }}>
          {/* Title row */}
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:26, fontWeight:400, color:T.text,
              fontFamily:STEEP.serif, letterSpacing:"-0.025em", lineHeight:1.1 }}>{cat.name}</div>
            <div style={{ fontSize:12, color:T.textFaint, marginTop:4,
              letterSpacing:"-0.009em" }}>
              {total} clip{total !== 1 ? "s" : ""}
              {kids.length > 0 && ` · ${kids.length} subcategories`}
            </div>
          </div>

          {/* View All card */}
          <PressRow onClick={() => navigate({ id:"grid", catId:cat.id, label:cat.name })}>
            <div style={{
              background: isDark ? `linear-gradient(135deg,${col}20,${col}0a)` : STEEP.apricotWash,
              border:`1px solid ${isDark ? col+"30" : "rgba(167,140,120,0.20)"}`,
              borderRadius:24, padding:"16px 18px",
              display:"flex", alignItems:"center", gap:14,
            }}>
              <div style={{ width:40, height:40, borderRadius:"50%",
                background: isDark ? `${col}25` : "rgba(93,42,26,0.12)",
                display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                <svg width="14" height="16" viewBox="0 0 14 16" fill={isDark ? col : STEEP.rust}>
                  <path d="M2 1.5l10 6.5L2 14.5V1.5z"/>
                </svg>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:15, fontWeight:500,
                  color: isDark ? "#fff" : STEEP.ink,
                  letterSpacing:"-0.009em", marginBottom:4 }}>View All</div>
                <ClipSwatches catId={cat.id} max={5} />
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:22, fontWeight:400, fontFamily:STEEP.serif,
                  color: isDark ? col : STEEP.rust,
                  letterSpacing:"-0.025em", fontVariantNumeric:"tabular-nums",
                  lineHeight:1 }}>{total}</div>
                <div style={{ fontSize:10, color: isDark ? `${col}88` : STEEP.graphite,
                  marginTop:2 }}>clips</div>
              </div>
            </div>
          </PressRow>
        </div>

        {/* ── Subcategories list ───────────────────────────────────────────── */}
        {kids.length > 0 && (
          <div style={{ padding:"0 16px" }}>
            <div style={{ fontSize:11, fontWeight:500, color:T.sectionLabel,
              letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:8 }}>
              Subcategories
            </div>

            <div style={{ background:T.card, borderRadius:20, overflow:"hidden",
              boxShadow:T.cardShadow, border:`1px solid ${T.cardBorder}` }}>
              {populated.map((child, i) => {
                const n = playsInCat(child.id).length;
                return (
                  <div key={child.id}>
                    <PressRow onClick={() => navigate({ id:"category", catId:child.id })}>
                      <div style={{ padding:"13px 16px", display:"flex",
                        alignItems:"center", gap:12 }}>
                        <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0,
                          background:col }} />
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:15, color:T.text,
                            fontWeight:500, letterSpacing:"-0.009em", marginBottom:4 }}>{child.name}</div>
                          <ClipSwatches catId={child.id} max={4} />
                        </div>
                        <div style={{ display:"flex", alignItems:"center",
                          gap:8, flexShrink:0 }}>
                          <span style={{ fontSize:14, color:T.textFaint,
                            fontVariantNumeric:"tabular-nums" }}>{n}</span>
                          <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
                            <path d="M1 1l4 4-4 4" stroke={T.textFaint}
                              strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </PressRow>
                    {i < populated.length - 1 && (
                      <div style={{ height:1, background:T.divider, marginLeft:35 }} />
                    )}
                  </div>
                );
              })}

              {/* Empty subcategories */}
              {empty.length > 0 && populated.length > 0 && (
                <div style={{ height:1, background:T.divider }} />
              )}
              {empty.map((child, i) => (
                <div key={child.id}>
                  <div style={{ padding:"12px 16px", display:"flex",
                    alignItems:"center", gap:12, opacity:0.38 }}>
                    <div style={{ width:7, height:7, borderRadius:"50%", flexShrink:0,
                      background:T.textFaint }} />
                    <span style={{ flex:1, fontSize:15, color:T.textSec,
                      fontWeight:400, letterSpacing:"-0.009em" }}>{child.name}</span>
                    <span style={{ fontSize:12, color:T.textFaint }}>
                      Empty
                    </span>
                  </div>
                  {i < empty.length - 1 && (
                    <div style={{ height:1, background:T.divider, marginLeft:35 }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Direct clips grid */}
        {direct.length > 0 && (
          <div style={{ marginTop:24, padding:"0 16px" }}>
            <div style={{ fontSize:11, fontWeight:500, color:"rgba(255,255,255,0.28)",
              letterSpacing:"0.04em", marginBottom:8 }}>Clips</div>
            <div style={{ borderRadius:14, overflow:"hidden" }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}>
                {direct.map(p => (
                  <div key={p.id}
                    onClick={() => navigate({ id:"clip", playId:p.id, from: from ?? { id:"category", catId } })}
                    style={{ aspectRatio:"2/3",
                      background:`linear-gradient(160deg, ${p.gradient[0]} 0%, #111114 100%)`,
                      cursor:"pointer", position:"relative", overflow:"hidden" }}>

                    <PlaybookClipPreview play={p as FeedPlay} />

                    <div style={{ position:"absolute", top:6, right:7 }}>
                      <svg width="10" height="11" viewBox="0 0 10 11" fill="white" opacity={0.85}>
                        <path d="M1 1.5l8 4-8 4V1.5z"/>
                      </svg>
                    </div>
                    {p.savedAt && (
                      <div style={{ position:"absolute", bottom:5, left:5,
                        background:col, borderRadius:3, padding:"2px 6px",
                        fontSize:9, fontWeight:600, color:"#000" }}>Saved</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {kids.length === 0 && direct.length === 0 && (
          <div style={{ padding:"56px 20px", textAlign:"center",
            color:"rgba(255,255,255,0.22)", fontSize:13 }}>
            No clips in {cat.name} yet
          </div>
        )}
      </div>
    </div>
  );
}

type GridFilter = "recent" | "most-viewed" | "saved";

// ─── ALL CLIPS GRID SCREEN ────────────────────────────────────────────────────
function GridScreen({ catId, label, navigate }: { catId:string; label:string; navigate:(s:Screen)=>void }) {
  const { isDark } = useTheme();
  const T = th(isDark);
  const col       = catColor(catId);
  const all       = playsInCat(catId);
  const total     = all.length;
  const parentCat = CATEGORIES.find(c => c.id === catId);
  const parentId  = parentCat?.parentId;
  const [filter, setFilter] = useState<GridFilter>("recent");

  function goBack() {
    if (parentId) navigate({ id:"category", catId: parentId });
    else navigate({ id:"playbook" });
  }

  const sorted = [...all].sort((a, b) => {
    if (filter === "most-viewed") return b.views - a.views;
    if (filter === "saved")       return (b.savedAt ? 1 : 0) - (a.savedAt ? 1 : 0);
    // recent — newest addedAt first
    return b.addedAt.getTime() - a.addedAt.getTime();
  });

  const filters: { id: GridFilter; label: string }[] = [
    { id:"recent",      label:"Recent"     },
    { id:"most-viewed", label:"Most Viewed" },
    { id:"saved",       label:"Saved"      },
  ];

  function fmtViews(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:T.bg }}>

      {/* Header */}
      <div style={{ padding:"14px 20px 0", flexShrink:0 }}>
        <button onClick={goBack}
          style={{ background:"none", border:"none", cursor:"pointer",
            padding:"4px 0 12px", display:"flex", alignItems:"center",
            gap:6, color:T.navBackText, fontSize:13 }}>
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
            <path d="M5 1L1 5l4 4" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {label}
        </button>
          <div style={{ display:"flex", alignItems:"flex-end",
          justifyContent:"space-between", paddingBottom:14 }}>
          <div>
          <div style={{ fontSize:22, fontWeight:400, color:T.text,
            fontFamily:STEEP.serif,
            letterSpacing:"-0.025em", marginBottom:3 }}>{label}</div>
          <div style={{ fontSize:12, color:T.textFaint, letterSpacing:"-0.009em" }}>
            {total} clip{total !== 1 ? "s" : ""}
          </div>
        </div>
          <div style={{ fontSize:11, color:T.textFaint, paddingBottom:2,
            letterSpacing:"-0.009em" }}>
            {filter === "recent" ? "Newest first"
              : filter === "most-viewed" ? "By views"
              : "Saved first"}
          </div>
        </div>
      </div>

      {/* ── Filter chips ─────────────────────────────────────────────────── */}
      <div style={{ flexShrink:0, borderTop:`1px solid ${T.divider}`,
        borderBottom:`1px solid ${T.divider}`,
        padding:"10px 16px", display:"flex", gap:6,
        background: isDark ? "rgba(0,0,0,0.5)" : STEEP.white,
        backdropFilter: isDark ? "blur(12px)" : "none" }}>
        {filters.map(f => {
          const active = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{
                border: active
                  ? `1px solid ${isDark ? "rgba(255,255,255,0.18)" : STEEP.dove}`
                  : `1px solid ${T.divider}`,
                borderRadius:999,
                padding:"5px 14px",
                background: active
                  ? isDark ? "rgba(255,255,255,0.10)" : STEEP.ink
                  : "transparent",
                color: active
                  ? isDark ? "#fff" : "#fff"
                  : T.textSec,
                fontSize:13, fontWeight: active ? 500 : 400,
                letterSpacing:"-0.009em",
                cursor:"pointer", transition:"all .18s ease",
                whiteSpace:"nowrap",
              }}>
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      <div style={{ flex:1, overflowY:"auto" }}>
        {sorted.length === 0 ? (
          <div style={{ padding:"56px 20px", textAlign:"center",
            color:"rgba(255,255,255,0.22)", fontSize:13 }}>
            No clips in {label} yet
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}>
            {sorted.map(p => (
              <div key={p.id}
                onClick={() => navigate({ id:"clip", playId:p.id, from:{ id:"grid", catId, label } })}
                style={{ aspectRatio:"2/3",
                  background:`linear-gradient(160deg, ${p.gradient[0]} 0%, #111114 100%)`,
                  cursor:"pointer", position:"relative", overflow:"hidden" }}>

                <PlaybookClipPreview play={p as FeedPlay} />

                {/* Play icon */}
                <div style={{ position:"absolute", top:6, right:7 }}>
                  <svg width="10" height="11" viewBox="0 0 10 11" fill="white" opacity={0.8}>
                    <path d="M1 1.5l8 4-8 4V1.5z"/>
                  </svg>
                </div>

                {/* View count — shown when sorting by most-viewed */}
                {filter === "most-viewed" && (
                  <div style={{ position:"absolute", bottom:0, left:0, right:0,
                    background:"linear-gradient(transparent, rgba(0,0,0,0.7))",
                    padding:"12px 5px 5px",
                    display:"flex", alignItems:"center", gap:3 }}>
                    <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
                      <path d="M1 6s2-4 5-4 5 4 5 4-2 4-5 4-5-4-5-4z"
                        stroke="rgba(255,255,255,0.7)" strokeWidth="1.2"/>
                      <circle cx="6" cy="6" r="1.5" fill="rgba(255,255,255,0.7)"/>
                    </svg>
                    <span style={{ fontSize:9, fontWeight:500,
                      color:"rgba(255,255,255,0.75)",
                      fontVariantNumeric:"tabular-nums" }}>
                      {fmtViews(p.views)}
                    </span>
                  </div>
                )}

                {/* Date — shown when sorting by recent */}
                {filter === "recent" && (
                  <div style={{ position:"absolute", bottom:5, right:5 }}>
                    <span style={{ fontSize:9, color:"rgba(255,255,255,0.45)" }}>
                      {p.addedAt.toLocaleDateString("en-US",{ month:"short", day:"numeric" })}
                    </span>
                  </div>
                )}

                {/* Saved chip */}
                {p.savedAt && (
                  <div style={{ position:"absolute", bottom:5, left:5,
                    background:col, borderRadius:3, padding:"2px 5px",
                    fontSize:9, fontWeight:600, color:"#000" }}>Saved</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SINGLE CLIP PLAYER SCREEN ────────────────────────────────────────────────
function ClipPlayerScreen({ playId, from, navigate }:
  { playId:string; from:Screen; navigate:(s:Screen)=>void }) {
  const play = FEED.find(p => p.id === playId) as FeedPlay | undefined;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const streamUrl = usePlaybackStream(play, true);
  const userVideo = play?.videoStoragePath;
  const playbackSrc = userVideo || streamUrl;

  if (!play) return null;
  const cat = CATEGORIES.find(c => c.id === play.categoryId);
  const parent = cat?.parentId ? CATEGORIES.find(c => c.id === cat!.parentId) : null;

  return (
    <div style={{ position:"relative", width:"100%", height:"100%",
      background:"#000", overflow:"hidden" }}
      onClick={() => playbackSrc && setPaused(p => !p)}>

      <PlayMediaBackdrop play={play} />
      {playbackSrc && (
        <NativeClipVideo src={playbackSrc} isActive={true} paused={paused} videoRef={videoRef} />
      )}

      {/* Pause indicator */}
      {playbackSrc && paused && (
        <div style={{ position:"absolute", inset:0, display:"flex",
          alignItems:"center", justifyContent:"center", pointerEvents:"none" }}>
          <div style={{ width:64, height:64, borderRadius:"50%",
            background:"rgba(0,0,0,0.5)", backdropFilter:"blur(12px)",
            border:"1px solid rgba(255,255,255,0.2)",
            display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="20" height="22" viewBox="0 0 20 22" fill="white" style={{ marginLeft:2 }}>
              <path d="M2 2l16 9L2 20V2z"/>
            </svg>
          </div>
        </div>
      )}

      {/* Back button */}
      <button onClick={e => { e.stopPropagation(); navigate(from); }}
        style={{ position:"absolute", top:14, left:14, zIndex:10,
          background:"rgba(0,0,0,0.45)", backdropFilter:"blur(12px)",
          border:"1px solid rgba(255,255,255,0.15)", borderRadius:999,
          padding:"8px 14px 8px 10px",
          display:"flex", alignItems:"center", gap:6,
          color:"#fff", fontSize:13, fontWeight:500, cursor:"pointer" }}>
        <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
          <path d="M5 1L1 5l4 4" stroke="white" strokeWidth="1.5"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Back
      </button>

      {/* Bottom info overlay */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0,
        background:"linear-gradient(transparent, rgba(0,0,0,0.85))",
        padding:"48px 16px 24px", pointerEvents:"none" }}>
        {(parent || cat) && (
          <div style={{ fontSize:11, fontWeight:500, color:"rgba(255,255,255,0.5)",
            letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:6 }}>
            {parent ? `${parent.name}  ›  ${cat?.name}` : cat?.name}
          </div>
        )}
        <div style={{ fontSize:17, fontWeight:600, color:"#fff",
          letterSpacing:"-0.02em", marginBottom:8 }}>{play.title}</div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <PlatformBadge platform={play.platform} />
          <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>
            {play.views.toLocaleString()} views
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── SHARE EXTENSION PREVIEW ──────────────────────────────────────────────────
// Shows exactly what a coach sees when they tap Share → Playbook AI on iOS

const SHARE_URL = "https://x.com/CoachDanCasey/status/1980441997854011558";

const PARENT_CATS = CATEGORIES.filter(c => c.parentId === null);

function ShareExtPreview({ navigate }: { navigate:(s:Screen)=>void }) {
  const { isDark } = useTheme();
  const T = th(isDark);

  const [selectedParent, setSelectedParent] = useState<string|null>(null);
  const [selectedSub,    setSelectedSub]    = useState<string|null>(null);
  const [step, setStep] = useState<"pick"|"saving"|"done">("pick");

  const subs = selectedParent ? CATEGORIES.filter(c => c.parentId === selectedParent) : [];
  const canSave = selectedParent !== null && (subs.length === 0 || selectedSub !== null);

  function handleSave() {
    if (!canSave) return;
    setStep("saving");
    setTimeout(() => setStep("done"), 1200);
    setTimeout(() => navigate({ id:"feed" }), 2600);
  }

  const platform = SHARE_URL.includes("x.com") || SHARE_URL.includes("twitter") ? "Twitter / X"
    : SHARE_URL.includes("instagram") ? "Instagram"
    : SHARE_URL.includes("tiktok") ? "TikTok"
    : "Link";

  // Sheet background: white in light, dark surface in dark
  const sheetBg    = isDark ? "#111114" : STEEP.white;
  const handleCol  = isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)";
  const labelCol   = isDark ? "rgba(255,255,255,0.28)" : STEEP.graphite;
  const chipInactive = isDark ? "rgba(255,255,255,0.07)" : STEEP.fog;
  const chipBorderI  = isDark ? "rgba(255,255,255,0.11)" : "rgba(0,0,0,0.08)";
  const chipTextI    = isDark ? "rgba(255,255,255,0.80)" : STEEP.ash;
  const saveBtnDis   = isDark ? "rgba(255,255,255,0.07)" : STEEP.fog;
  const saveBtnDisTx = isDark ? "rgba(255,255,255,0.22)" : STEEP.dove;
  const sheetShadow  = isDark
    ? "0 -4px 40px rgba(0,0,0,0.55)"
    : "0 -2px 24px rgba(23,25,28,0.10), 0 -1px 0 rgba(0,0,0,0.05)";

  return (
    // Simulates Twitter behind the sheet
    <div style={{ width:"100%", height:"100%", position:"relative", overflow:"hidden",
      background: T.bg, fontFamily: STEEP.sans }}>

      {/* Background — simulated tweet */}
      <div style={{ position:"absolute", inset:0,
        background: isDark
          ? "linear-gradient(180deg,#15202b 0%,#1a2d3f 100%)"
          : "linear-gradient(180deg,#e8f0fe 0%,#f0f4ff 100%)",
        display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"18px 16px", display:"flex", gap:10, marginTop:20 }}>
          <div style={{ width:40, height:40, borderRadius:"50%", flexShrink:0,
            background: isDark ? "#2d4a6e" : STEEP.skyWash }} />
          <div style={{ flex:1 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:4,
              color: isDark ? "rgba(255,255,255,0.9)" : STEEP.ink }}>
              Coach Dan Casey
            </div>
            <div style={{ fontSize:12, lineHeight:1.55, marginBottom:8,
              color: isDark ? "rgba(255,255,255,0.6)" : STEEP.ash }}>
              Beautiful bubble screen concept — WR arc blocks, RB catches flat. Perfect for 2nd & medium.
            </div>
            <div style={{ borderRadius:10, height:130,
              background: isDark ? "#0d1a2e" : STEEP.skyWash,
              border:`1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <circle cx="18" cy="18" r="17"
                  fill={isDark ? "rgba(255,255,255,0.08)" : "rgba(45,107,228,0.12)"}/>
                <path d="M14 12l12 6-12 6V12z"
                  fill={isDark ? "rgba(255,255,255,0.5)" : "rgba(45,107,228,0.6)"}/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Dim overlay */}
      <div style={{ position:"absolute", inset:0,
        background: isDark ? "rgba(0,0,0,0.52)" : "rgba(23,25,28,0.28)" }} />

      {/* Sheet */}
      <div style={{
        position:"absolute", bottom:0, left:0, right:0,
        background: sheetBg,
        borderRadius:"22px 22px 0 0",
        boxShadow: sheetShadow,
        maxHeight:"85%", display:"flex", flexDirection:"column",
      }}>
        {/* Drag handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 6px" }}>
          <div style={{ width:36, height:4, borderRadius:99, background: handleCol }} />
        </div>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between",
          padding:"8px 20px 14px",
          borderBottom:`1px solid ${T.divider}` }}>
          <div>
            <div style={{ fontFamily: STEEP.serif, fontSize:18, fontWeight:500,
              color: T.text, letterSpacing:"-0.01em", marginBottom:4 }}>
              Save to Playbook AI
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5 }}>
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                <path d="M1 6C1 3.24 3.24 1 6 1s5 2.24 5 5-2.24 5-5 5S1 8.76 1 6z"
                  stroke={labelCol} strokeWidth="1.2"/>
                <path d="M6 3.5v2.8l1.5 1.2" stroke={labelCol}
                  strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize:12, color: labelCol, letterSpacing:"0.01em" }}>
                {platform}
              </span>
            </div>
          </div>
          <button onClick={() => navigate({ id:"feed" })}
            style={{ background:"none", border:"none", cursor:"pointer", padding:4,
              marginTop:2 }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="10"
                fill={isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.06)"}/>
              <path d="M7.5 7.5l7 7M14.5 7.5l-7 7"
                stroke={isDark ? "rgba(255,255,255,0.50)" : STEEP.graphite}
                strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex:1, overflowY:"auto", padding:"20px 20px 8px" }}
          className="hide-scrollbar">

          {/* ── Saving state ── */}
          {step === "saving" && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", padding:"44px 0", gap:14 }}>
              <div style={{ width:40, height:40, borderRadius:"50%",
                border:`3px solid ${isDark ? "rgba(93,42,26,0.25)" : STEEP.apricotWash}`,
                borderTop:`3px solid ${STEEP.rust}`,
                animation:"spin 0.8s linear infinite" }} />
              <span style={{ fontSize:15, color: T.textSec }}>Saving clip…</span>
            </div>
          )}

          {/* ── Success state ── */}
          {step === "done" && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", padding:"44px 0", gap:12 }}>
              <div style={{ width:56, height:56, borderRadius:"50%",
                background: isDark ? "rgba(93,42,26,0.18)" : STEEP.apricotWash,
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <svg width="26" height="20" viewBox="0 0 26 20" fill="none">
                  <path d="M2 10l7.5 7.5L24 2" stroke={STEEP.rust} strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={{ fontFamily: STEEP.serif, fontSize:18, fontWeight:500,
                color: T.text, letterSpacing:"-0.01em" }}>
                Clip saved!
              </div>
              <div style={{ fontSize:13, color: T.textSec, textAlign:"center",
                lineHeight:1.5 }}>
                Your play will appear in the feed shortly.
              </div>
            </div>
          )}

          {/* ── Picker ── */}
          {step === "pick" && (<>
            {/* Step 1: Play Type */}
            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:11, fontWeight:600, color: labelCol,
                letterSpacing:"0.08em", marginBottom:10 }}>PLAY TYPE</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {PARENT_CATS.map(cat => {
                  const col = catColor(cat.id);
                  const active = selectedParent === cat.id;
                  return (
                    <button key={cat.id}
                      onClick={() => { setSelectedParent(active ? null : cat.id); setSelectedSub(null); }}
                      style={{
                        background: active ? col : chipInactive,
                        border:`1px solid ${active ? col : chipBorderI}`,
                        borderRadius:999, padding:"8px 16px", cursor:"pointer",
                        fontSize:14, fontWeight: active ? 600 : 400,
                        color: active ? STEEP.white : chipTextI,
                        letterSpacing:"-0.008em",
                        transition:"all .15s ease",
                        boxShadow: active ? STEEP.cardShadow : "none",
                      }}>
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Subcategory */}
            {selectedParent && subs.length > 0 && (
              <div style={{ marginBottom:22 }}>
                <div style={{ fontSize:11, fontWeight:600, color: labelCol,
                  letterSpacing:"0.08em", marginBottom:10 }}>SUB-CATEGORY</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {subs.map(sub => {
                    const active = selectedSub === sub.id;
                    const col = catColor(selectedParent);
                    return (
                      <button key={sub.id}
                        onClick={() => setSelectedSub(active ? null : sub.id)}
                        style={{
                          background: active ? col : chipInactive,
                          border:`1px solid ${active ? col : chipBorderI}`,
                          borderRadius:999, padding:"8px 16px", cursor:"pointer",
                          fontSize:14, fontWeight: active ? 600 : 400,
                          color: active ? STEEP.white : chipTextI,
                          letterSpacing:"-0.008em",
                          transition:"all .15s ease",
                          boxShadow: active ? STEEP.cardShadow : "none",
                        }}>
                        {sub.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>)}
        </div>

        {/* Save button */}
        {step === "pick" && (
          <div style={{ padding:"10px 20px 34px" }}>
            <button onClick={handleSave} disabled={!canSave}
              style={{
                width:"100%", padding:"15px 0", borderRadius:14, border:"none",
                cursor: canSave ? "pointer" : "default",
                background: canSave ? STEEP.ink : saveBtnDis,
                fontSize:16, fontWeight:600, letterSpacing:"-0.01em",
                color: canSave ? STEEP.white : saveBtnDisTx,
                transition:"all .15s ease",
                boxShadow: canSave ? STEEP.cardShadow : "none",
              }}>
              {canSave ? "Save to Playbook" : "Select a Play Type"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── LIKED PLAYS SCREEN ───────────────────────────────────────────────────────
function LikedScreen({ navigate }: { navigate:(s:Screen)=>void }) {
  const { isDark } = useTheme();
  const { likedIds } = useLikes();
  const T = th(isDark);
  const liked = FEED.filter(p => likedIds.has(p.id));
  const thisScreen: Screen = { id:"liked" };
  const [filter, setFilter] = useState<GridFilter>("recent");

  const sorted = [...liked].sort((a, b) => {
    if (filter === "most-viewed") return b.views - a.views;
    return b.addedAt.getTime() - a.addedAt.getTime();
  });

  const filters: { id: GridFilter; label: string }[] = [
    { id:"recent",      label:"Recent"     },
    { id:"most-viewed", label:"Most Viewed" },
  ];

  function fmtViews(n: number) {
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:T.bg }}>
      <div style={{ padding:"14px 20px 0", flexShrink:0 }}>
        <button onClick={() => navigate({ id:"playbook" })}
          style={{ background:"none", border:"none", cursor:"pointer",
            padding:"4px 0 12px", display:"flex", alignItems:"center",
            gap:6, color:T.navBackText, fontSize:13 }}>
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
            <path d="M5 1L1 5l4 4" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Playbook
        </button>
        <div style={{ display:"flex", alignItems:"flex-end",
          justifyContent:"space-between", paddingBottom:14 }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
              <svg width="18" height="16" viewBox="0 0 20 18" fill="none">
                <path d="M10 16.5S1 11 1 5.5a4.5 4.5 0 018.54-1.97L10 4l.46-.47A4.5 4.5 0 0119 5.5C19 11 10 16.5 10 16.5z"
                  fill="#FF4D4D" strokeLinejoin="round"/>
              </svg>
              <div style={{ fontSize:22, fontWeight:700, color:T.text,
                letterSpacing:"-0.025em" }}>Liked Plays</div>
            </div>
            <div style={{ fontSize:12, color:T.textSec }}>
              {liked.length} clip{liked.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div style={{ fontSize:11, color:T.textFaint, paddingBottom:2 }}>
            {filter === "recent" ? "Newest first" : "By views"}
          </div>
        </div>
      </div>

      <div style={{ flexShrink:0, borderTop:`0.5px solid ${T.divider}`,
        borderBottom:`0.5px solid ${T.divider}`,
        padding:"10px 16px", display:"flex", gap:8,
        background: isDark ? "rgba(0,0,0,0.6)" : "rgba(242,242,247,0.85)",
        backdropFilter:"blur(12px)" }}>
        {filters.map(f => {
          const active = filter === f.id;
          return (
            <button key={f.id} onClick={() => setFilter(f.id)}
              style={{
                border: active ? `1px solid ${T.glassBT}` : `1px solid ${T.divider}`,
                borderRadius:999, padding:"6px 14px",
                background: active ? T.glassGrad : "transparent",
                color: active ? T.text : T.textSec,
                fontSize:13, fontWeight: active ? 500 : 400,
                cursor:"pointer", transition:"all .18s ease", whiteSpace:"nowrap",
              }}>
              {f.label}
            </button>
          );
        })}
      </div>

      <div style={{ flex:1, overflowY:"auto" }} className="hide-scrollbar">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:2 }}>
          {sorted.map(p => (
            <div key={p.id}
              onClick={() => navigate({ id:"clip", playId:p.id, from:thisScreen })}
              style={{ aspectRatio:"2/3",
                background:`linear-gradient(160deg, ${p.gradient[0]} 0%, #111114 100%)`,
                cursor:"pointer", position:"relative", overflow:"hidden" }}>
              <PlaybookClipPreview play={p as FeedPlay} />
              <div style={{ position:"absolute", top:6, right:7 }}>
                <svg width="10" height="11" viewBox="0 0 10 11" fill="white" opacity={0.8}>
                  <path d="M1 1.5l8 4-8 4V1.5z"/>
                </svg>
              </div>
              {/* Heart badge */}
              <div style={{ position:"absolute", top:5, left:5 }}>
                <svg width="10" height="9" viewBox="0 0 20 18" fill="#FF4D4D">
                  <path d="M10 16.5S1 11 1 5.5a4.5 4.5 0 018.54-1.97L10 4l.46-.47A4.5 4.5 0 0119 5.5C19 11 10 16.5 10 16.5z"/>
                </svg>
              </div>
              {filter === "most-viewed" && (
                <div style={{ position:"absolute", bottom:0, left:0, right:0,
                  background:"linear-gradient(transparent, rgba(0,0,0,0.7))",
                  padding:"10px 5px 5px", display:"flex", alignItems:"center", gap:3 }}>
                  <span style={{ fontSize:9, fontWeight:500,
                    color:"rgba(255,255,255,0.75)",
                    fontVariantNumeric:"tabular-nums" }}>
                    {fmtViews(p.views)}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Settings row ─────────────────────────────────────────────────────────────
function SettingsRow({ iconBg, iconEl, label, value, last = false, onPress }:
  { iconBg:string; iconEl:React.ReactNode; label:string; value?:string;
    last?:boolean; onPress?:()=>void }) {
  const { isDark } = useTheme();
  const T = th(isDark);
  return (
    <>
      <PressRow onClick={onPress ?? (() => {})}>
        <div style={{ display:"flex", alignItems:"center", gap:12,
          padding:"11px 16px", minHeight:44 }}>
          <div style={{ width:30, height:30, borderRadius:8, background:iconBg,
            border:`1px solid ${T.glassBT}`,
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            {iconEl}
          </div>
          <span style={{ flex:1, fontSize:15, color:T.text }}>{label}</span>
          {value && (
            <span style={{ fontSize:15, color:T.textSec, marginRight:6 }}>{value}</span>
          )}
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
            <path d="M1 1l4 4-4 4" stroke={T.textFaint}
              strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </PressRow>
      {!last && (
        <div style={{ height:0.5, background:T.divider, marginLeft:58 }} />
      )}
    </>
  );
}

function SettingsGroup({ label, children }:
  { label?:string; children:React.ReactNode }) {
  const { isDark } = useTheme();
  const T = th(isDark);
  return (
    <div style={{ marginBottom:20 }}>
      {label && (
        <div style={{ fontSize:11, fontWeight:500,
          color:T.sectionLabel,
          letterSpacing:"0.06em", textTransform:"uppercase",
          padding:"0 4px 7px" }}>{label}</div>
      )}
      <div style={{
        background: T.card,
        border:`1px solid ${T.cardBorder}`,
        boxShadow: T.cardShadow,
        borderRadius:20, overflow:"hidden"
      }}>
        {children}
      </div>
    </div>
  );
}

// ─── PROFILE SCREEN ───────────────────────────────────────────────────────────
type PlanTier = "individual" | "team";
const TEAM_SEAT_MAX = 6;

function ProfileScreen({ onSignOut }: { onSignOut:()=>void }) {
  const { isDark, toggleTheme } = useTheme();
  const toast = useToast();
  const T = th(isDark);
  const [plan]             = useState<PlanTier>("individual"); // mock — swap to "team" to test
  const [signOutConfirm, setSignOutConfirm]   = useState(false);
  const [deleteStep, setDeleteStep]           = useState<0|1|2>(0); // 0=hidden 1=confirm 2=typed

  const clipsUsed = 47;
  const clipsMax  = plan === "individual" ? 75 : 2000;
  const storageRatio = clipsUsed / clipsMax;
  const teamSeatsUsed = 4; // mock — owner counts toward the 6-seat cap

  const planLabel: Record<PlanTier, string> = {
    individual: "Individual",
    team:       "Team",
  };
  const planColor: Record<PlanTier, string> = {
    individual: C.accent,
    team:       C.blue,
  };

  function chevron() {
    return (
      <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
        <path d="M1 1l4 4-4 4" stroke={T.textFaint} strokeWidth="1.6"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%",
      background:T.bg2, overflow:"hidden" }}>
      <div style={{ flex:1, overflowY:"auto", paddingBottom:100 }}
        className="hide-scrollbar">

        {/* ── Avatar + identity ─────────────────────────────────────────── */}
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
          padding:"36px 20px 28px", gap:10,
          borderBottom:`1px solid ${T.divider}` }}>
          <div style={{ width:80, height:80, borderRadius:"50%",
            background: isDark
              ? "linear-gradient(145deg, rgba(255,255,255,0.10), rgba(255,255,255,0.04))"
              : STEEP.skyWash,
            border:`1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(93,130,200,0.20)"}`,
            display:"flex", alignItems:"center", justifyContent:"center",
            marginBottom:4,
            boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.5)" : STEEP.cardShadow }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="13" r="7" fill={isDark ? "rgba(255,255,255,0.55)" : STEEP.graphite}/>
              <path d="M4 34c0-7.732 6.268-14 14-14s14 6.268 14 14"
                fill={isDark ? "rgba(255,255,255,0.55)" : STEEP.graphite}/>
            </svg>
          </div>
          <div style={{ fontSize:20, fontWeight:400, color:T.text,
            fontFamily:STEEP.serif, letterSpacing:"-0.02em" }}>Coach</div>
          <div style={{ fontSize:13, color:T.textFaint, letterSpacing:"-0.009em" }}>coach@team.com</div>
        </div>

        <div style={{ padding:"0 16px" }}>

          {/* ── Plan ──────────────────────────────────────────────────────── */}
          <SettingsGroup label="Plan">
            {/* Current tier row */}
            <PressRow onClick={() => toast(plan === "individual"
              ? "Team plan — up to 6 coaches, one shared playbook"
              : "Manage your subscription")}>
              <div style={{ display:"flex", alignItems:"center", gap:12,
                padding:"11px 16px", minHeight:44 }}>
                <div style={{ width:30, height:30, borderRadius:8,
                  background: isDark ? `${planColor[plan]}22` : `${planColor[plan]}15`,
                  border:`1px solid ${T.divider}`,
                  display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 11L5 2l3 6 2-3 2 6"
                      stroke={planColor[plan]} strokeWidth="1.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:15, color:T.text }}>{planLabel[plan]}</div>
                  <div style={{ fontSize:11, color:T.textSec, marginTop:2 }}>
                    {plan === "individual"
                      ? "1 coach · personal playbook"
                      : `Up to ${TEAM_SEAT_MAX} coaches · shared playbook`}
                  </div>
                </div>
                {plan === "individual" ? (
                  <div style={{ background:STEEP.ink, borderRadius:999,
                    padding:"5px 12px", cursor:"pointer" }}>
                    <span style={{ fontSize:12, fontWeight:500, color:"#fff",
                      letterSpacing:"-0.009em" }}>
                      Go Team
                    </span>
                  </div>
                ) : (
                  <>
                    <span style={{ fontSize:13, color:planColor[plan],
                      fontWeight:500, marginRight:6 }}>Active</span>
                    {chevron()}
                  </>
                )}
              </div>
            </PressRow>

            {/* Manage Team — only for team tier */}
            {plan === "team" && (
              <>
                <div style={{ height:0.5, background:T.divider, marginLeft:58 }} />
                <PressRow onClick={() => toast("Team management coming soon")}>
                  <div style={{ display:"flex", alignItems:"center", gap:12,
                    padding:"11px 16px", minHeight:44 }}>
                    <div style={{ width:30, height:30, borderRadius:8,
                      background:`${C.blue}22`, border:`1px solid ${T.glassBT}`,
                      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                      <svg width="15" height="12" viewBox="0 0 15 12" fill="none">
                        <circle cx="5" cy="4" r="2.5" stroke={C.blue} strokeWidth="1.4"/>
                        <circle cx="10.5" cy="4" r="2.5" stroke={C.blue} strokeWidth="1.4"/>
                        <path d="M1 11c0-2.21 1.79-4 4-4M14 11c0-2.21-1.79-4-4-4M5 7c1.1 0 2.1.45 2.83 1.17"
                          stroke={C.blue} strokeWidth="1.4" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, color:T.text }}>Manage Team</div>
                      <div style={{ fontSize:11, color:T.textSec, marginTop:2 }}>
                        Westfield Prep · {teamSeatsUsed} of {TEAM_SEAT_MAX} seats
                      </div>
                    </div>
                    {chevron()}
                  </div>
                </PressRow>
              </>
            )}
          </SettingsGroup>

          {/* ── Library ───────────────────────────────────────────────────── */}
          <SettingsGroup label="Library">
            <SettingsRow onPress={() => toast("Sharing & Import coming soon")}
              iconBg="rgba(76,217,100,0.18)" label="Sharing & Import"
              iconEl={<svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 1v9M3 5l4.5-4L12 5" stroke="#4cd964" strokeWidth="1.6"
                  strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 11v2a1 1 0 001 1h11a1 1 0 001-1v-2"
                  stroke="#4cd964" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>}
            />

            {/* Storage — custom row with progress bar */}
            <div style={{ height:0.5, background:T.divider, marginLeft:58 }} />
            <PressRow onClick={() => toast("Storage management coming soon")}>
              <div style={{ padding:"11px 16px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12,
                  marginBottom:8 }}>
                  <div style={{ width:30, height:30, borderRadius:8, flexShrink:0,
                    background:"rgba(255,200,60,0.18)", border:`1px solid ${T.glassBT}`,
                    display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <svg width="13" height="14" viewBox="0 0 13 14" fill="none">
                      <rect x="1" y="4" width="11" height="9" rx="2"
                        stroke="#ffc83c" strokeWidth="1.4"/>
                      <path d="M4 4V3a2.5 2.5 0 015 0v1"
                        stroke="#ffc83c" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span style={{ flex:1, fontSize:15, color:T.text }}>Storage</span>
                  <span style={{ fontSize:12, color:T.textSec,
                    fontVariantNumeric:"tabular-nums" }}>
                    {clipsUsed} of {clipsMax} clips
                  </span>
                  {chevron()}
                </div>
                {/* Progress bar */}
                <div style={{ marginLeft:42, height:3, borderRadius:99,
                  background:T.divider, overflow:"hidden" }}>
                  <div style={{ height:"100%", borderRadius:99,
                    width:`${storageRatio * 100}%`,
                    background: storageRatio > 0.85
                      ? C.red
                      : storageRatio > 0.6
                      ? C.orange
                      : C.accent,
                    transition:"width .4s ease"
                  }} />
                </div>
              </div>
            </PressRow>

            <div style={{ height:0.5, background:T.divider, marginLeft:58 }} />
            <SettingsRow onPress={() => toast("Export Playbook coming soon")}
              iconBg="rgba(66,214,214,0.18)" label="Export Playbook"
              iconEl={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v8M4 6l3 3 3-3" stroke="#42d6d6" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 10v2a1 1 0 001 1h10a1 1 0 001-1v-2"
                  stroke="#42d6d6" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>}
            />
            <SettingsRow onPress={() => toast("Notification settings coming soon")}
              iconBg="rgba(92,156,255,0.18)" label="Notifications" value="On" last
              iconEl={<svg width="14" height="15" viewBox="0 0 14 15" fill="none">
                <path d="M7 1a5 5 0 015 5v3l1.5 2H.5L2 9V6a5 5 0 015-5z"
                  stroke="#5c9cff" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M5.5 13a1.5 1.5 0 003 0" stroke="#5c9cff" strokeWidth="1.5"/>
              </svg>}
            />
          </SettingsGroup>

          {/* ── Appearance ────────────────────────────────────────────────── */}
          <SettingsGroup label="Appearance">
            <SettingsRow
              iconBg="rgba(181,107,255,0.18)"
              label="Theme"
              value={isDark ? "Dark" : "Light"}
              last
              onPress={toggleTheme}
              iconEl={isDark
                ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M12.5 9A6 6 0 015 1.5a6 6 0 100 11 6 6 0 007.5-3.5z"
                      stroke="#b56bff" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                : <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <circle cx="7" cy="7" r="3" stroke="#b56bff" strokeWidth="1.5"/>
                    <path d="M7 1v1M7 12v1M1 7h1M12 7h1M2.9 2.9l.7.7M10.4 10.4l.7.7M2.9 11.1l.7-.7M10.4 3.6l.7-.7"
                      stroke="#b56bff" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
              }
            />
          </SettingsGroup>

          {/* ── Legal ─────────────────────────────────────────────────────── */}
          <SettingsGroup label="Legal">
            <SettingsRow onPress={() => window.open("https://apple.com/legal/privacy", "_blank")}
              iconBg="rgba(255,255,255,0.08)" label="Privacy Policy"
              iconEl={<svg width="13" height="14" viewBox="0 0 13 14" fill="none">
                <path d="M6.5 1L1 3.5v4C1 10.5 3.5 13 6.5 13S12 10.5 12 7.5v-4L6.5 1z"
                  stroke={T.textSec} strokeWidth="1.4" strokeLinejoin="round"/>
                <path d="M4.5 7l1.5 1.5 2.5-2.5"
                  stroke={T.textSec} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>}
            />
            <SettingsRow onPress={() => window.open("https://apple.com/legal/internet-services/itunes/us/terms.html", "_blank")}
              iconBg="rgba(255,255,255,0.08)" label="Terms of Service" last
              iconEl={<svg width="13" height="14" viewBox="0 0 13 14" fill="none">
                <rect x="2" y="1" width="9" height="12" rx="1.5"
                  stroke={T.textSec} strokeWidth="1.4"/>
                <path d="M4.5 5h4M4.5 7.5h4M4.5 10h2.5"
                  stroke={T.textSec} strokeWidth="1.4" strokeLinecap="round"/>
              </svg>}
            />
          </SettingsGroup>

          {/* ── Support ───────────────────────────────────────────────────── */}
          <SettingsGroup label="Support">
            <SettingsRow onPress={() => toast("How It Works guide coming soon")}
              iconBg="rgba(92,156,255,0.18)" label="How It Works"
              iconEl={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#5c9cff" strokeWidth="1.4"/>
                <path d="M7 9.5V7M7 4.5v.5" stroke="#5c9cff" strokeWidth="1.6"
                  strokeLinecap="round"/>
              </svg>}
            />
            <SettingsRow onPress={() => toast("Feedback form coming soon")}
              iconBg="rgba(255,154,60,0.18)" label="Send Feedback"
              iconEl={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1h12v9H8l-4 3V10H1V1z"
                  stroke="#ff9a3c" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>}
            />
            <SettingsRow onPress={() => toast("Rate us on the App Store — coming soon")}
              iconBg="rgba(92,156,255,0.18)" label="Rate Playbook" last
              iconEl={<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1l1.8 3.6L13 5.3l-3 2.9.7 4.1L7 10.4 3.3 12.3l.7-4.1-3-2.9 4.2-.7z"
                  stroke="#5c9cff" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>}
            />
          </SettingsGroup>

          {/* ── Sign Out ──────────────────────────────────────────────────── */}
          {!signOutConfirm ? (
            <div style={{
              background:"linear-gradient(160deg, rgba(255,77,77,0.08) 0%, rgba(255,77,77,0.03) 100%)",
              borderTop:"1px solid rgba(255,77,77,0.18)", borderLeft:"1px solid rgba(255,77,77,0.09)",
              borderRight:"1px solid rgba(255,77,77,0.05)", borderBottom:"1px solid rgba(255,77,77,0.03)",
              borderRadius:14, overflow:"hidden", marginBottom:12
            }}>
              <PressRow onClick={() => setSignOutConfirm(true)}>
                <div style={{ padding:"13px 16px", textAlign:"center" }}>
                  <span style={{ fontSize:15, color:C.red }}>Sign Out</span>
                </div>
              </PressRow>
            </div>
          ) : (
            <div style={{
              background:"linear-gradient(160deg, rgba(255,77,77,0.1) 0%, rgba(255,77,77,0.04) 100%)",
              borderTop:"1px solid rgba(255,77,77,0.22)", borderLeft:"1px solid rgba(255,77,77,0.10)",
              borderRight:"1px solid rgba(255,77,77,0.06)", borderBottom:"1px solid rgba(255,77,77,0.03)",
              borderRadius:14, overflow:"hidden", marginBottom:12
            }}>
              <div style={{ padding:"14px 16px 6px", textAlign:"center" }}>
                <div style={{ fontSize:13, color:T.textSec, marginBottom:10 }}>
                  Sign out of Playbook?
                </div>
                <button onClick={onSignOut} style={{ width:"100%", background:"none",
                  border:"none", padding:"9px", cursor:"pointer",
                  borderTop:`0.5px solid ${T.divider}`,
                  color:C.red, fontSize:16, fontWeight:600 }}>
                  Sign Out
                </button>
              </div>
              <div style={{ height:0.5, background:T.divider }} />
              <PressRow onClick={() => setSignOutConfirm(false)}>
                <div style={{ padding:"12px 16px", textAlign:"center" }}>
                  <span style={{ fontSize:15, color:T.text }}>Cancel</span>
                </div>
              </PressRow>
            </div>
          )}

          {/* ── Delete Account (Apple required — hard App Store rule) ──────── */}
          {deleteStep === 0 && (
            <div style={{
              background: T.glassGrad,
              borderTop:`1px solid ${T.glassBT}`, borderLeft:`1px solid ${T.glassBL}`,
              borderRight:`1px solid ${T.glassBR}`, borderBottom:`1px solid ${T.glassBB}`,
              borderRadius:14, overflow:"hidden"
            }}>
              <PressRow onClick={() => setDeleteStep(1)}>
                <div style={{ padding:"13px 16px", textAlign:"center" }}>
                  <span style={{ fontSize:15, color:C.red, opacity:0.7 }}>
                    Delete Account
                  </span>
                </div>
              </PressRow>
            </div>
          )}

          {deleteStep === 1 && (
            <div style={{
              background:"linear-gradient(160deg, rgba(255,77,77,0.08) 0%, rgba(255,77,77,0.03) 100%)",
              borderTop:"1px solid rgba(255,77,77,0.2)", borderLeft:"1px solid rgba(255,77,77,0.10)",
              borderRight:"1px solid rgba(255,77,77,0.06)", borderBottom:"1px solid rgba(255,77,77,0.03)",
              borderRadius:14, padding:"16px", overflow:"hidden"
            }}>
              <div style={{ textAlign:"center", marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:600, color:C.red,
                  marginBottom:6 }}>Delete Account?</div>
                <div style={{ fontSize:12, color:T.textSec, lineHeight:1.5 }}>
                  This permanently deletes your account, all saved clips, and playbook data. This cannot be undone.
                </div>
              </div>
              <button onClick={() => setDeleteStep(2)}
                style={{ width:"100%", background:"rgba(255,77,77,0.15)",
                  border:"1px solid rgba(255,77,77,0.3)", borderRadius:10, padding:"11px",
                  cursor:"pointer", color:C.red, fontSize:14, fontWeight:600,
                  marginBottom:8 }}>
                Yes, Delete My Account
              </button>
              <PressRow onClick={() => setDeleteStep(0)}>
                <div style={{ textAlign:"center", padding:"8px" }}>
                  <span style={{ fontSize:14, color:T.textSec }}>Cancel</span>
                </div>
              </PressRow>
            </div>
          )}

          {deleteStep === 2 && (
            <div style={{
              background:"linear-gradient(160deg, rgba(255,77,77,0.12) 0%, rgba(255,77,77,0.05) 100%)",
              borderTop:"1px solid rgba(255,77,77,0.25)", borderLeft:"1px solid rgba(255,77,77,0.12)",
              borderRight:"1px solid rgba(255,77,77,0.07)", borderBottom:"1px solid rgba(255,77,77,0.04)",
              borderRadius:14, padding:"16px", overflow:"hidden"
            }}>
              <div style={{ textAlign:"center", marginBottom:12 }}>
                <div style={{ fontSize:14, fontWeight:600, color:C.red, marginBottom:6 }}>
                  Final confirmation
                </div>
                <div style={{ fontSize:12, color:T.textSec, lineHeight:1.5 }}>
                  Type <span style={{ color:C.red, fontWeight:600 }}>DELETE</span> to confirm
                </div>
              </div>
              <DeleteConfirmInput onConfirmed={onSignOut} onCancel={() => setDeleteStep(0)} />
            </div>
          )}

          <div style={{ textAlign:"center", padding:"28px 0 8px" }}>
            <div style={{ fontSize:12, color:T.textFaint }}>Playbook 1.0.0</div>
          </div>

        </div>
      </div>
    </div>
  );
}

// Separate component so it has its own state ─────────────────────────────────
function DeleteConfirmInput({ onConfirmed, onCancel }:
  { onConfirmed:()=>void; onCancel:()=>void }) {
  const { isDark } = useTheme();
  const T = th(isDark);
  const [val, setVal] = useState("");
  const ready = val.trim().toUpperCase() === "DELETE";
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder="Type DELETE"
        autoCapitalize="none"
        style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
          border:`1px solid ${ready ? "rgba(255,77,77,0.5)" : T.glassBT}`,
          borderRadius:10, padding:"10px 14px", color:T.text,
          fontSize:14, outline:"none", textAlign:"center",
          letterSpacing:"0.06em" }}
      />
      <button onClick={onConfirmed} disabled={!ready}
        style={{ background: ready ? C.red : "rgba(255,77,77,0.2)",
          border:"none", borderRadius:10, padding:"11px",
          cursor: ready ? "pointer" : "default",
          color: ready ? "#fff" : "rgba(255,255,255,0.3)",
          fontSize:14, fontWeight:600, transition:"all .2s" }}>
        Permanently Delete Account
      </button>
      <PressRow onClick={onCancel}>
        <div style={{ textAlign:"center", padding:"8px" }}>
          <span style={{ fontSize:14, color:T.textSec }}>Cancel</span>
        </div>
      </PressRow>
    </div>
  );
}

// ─── XS & OS ANIMATION ───────────────────────────────────────────────────────
function XsAndOsAnimation() {
  const DUR      = "5s";
  // WR & CB movement keyTimes (6 frames)
  const KT6      = "0;0.14;0.30;0.50;0.80;1";
  const KS5      = "0 0 1 1;0.4 0 0.2 1;0.4 0 0.2 1;0 0 1 1;1 0 1 1";
  // DL rush keyTimes (5 frames)
  const DL_KT    = "0;0.14;0.30;0.80;1";
  const DL_KS    = "0 0 1 1;0.4 0 0.2 1;0 0 1 1;1 0 1 1";
  // post-route path length ≈ 98.4  →  dasharray 103
  const DASH_LEN = 103;
  // Colors
  const X_COLOR  = "#FFFFFF";   // offense — white
  const O_COLOR  = "#5BAAFF";   // defense — blue

  // Static offensive X player
  const XPlayer = ({ x, y, size = 5 }: { x:number; y:number; size?:number }) => (
    <g transform={`translate(${x},${y})`}>
      <line x1={-size} y1={-size} x2={size} y2={size}
        stroke={X_COLOR} strokeWidth="2" strokeLinecap="round"/>
      <line x1={size} y1={-size} x2={-size} y2={size}
        stroke={X_COLOR} strokeWidth="2" strokeLinecap="round"/>
    </g>
  );

  return (
    <div style={{
      width:200, height:240, borderRadius:0,
      overflow:"hidden", position:"relative",
      background:"transparent",
    }}>
      <svg viewBox="0 0 200 240" width="200" height="240">

        {/* Transparent field — inherits auth screen background */}
        <rect width="200" height="240" fill="transparent" />

        {/* Hash marks */}
        {[38,62,86,110,132,156,180].filter(y => y < 240).map(y => (
          <g key={y}>
            <line x1="18" y1={y} x2="26" y2={y}
              stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"/>
            <line x1="174" y1={y} x2="182" y2={y}
              stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"/>
          </g>
        ))}

        {/* Scrimmage line */}
        <line x1="12" y1="105" x2="188" y2="105"
          stroke="rgba(255,200,60,0.55)" strokeWidth="1" strokeDasharray="5 4"/>
        <text x="14" y="101" fontSize="5.5" fill="rgba(255,200,60,0.55)"
          fontFamily="Inter,sans-serif" fontWeight="500">LOS</text>

        {/* ── Post route (draws 0.7s–2.5s, holds, resets) ── */}
        <path d="M 174 107 L 174 56 L 124 22"
          fill="none" stroke="#33D67D" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={DASH_LEN} strokeDashoffset={DASH_LEN}>
          <animate attributeName="stroke-dashoffset"
            values={`${DASH_LEN};${DASH_LEN};0;0;${DASH_LEN}`}
            keyTimes="0;0.14;0.50;0.80;1"
            dur={DUR} repeatCount="indefinite" calcMode="linear"/>
        </path>

        {/* Endpoint glow ring */}
        <circle cx={124} cy={22} r={10}
          fill="none" stroke="#33D67D" strokeWidth="0.9" opacity="0">
          <animate attributeName="opacity"
            values="0;0;0;0.50;0.50;0"
            keyTimes="0;0.14;0.50;0.56;0.80;1"
            dur={DUR} repeatCount="indefinite"/>
          <animate attributeName="r"
            values="10;10;10;13;10;10"
            keyTimes="0;0.14;0.50;0.70;0.80;1"
            dur={DUR} repeatCount="indefinite" calcMode="spline"
            keySplines="0 0 1 1;0 0 1 1;0.4 0 0.2 1;0.4 0 0.2 1;0 0 1 1"/>
        </circle>

        {/* "POST" label */}
        <text x="124" y="13" textAnchor="middle" fontSize="7"
          fill="#33D67D" fontFamily="Inter,sans-serif" fontWeight="700"
          letterSpacing="0.07em" opacity="0">
          {"POST"}
          <animate attributeName="opacity"
            values="0;0;0;0.90;0.90;0"
            keyTimes="0;0.14;0.50;0.56;0.80;1"
            dur={DUR} repeatCount="indefinite"/>
        </text>

        {/* ── DEFENSE (O's — blue) ─────────────────────────────── */}
        {/* DL1 — rushes into blockers at snap */}
        <circle r={8} fill="#070709" stroke={O_COLOR} strokeWidth="2">
          <animate attributeName="cx" values="68;68;68;68;68"
            keyTimes={DL_KT} dur={DUR} repeatCount="indefinite"/>
          <animate attributeName="cy" values="78;78;97;97;78"
            keyTimes={DL_KT} dur={DUR} repeatCount="indefinite"
            calcMode="spline" keySplines={DL_KS}/>
        </circle>
        {/* DL2 — rushes into blockers */}
        <circle r={8} fill="#070709" stroke={O_COLOR} strokeWidth="2">
          <animate attributeName="cx" values="98;98;98;98;98"
            keyTimes={DL_KT} dur={DUR} repeatCount="indefinite"/>
          <animate attributeName="cy" values="76;76;97;97;76"
            keyTimes={DL_KT} dur={DUR} repeatCount="indefinite"
            calcMode="spline" keySplines={DL_KS}/>
        </circle>
        {/* DL3 — rushes into blockers */}
        <circle r={8} fill="#070709" stroke={O_COLOR} strokeWidth="2">
          <animate attributeName="cx" values="128;128;128;128;128"
            keyTimes={DL_KT} dur={DUR} repeatCount="indefinite"/>
          <animate attributeName="cy" values="78;78;97;97;78"
            keyTimes={DL_KT} dur={DUR} repeatCount="indefinite"
            calcMode="spline" keySplines={DL_KS}/>
        </circle>

        {/* CB — tracks WR but gets beaten */}
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="174,78; 174,78; 173,52; 160,36; 160,36; 174,78"
            keyTimes={KT6} dur={DUR} repeatCount="indefinite"
            calcMode="spline" keySplines={KS5}/>
          <circle r={8} fill="#070709" stroke={O_COLOR} strokeWidth="2"/>
        </g>

        {/* ── OFFENSE (X's — white) ─────────────────────────── */}
        {/* Offensive line (4 blockers) */}
        <XPlayer x={62}  y={108}/>
        <XPlayer x={80}  y={108}/>
        <XPlayer x={98}  y={108}/>
        <XPlayer x={116} y={108}/>

        {/* QB — shotgun depth */}
        <XPlayer x={88} y={132} size={6}/>
        <text x="88" y="145" textAnchor="middle" fontSize="5.5"
          fill="rgba(255,255,255,0.45)" fontFamily="Inter,sans-serif" fontWeight="500">
          QB
        </text>

        {/* WR — animates along post route */}
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="174,107; 174,107; 174,56; 124,22; 124,22; 174,107"
            keyTimes={KT6} dur={DUR} repeatCount="indefinite"
            calcMode="spline" keySplines={KS5}/>
          <line x1="-5.5" y1="-5.5" x2="5.5" y2="5.5"
            stroke={X_COLOR} strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="5.5" y1="-5.5" x2="-5.5" y2="5.5"
            stroke={X_COLOR} strokeWidth="2.2" strokeLinecap="round"/>
        </g>

      </svg>
    </div>
  );
}

// ─── STREAK COMPONENTS ────────────────────────────────────────────────────────
// Subtle badge for the top of the feed. Only appears when streak > 0.
function StreakBadge() {
  const { streak } = useStreak();
  if (streak.count === 0) return null;
  return (
    <div style={{
      position:"absolute", top:16, right:16, zIndex:6,
      display:"flex", alignItems:"center", gap:5,
      padding:"6px 10px", borderRadius:99,
      background:"rgba(0,0,0,0.35)",
      backdropFilter:"blur(10px)",
      WebkitBackdropFilter:"blur(10px)",
      border:"1px solid rgba(255,255,255,0.12)",
    }}>
      <FlameIcon size={13} />
      <span style={{ fontSize:12.5, fontWeight:600, color:"#fff",
        letterSpacing:"-0.005em", fontVariantNumeric:"tabular-nums" }}>
        {streak.count}
      </span>
    </div>
  );
}

// Larger streak card for the Playbook screen — self-mastery reward
function StreakCard() {
  const { streak } = useStreak();
  const { isDark } = useTheme();
  const T = th(isDark);
  const hasStreak = streak.count > 0;
  const nextMilestone = streak.count < 7 ? 7 : streak.count < 30 ? 30 : streak.count < 100 ? 100 : 365;
  const daysToNext = nextMilestone - streak.count;

  return (
    <div style={{
      background: T.card,
      border:`1px solid ${T.cardBorder}`,
      borderRadius:18, padding:"14px 16px",
      display:"flex", alignItems:"center", gap:12,
      boxShadow: T.cardShadow,
    }}>
      <div style={{
        width:44, height:44, borderRadius:"50%",
        background: hasStreak ? T.warm : (isDark ? "rgba(255,255,255,0.06)" : STEEP.fog),
        display:"flex", alignItems:"center", justifyContent:"center",
        flexShrink:0,
      }}>
        <FlameIcon size={22} color={hasStreak ? (isDark ? "#ff9366" : STEEP.rust) : T.textFaint} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
          <span style={{ fontFamily:STEEP.serif, fontSize:22, fontWeight:400,
            color:T.text, letterSpacing:"-0.02em", lineHeight:1,
            fontVariantNumeric:"tabular-nums" }}>
            {streak.count}
          </span>
          <span style={{ fontSize:13, color:T.textSec, letterSpacing:"-0.009em" }}>
            day streak
          </span>
        </div>
        <div style={{ fontSize:12, color:T.textFaint, marginTop:2,
          letterSpacing:"-0.005em" }}>
          {hasStreak
            ? `${daysToNext} day${daysToNext === 1 ? "" : "s"} to ${nextMilestone}-day badge`
            : "Save a play today to start your streak"}
        </div>
      </div>
      {streak.freezes > 0 && (
        <div style={{ display:"flex", alignItems:"center", gap:4,
          padding:"5px 9px", borderRadius:99,
          background: isDark ? "rgba(180,210,255,0.15)" : "#e8f0f5",
          border: isDark ? "1px solid rgba(180,210,255,0.2)" : "1px solid #d1dde6",
          flexShrink:0 }}>
          <span style={{ fontSize:11 }}>❄️</span>
          <span style={{ fontSize:11, fontWeight:600,
            color: isDark ? "#a8c9de" : "#4a6b7c",
            letterSpacing:"-0.005em", fontVariantNumeric:"tabular-nums" }}>
            {streak.freezes}
          </span>
        </div>
      )}
    </div>
  );
}

function FlameIcon({ size = 16, color = "#ff6a3d" }: { size?:number; color?:string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2c1 3.5 4 5 4 8.5a4 4 0 01-8 0c0-1 .3-2 .8-3-.8.5-1.8 2-1.8 4a5.2 5.2 0 0010.4 0c0-4.5-3.5-6.5-5.4-9.5z"
        fill={color}/>
      <path d="M12 12c.5 1.5 2 2.2 2 4a2 2 0 01-4 0c0-1.5 1-2.5 2-4z"
        fill="#ffd44d"/>
    </svg>
  );
}

// Milestone celebration modal — shown when user hits 7, 30, 100, 365 day streak
function MilestoneModal({ count, onClose }: { count:number; onClose:()=>void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const title = count === 7 ? "One week strong"
    : count === 30 ? "A month in the books"
    : count === 100 ? "Triple digits"
    : "365 days";
  const subtitle = count === 7 ? "You just hit a 7-day streak. This is where it gets easier."
    : count === 30 ? "A month of building your playbook. The habit is real now."
    : count === 100 ? "100 days. Most coaches never make it here."
    : "A full year of Playbook. You're in rare company.";

  function close() {
    setVisible(false);
    setTimeout(onClose, 280);
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:100,
      background:`rgba(0,0,0,${visible ? 0.6 : 0})`,
      transition:"background .3s ease",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:24,
    }} onClick={close}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background: STEEP.white,
          borderRadius:24, padding:"32px 28px 24px",
          maxWidth:340, width:"100%",
          transform:`scale(${visible ? 1 : 0.9})`,
          opacity: visible ? 1 : 0,
          transition:"transform .32s cubic-bezier(0.32,0.72,0,1), opacity .28s",
          textAlign:"center", position:"relative", overflow:"hidden",
        }}>
        <div style={{ position:"absolute", top:-30, right:-30, width:150, height:150,
          borderRadius:"50%", pointerEvents:"none",
          background:`radial-gradient(circle, ${STEEP.apricotWash} 0%, transparent 70%)`,
          opacity:0.9 }} />
        <div style={{ position:"absolute", bottom:-40, left:-30, width:130, height:130,
          borderRadius:"50%", pointerEvents:"none",
          background:`radial-gradient(circle, ${STEEP.apricotWash} 0%, transparent 70%)`,
          opacity:0.6 }} />

        <div style={{ position:"relative" }}>
          <div style={{
            width:80, height:80, borderRadius:"50%", margin:"0 auto 20px",
            background:STEEP.apricotWash, display:"flex",
            alignItems:"center", justifyContent:"center",
          }}>
            <FlameIcon size={42} />
          </div>
          <div style={{ fontFamily:STEEP.serif, fontSize:56, fontWeight:400,
            color:STEEP.rust, letterSpacing:"-0.03em", lineHeight:1,
            marginBottom:8, fontVariantNumeric:"tabular-nums" }}>
            {count}
          </div>
          <h2 style={{ fontFamily:STEEP.serif, fontSize:26, fontWeight:400,
            color:STEEP.ink, letterSpacing:"-0.025em", lineHeight:1.2,
            margin:0, marginBottom:10 }}>
            {title}
          </h2>
          <p style={{ fontSize:14.5, color:STEEP.graphite, letterSpacing:"-0.005em",
            lineHeight:1.5, margin:0, marginBottom:20, padding:"0 8px" }}>
            {subtitle}
          </p>

          {count === 7 && (
            <div style={{
              background:"#f6f0e8", borderRadius:12, padding:"10px 14px",
              display:"flex", alignItems:"center", gap:8, marginBottom:20,
              border:"1px solid rgba(93,42,26,0.1)",
            }}>
              <span style={{ fontSize:16 }}>❄️</span>
              <span style={{ fontSize:12.5, color:STEEP.ink,
                letterSpacing:"-0.005em", flex:1, textAlign:"left", lineHeight:1.4 }}>
                <b>You earned a Streak Freeze.</b> Miss a day, keep your streak.
              </span>
            </div>
          )}

          <div onClick={close}
            style={{
              background:STEEP.ink, borderRadius:999, padding:"14px 0",
              textAlign:"center", cursor:"pointer",
              boxShadow:STEEP.cardShadow,
            }}>
            <span style={{ fontSize:15, fontWeight:500, color:"#fff",
              letterSpacing:"-0.009em" }}>Keep building</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── GLOW BUTTON ─────────────────────────────────────────────────────────────
function GlowButton({ label, onPress, accent = false, disabled = false }:
  { label:string; onPress:()=>void; accent?:boolean; disabled?:boolean }) {
  return (
    <div
      onClick={disabled ? undefined : onPress}
      style={{
        background: disabled ? STEEP.dove : STEEP.ink,
        borderRadius:999,
        padding:"15px 0",
        textAlign:"center",
        cursor: disabled ? "default" : "pointer",
        boxShadow: disabled ? "none" : STEEP.cardShadow,
        opacity: disabled ? 0.55 : 1,
      }}>
      <span style={{ fontSize:16, fontWeight:500, color:"#fff",
        letterSpacing:"-0.009em" }}>{label}</span>
    </div>
  );
}

// ─── ONBOARDING ───────────────────────────────────────────────────────────────
type OnboardingUserType = "coach" | "fan";
type OnboardingLevel = "hs" | "college" | "youth" | "pro";
type OnboardingStaff = "solo" | "staff" | "large";
type OnboardingPain =
  | "save_forget" | "cant_find" | "group_chat_lost" | "scroll_again";
type OnboardingVolume = "light" | "medium" | "heavy" | "constant";
type OnboardingPlan = "annual" | "monthly" | "team" | "free";

type OnboardingAnswers = {
  userType: OnboardingUserType | null;
  level: OnboardingLevel | null;
  staff: OnboardingStaff | null;
  pain: OnboardingPain | null;
  volume: OnboardingVolume | null;
  plan: OnboardingPlan;
};

type OnboardingStepId =
  | "who" | "level" | "staff" | "pain" | "volume"
  | "building" | "preview" | "paywall";

// Coach: 8 steps. Fan: 6 steps (skip level + staff).
function onboardingSteps(userType: OnboardingUserType | null): OnboardingStepId[] {
  if (userType === "coach") {
    return ["who", "level", "staff", "pain", "volume", "building", "preview", "paywall"];
  }
  if (userType === "fan") {
    return ["who", "pain", "volume", "building", "preview", "paywall"];
  }
  return ["who"];
}

// Estimate monthly clip volume from their answer (used on personalized preview)
function estimateMonthlyClips(v: OnboardingVolume | null): number {
  switch (v) {
    case "light":    return 8;
    case "medium":   return 25;
    case "heavy":    return 60;
    case "constant": return 120;
    default:         return 0;
  }
}

function OnboardingOption({
  label, selected, onClick, multi = false,
}: { label: string; selected: boolean; onClick: () => void; multi?: boolean }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        width:"100%", textAlign:"left",
        background: selected ? STEEP.apricotWash : STEEP.white,
        border:`1.5px solid ${selected ? STEEP.rust : "rgba(167,170,175,0.35)"}`,
        borderRadius:16, padding:"16px 18px",
        cursor:"pointer", transition:"border-color .15s, background .15s",
        display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:14,
      }}>
      <span style={{ fontSize:15, color:STEEP.ink, letterSpacing:"-0.009em",
        fontWeight: selected ? 500 : 400, lineHeight:1.45, flex:1 }}>{label}</span>
      {multi ? (
        <div style={{
          width:20, height:20, borderRadius:6, flexShrink:0, marginTop:2,
          border:`1.5px solid ${selected ? STEEP.rust : STEEP.dove}`,
          background: selected ? STEEP.rust : "transparent",
          display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          {selected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.6"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>
      ) : selected ? (
        <div style={{ width:8, height:8, borderRadius:"50%",
          background:STEEP.rust, flexShrink:0, marginTop:7 }} />
      ) : null}
    </button>
  );
}

const OB_PAD = 28;

function OnboardingStepShell({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div style={{ display:"flex", flexDirection:"column" }}>
      <div style={{ marginBottom: subtitle ? 12 : 0 }}>
        <h1 style={{
          fontFamily: STEEP.serif, fontSize: 28, fontWeight: 400,
          color: STEEP.ink, letterSpacing: "-0.03em",
          lineHeight: 1.18, margin: 0,
        }}>{title}</h1>
        {subtitle && (
          <p style={{
            fontSize: 15, color: STEEP.graphite, lineHeight: 1.5,
            letterSpacing: "-0.009em", margin: "12px 0 0",
          }}>{subtitle}</p>
        )}
      </div>
      <div style={{ marginTop: 28, display:"flex", flexDirection:"column", gap: 10 }}>
        {children}
      </div>
    </div>
  );
}

// "Building your playbook..." animated loader — Noom-style proof of effort
function BuildingPlaybookStep({ onDone, userType }:
  { onDone:()=>void; userType: OnboardingUserType | null }) {
  const [progress, setProgress] = useState(0);
  const stages = userType === "fan"
    ? [
        "Analyzing your saving habits",
        "Building your personal playbook",
        "Connecting X & Instagram sources",
        "Setting up your library",
      ]
    : [
        "Analyzing your coaching workflow",
        "Building your team playbook",
        "Mapping your install needs",
        "Calibrating clip categories",
      ];
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const totalMs = 2400;
    const tickMs = 40;
    const totalTicks = totalMs / tickMs;
    let t = 0;
    const interval = setInterval(() => {
      t += 1;
      const p = Math.min(t / totalTicks, 1);
      setProgress(p);
      const newStage = Math.min(stages.length - 1, Math.floor(p * stages.length));
      setStage(newStage);
      if (p >= 1) {
        clearInterval(interval);
        setTimeout(onDone, 350);
      }
    }, tickMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", textAlign:"center", paddingTop:40, paddingBottom:40 }}>
      {/* Circular progress */}
      <div style={{ position:"relative", width:120, height:120, marginBottom:32 }}>
        <svg width="120" height="120" viewBox="0 0 120 120"
          style={{ transform:"rotate(-90deg)" }}>
          <circle cx="60" cy="60" r="52" fill="none"
            stroke="rgba(167,170,175,0.25)" strokeWidth="4"/>
          <circle cx="60" cy="60" r="52" fill="none"
            stroke={STEEP.rust} strokeWidth="4" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress)}`}
            style={{ transition:"stroke-dashoffset .12s linear" }}/>
        </svg>
        <div style={{ position:"absolute", inset:0, display:"flex",
          alignItems:"center", justifyContent:"center",
          fontFamily: STEEP.serif, fontSize:32, color:STEEP.ink,
          letterSpacing:"-0.02em", fontVariantNumeric:"tabular-nums" }}>
          {Math.round(progress * 100)}%
        </div>
      </div>
      <h1 style={{
        fontFamily: STEEP.serif, fontSize:26, fontWeight:400,
        color: STEEP.ink, letterSpacing:"-0.03em",
        lineHeight:1.2, margin:0, marginBottom:14,
      }}>
        Building your playbook…
      </h1>
      <p style={{ fontSize:14, color:STEEP.graphite, letterSpacing:"-0.009em",
        lineHeight:1.5, margin:0, transition:"opacity .25s" }}>
        {stages[stage]}
      </p>
    </div>
  );
}

// Personalized plan preview based on their answers (Noom-style proof of listening)
function PlanPreviewStep({ answers }: { answers: OnboardingAnswers }) {
  const monthly = estimateMonthlyClips(answers.volume);
  const yearly = monthly * 12;
  const painLine: Record<OnboardingPain, string> = {
    save_forget: "You'll come back to every play you save",
    cant_find: "You'll find any play in under 5 seconds",
    group_chat_lost: "No more clips dying in the group chat",
    scroll_again: "Stop scrolling X for that one play",
  };

  const role = answers.userType === "fan" ? "fan" : "coach";
  const levelLabel: Record<OnboardingLevel, string> = {
    hs: "high school", college: "college", youth: "youth", pro: "pro",
  };
  const roleLine = answers.userType === "coach" && answers.level
    ? `${levelLabel[answers.level]} coach`
    : role;

  return (
    <OnboardingStepShell
      title="Your playbook is ready"
      subtitle="Based on your answers, here's what Playbook will do for you.">

      {/* Hero stat card */}
      <div style={{
        background: STEEP.white,
        border:`1.5px solid ${STEEP.rust}`,
        borderRadius:20, padding:"22px 22px 18px",
        position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", top:-20, right:-20, width:90, height:90,
          borderRadius:"50%", pointerEvents:"none",
          background:`radial-gradient(circle, ${STEEP.apricotWash} 0%, transparent 70%)`,
          opacity:0.9 }} />
        <div style={{ fontSize:11, color:STEEP.rust, fontWeight:600,
          letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8,
          position:"relative" }}>
          Built for a {roleLine}
        </div>
        <div style={{ display:"flex", alignItems:"baseline", gap:8, marginBottom:6 }}>
          <span style={{ fontFamily:STEEP.serif, fontSize:48, fontWeight:400,
            color:STEEP.ink, letterSpacing:"-0.03em", lineHeight:1 }}>
            {yearly.toLocaleString()}
          </span>
          <span style={{ fontSize:14, color:STEEP.graphite, fontWeight:500,
            letterSpacing:"-0.009em" }}>
            plays / year
          </span>
        </div>
        <div style={{ fontSize:13, color:STEEP.graphite, lineHeight:1.5 }}>
          ≈ {monthly} per month, all organized and searchable in seconds
        </div>
      </div>

      {/* Outcome lines */}
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:6 }}>
        {answers.pain && (
          <PreviewLine text={painLine[answers.pain]} />
        )}
        <PreviewLine text="Save from X & Instagram with one tap" />
        <PreviewLine text={
          answers.userType === "coach" && (answers.staff === "staff" || answers.staff === "large")
            ? "Share your playbook with your entire staff"
            : "Build categories around how you actually think"
        } />
      </div>
    </OnboardingStepShell>
  );
}

function PreviewLine({ text }: { text:string }) {
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:12,
      padding:"12px 4px" }}>
      <div style={{ width:22, height:22, borderRadius:"50%",
        background:STEEP.apricotWash, flexShrink:0, marginTop:1,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
          <path d="M1 4.5l3 3 6-6.5" stroke={STEEP.rust} strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <span style={{ fontSize:14.5, color:STEEP.ink, lineHeight:1.45,
        letterSpacing:"-0.009em", flex:1 }}>{text}</span>
    </div>
  );
}

// ─── PAYWALL CARD ────────────────────────────────────────────────────────────
function PaywallPlanCard({
  selected, onClick, name, price, sublabel, badge, badgeColor, badgeBg, savings,
}: {
  selected:boolean; onClick:()=>void; name:string; price:string;
  sublabel:string; badge?:string; badgeColor?:string; badgeBg?:string;
  savings?:string;
}) {
  return (
    <button type="button" onClick={onClick}
      style={{
        textAlign:"left", cursor:"pointer", width:"100%",
        background: selected ? STEEP.apricotWash : STEEP.white,
        border:`1.5px solid ${selected ? STEEP.rust : "rgba(167,170,175,0.35)"}`,
        borderRadius:20, padding:"16px 18px", position:"relative",
        transition:"border-color .15s, background .15s",
      }}>
      {badge && (
        <div style={{ position:"absolute", top:-10, left:16,
          background: badgeBg || STEEP.ink,
          color: badgeColor || "#fff",
          fontSize:10, fontWeight:600,
          letterSpacing:"0.04em", textTransform:"uppercase",
          padding:"4px 10px", borderRadius:999 }}>
          {badge}
        </div>
      )}
      <div style={{ display:"flex", justifyContent:"space-between",
        alignItems:"baseline", marginBottom:6 }}>
        <span style={{ fontSize:17, fontWeight:500, color:STEEP.ink,
          letterSpacing:"-0.01em" }}>{name}</span>
        <span style={{ fontSize:15, color:STEEP.ink, fontWeight:500 }}>{price}</span>
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", gap:8 }}>
        <span style={{ fontSize:13, color:STEEP.graphite, lineHeight:1.45, flex:1 }}>
          {sublabel}
        </span>
        {savings && (
          <span style={{ fontSize:11, color:STEEP.rust, fontWeight:600,
            letterSpacing:"0.02em", whiteSpace:"nowrap" }}>
            {savings}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── REVERSE TRIAL SHEET ─────────────────────────────────────────────────────
// Triggered when user tries to exit paywall — offers 14-day trial as a save
function ReverseTrialSheet({ onAccept, onDecline }:
  { onAccept:()=>void; onDecline:()=>void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function close(action:()=>void) {
    setVisible(false);
    setTimeout(action, 280);
  }

  return (
    <div
      onClick={() => close(onDecline)}
      style={{
        position:"absolute", inset:0, zIndex:60,
        background:`rgba(0,0,0,${visible ? 0.55 : 0})`,
        transition:"background .3s ease",
        display:"flex", flexDirection:"column", justifyContent:"flex-end",
      }}>
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: STEEP.white,
          borderRadius:"24px 24px 0 0",
          padding:"0 24px 40px",
          transform:`translateY(${visible ? 0 : 100}%)`,
          transition:"transform .32s cubic-bezier(0.32,0.72,0,1)",
          boxShadow:"0 -4px 40px rgba(0,0,0,0.18)",
          position:"relative", overflow:"hidden",
        }}>
        <div style={{ position:"absolute", top:-40, right:-30, width:160, height:160,
          borderRadius:"50%", pointerEvents:"none",
          background:`radial-gradient(circle, ${STEEP.apricotWash} 0%, transparent 70%)`,
          opacity:0.8 }} />

        {/* Drag handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 18px" }}>
          <div style={{ width:36, height:4, borderRadius:99, background:STEEP.dove }} />
        </div>

        <div style={{ position:"relative" }}>
          <div style={{ fontSize:11, color:STEEP.rust, fontWeight:600,
            letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>
            One-time offer
          </div>
          <h2 style={{ fontFamily:STEEP.serif, fontSize:28, fontWeight:400,
            color:STEEP.ink, letterSpacing:"-0.03em", lineHeight:1.2,
            margin:0, marginBottom:12 }}>
            Try Playbook Pro free for 14 days
          </h2>
          <p style={{ fontSize:15, color:STEEP.graphite, letterSpacing:"-0.009em",
            lineHeight:1.55, margin:0, marginBottom:24 }}>
            No credit card. No commitment. See if it's worth it before you decide.
          </p>

          <div style={{ display:"flex", flexDirection:"column", gap:10,
            marginBottom:24 }}>
            <PreviewLine text="Unlimited clips for 14 days" />
            <PreviewLine text="Full access to every Pro feature" />
            <PreviewLine text="No card required to start" />
          </div>

          <GlowButton label="Start 14-day free trial" onPress={() => close(onAccept)} />

          <button type="button"
            onClick={() => close(onDecline)}
            style={{ width:"100%", background:"none", border:"none",
              padding:"16px 0 0", cursor:"pointer",
              fontSize:14, color:STEEP.graphite, letterSpacing:"-0.009em",
              fontFamily:STEEP.sans }}>
            Continue with free (10 clips)
          </button>
        </div>
      </div>
    </div>
  );
}

function OnboardingFlow({ onComplete, onBack }: { onComplete:()=>void; onBack:()=>void }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    userType: null, level: null, staff: null,
    pain: null, volume: null,
    plan: "annual", // Annual default — research-backed for 2026
  });
  const [showReverseTrial, setShowReverseTrial] = useState(false);

  const steps = onboardingSteps(answers.userType);
  const step = steps[stepIdx] ?? "who";
  const totalSteps = steps.length;
  const isFirst = stepIdx === 0;

  function goNext() {
    if (step === "paywall") { onComplete(); return; }
    if (stepIdx < steps.length - 1) {
      setStepIdx(stepIdx + 1);
    }
  }

  function goBack() {
    if (isFirst) onBack();
    else setStepIdx(i => i - 1);
  }

  // Building step auto-advances when its progress completes
  function buildingDone() {
    if (step === "building") goNext();
  }

  const canContinue = (() => {
    switch (step) {
      case "who":      return answers.userType !== null;
      case "level":    return answers.level !== null;
      case "staff":    return answers.staff !== null;
      case "pain":     return answers.pain !== null;
      case "volume":   return answers.volume !== null;
      case "building": return false; // auto-advances
      case "preview":  return true;
      case "paywall":  return true;
      default: return false;
    }
  })();

  const continueLabel = (() => {
    if (step === "preview") return "See your plan";
    if (step === "paywall") {
      if (answers.plan === "free") return "Continue for free";
      if (answers.plan === "team") return "Start 14-day free trial";
      return "Start 14-day free trial";
    }
    return "Continue";
  })();

  const showTeamPlan = answers.userType === "coach";
  const recommendTeam = answers.staff === "staff" || answers.staff === "large";

  // Total steps shown to user = real steps - 1 (building screen hidden from count)
  const displaySteps = steps.filter(s => s !== "building");
  const displayIdx = Math.min(displaySteps.length - 1,
    steps.slice(0, stepIdx + 1).filter(s => s !== "building").length - 1);

  // On building step, hide the top progress bar
  const hideTopBar = step === "building";

  return (
    <div style={{
      height:"100%", display:"flex", flexDirection:"column",
      background: STEEP.white, position:"relative", overflow:"hidden",
    }}>
      <div style={{ position:"absolute", top:-60, right:-40, width:200, height:200,
        borderRadius:"50%", pointerEvents:"none",
        background:`radial-gradient(circle, ${STEEP.apricotWash} 0%, transparent 70%)`,
        opacity:0.7 }} />

      {/* Top bar */}
      {!hideTopBar && (
        <div style={{ flexShrink:0, padding:"12px 20px 0",
          display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <button type="button" onClick={goBack} aria-label="Back"
            style={{ background:"none", border:"none", cursor:"pointer",
              width:44, height:44, display:"flex", alignItems:"center",
              justifyContent:"flex-start", padding:0, color:STEEP.graphite }}>
            <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
              <path d="M5 1L1 5l4 4" stroke="currentColor" strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div style={{ display:"flex", gap:6, alignItems:"center" }}>
            {displaySteps.map((s, i) => (
              <div key={s + i} style={{
                width: i === displayIdx ? 20 : 6, height:6, borderRadius:99,
                background: i <= displayIdx ? STEEP.rust : STEEP.fog,
                transition:"width .2s ease, background .2s ease",
              }} />
            ))}
          </div>
          <div style={{ width:44, textAlign:"right", fontSize:12,
            color:STEEP.graphite, fontVariantNumeric:"tabular-nums",
            letterSpacing:"-0.01em" }}>
            {displayIdx + 1}/{displaySteps.length}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex:1, overflowY:"auto",
        padding: hideTopBar
          ? `0 ${OB_PAD}px 32px`
          : `24px ${OB_PAD}px 32px` }}
        className="hide-scrollbar">

        {step === "who" && (
          <OnboardingStepShell
            title="Stop losing the plays you save"
            subtitle="Tell us how you watch football and we'll build your playbook in 60 seconds.">
            <OnboardingOption label="I'm a coach" selected={answers.userType === "coach"}
              onClick={() => setAnswers(a => ({ ...a, userType:"coach" }))} />
            <OnboardingOption label="I'm a fan" selected={answers.userType === "fan"}
              onClick={() => setAnswers(a => ({ ...a, userType:"fan", level:null, staff:null }))} />
          </OnboardingStepShell>
        )}

        {step === "level" && (
          <OnboardingStepShell
            title="What level do you coach?"
            subtitle="We'll tune categories and examples to your level.">
            {([
              ["hs", "High school"],
              ["college", "College"],
              ["youth", "Youth"],
              ["pro", "Pro"],
            ] as const).map(([id, label]) => (
              <OnboardingOption key={id} label={label}
                selected={answers.level === id}
                onClick={() => setAnswers(a => ({ ...a, level:id }))} />
            ))}
          </OnboardingStepShell>
        )}

        {step === "staff" && (
          <OnboardingStepShell
            title="Do you share plays with other coaches?"
            subtitle="Group chats are where plays go to die.">
            <OnboardingOption label="No — just me"
              selected={answers.staff === "solo"}
              onClick={() => setAnswers(a => ({ ...a, staff:"solo" }))} />
            <OnboardingOption label="Yes — 2 to 6 coaches"
              selected={answers.staff === "staff"}
              onClick={() => setAnswers(a => ({ ...a, staff:"staff" }))} />
            <OnboardingOption label="Yes — larger staff"
              selected={answers.staff === "large"}
              onClick={() => setAnswers(a => ({ ...a, staff:"large" }))} />
          </OnboardingStepShell>
        )}

        {step === "pain" && (
          <OnboardingStepShell
            title="Which one sounds like you?"
            subtitle="Pick the closest fit.">
            {([
              ["save_forget", "I save and send plays all the time but never come back to them"],
              ["cant_find", "I know I saved it somewhere but can't find it"],
              ["group_chat_lost", "Our group chat is full of clips nobody can find later"],
              ["scroll_again", "I'm always scrolling X trying to find that one play again"],
            ] as const).map(([id, label]) => (
              <OnboardingOption key={id} label={label}
                selected={answers.pain === id}
                onClick={() => setAnswers(a => ({ ...a, pain:id }))} />
            ))}
          </OnboardingStepShell>
        )}

        {step === "volume" && (
          <OnboardingStepShell
            title="How many plays do you save in a week?"
            subtitle="Saving and sending — not just bookmarking.">
            {([
              ["light", "A few — under 5"],
              ["medium", "A handful — 5 to 15"],
              ["heavy", "A lot — 15 to 30"],
              ["constant", "Constantly — 30+"],
            ] as const).map(([id, label]) => (
              <OnboardingOption key={id} label={label}
                selected={answers.volume === id}
                onClick={() => setAnswers(a => ({ ...a, volume:id }))} />
            ))}
          </OnboardingStepShell>
        )}

        {step === "building" && (
          <BuildingPlaybookStep userType={answers.userType} onDone={buildingDone} />
        )}

        {step === "preview" && (
          <PlanPreviewStep answers={answers} />
        )}

        {step === "paywall" && (
          <OnboardingStepShell
            title={answers.userType === "fan"
              ? "Save it. Find it. Share it."
              : "Every play, ready when you need it"}
            subtitle="14-day free trial. Cancel anytime.">

            {/* Social proof */}
            <div style={{
              background: STEEP.white,
              border:`1px solid rgba(167,170,175,0.25)`,
              borderRadius:14, padding:"12px 14px",
              display:"flex", alignItems:"center", gap:10, marginBottom:4,
            }}>
              <div style={{ display:"flex", gap:1 }}>
                {[0,1,2,3,4].map(i => (
                  <svg key={i} width="13" height="13" viewBox="0 0 13 13" fill={STEEP.rust}>
                    <path d="M6.5 1l1.7 3.4 3.8.5-2.8 2.6.7 3.7-3.4-1.8-3.4 1.8.7-3.7L1 4.9l3.8-.5z"/>
                  </svg>
                ))}
              </div>
              <div style={{ fontSize:12, color:STEEP.graphite, lineHeight:1.4,
                letterSpacing:"-0.009em", flex:1 }}>
                <span style={{ color:STEEP.ink, fontWeight:500 }}>
                  "Replaced 3 different apps for me."
                </span>{" "}
                Coach Daniels, HS football
              </div>
            </div>

            <div style={{ display:"flex", flexDirection:"column", gap:12,
              marginTop:14, paddingTop:6 }}>

              {/* Annual — DEFAULT, recommended */}
              <PaywallPlanCard
                selected={answers.plan === "annual"}
                onClick={() => setAnswers(a => ({ ...a, plan:"annual" }))}
                name="Annual"
                price="$7.42/mo"
                sublabel="$89/year · 75 clips/mo · personal playbook"
                badge="Best value"
                badgeBg={STEEP.rust}
                savings="Save 50%"
              />

              {/* Monthly anchor */}
              <PaywallPlanCard
                selected={answers.plan === "monthly"}
                onClick={() => setAnswers(a => ({ ...a, plan:"monthly" }))}
                name="Monthly"
                price="$14.99/mo"
                sublabel="75 clips/mo · personal playbook"
              />

              {/* Team — coaches only, recommended for staff */}
              {showTeamPlan && (
                <PaywallPlanCard
                  selected={answers.plan === "team"}
                  onClick={() => setAnswers(a => ({ ...a, plan:"team" }))}
                  name="Team"
                  price="$49.99/mo"
                  sublabel="Up to 6 coaches · 2,000 clips · shared playbook"
                  badge={recommendTeam ? "Best for staff" : undefined}
                  badgeBg={STEEP.ink}
                />
              )}
            </div>

            <p style={{ fontSize:12, color:STEEP.dove, textAlign:"center",
              marginTop:14, lineHeight:1.5, padding:"0 4px" }}>
              14-day free trial on paid plans. Cancel anytime in Settings.
            </p>

            {/* Trust links */}
            <div style={{ display:"flex", justifyContent:"center", gap:14,
              marginTop:6, flexWrap:"wrap" }}>
              <button type="button"
                style={{ background:"none", border:"none", cursor:"pointer",
                  fontSize:11, color:STEEP.graphite, padding:6,
                  fontFamily:STEEP.sans, letterSpacing:"-0.005em" }}>
                Restore purchases
              </button>
              <span style={{ fontSize:11, color:STEEP.dove }}>·</span>
              <button type="button"
                style={{ background:"none", border:"none", cursor:"pointer",
                  fontSize:11, color:STEEP.graphite, padding:6,
                  fontFamily:STEEP.sans, letterSpacing:"-0.005em" }}>
                Terms
              </button>
              <span style={{ fontSize:11, color:STEEP.dove }}>·</span>
              <button type="button"
                style={{ background:"none", border:"none", cursor:"pointer",
                  fontSize:11, color:STEEP.graphite, padding:6,
                  fontFamily:STEEP.sans, letterSpacing:"-0.005em" }}>
                Privacy
              </button>
            </div>
          </OnboardingStepShell>
        )}
      </div>

      {/* Footer CTA */}
      {!hideTopBar && (
        <div style={{ flexShrink:0, padding:`16px ${OB_PAD}px 40px`,
          borderTop:`1px solid rgba(167,170,175,0.18)`,
          background: STEEP.white }}>
          <GlowButton label={continueLabel} onPress={goNext} disabled={!canContinue} />
          {step === "paywall" && (
            <button type="button"
              onClick={() => setShowReverseTrial(true)}
              style={{ width:"100%", background:"none", border:"none",
                padding:"14px 0 0", cursor:"pointer",
                fontSize:14, color:STEEP.graphite, letterSpacing:"-0.009em",
                fontFamily:STEEP.sans }}>
              Maybe later
            </button>
          )}
        </div>
      )}

      {/* Reverse trial on paywall dismiss */}
      {showReverseTrial && (
        <ReverseTrialSheet
          onAccept={() => {
            setShowReverseTrial(false);
            setAnswers(a => ({ ...a, plan:"annual" }));
            onComplete();
          }}
          onDecline={() => {
            setShowReverseTrial(false);
            setAnswers(a => ({ ...a, plan:"free" }));
            onComplete();
          }}
        />
      )}
    </div>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
// ─── AUTH BOTTOM SHEET ───────────────────────────────────────────────────────
function AuthSheet({ title, onEmailPress, onClose, onDone }:
  { title:string; onEmailPress:()=>void; onClose:()=>void; onDone:()=>void }) {
  const [visible, setVisible] = useState(false);

  // Trigger slide-up on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  function close() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  return (
    // Backdrop
    <div
      onClick={close}
      style={{
        position:"absolute", inset:0, zIndex:50,
        background:`rgba(0,0,0,${visible ? 0.55 : 0})`,
        transition:"background .3s ease",
        display:"flex", flexDirection:"column", justifyContent:"flex-end",
      }}>
      {/* Sheet */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: STEEP.white,
          borderRadius:"24px 24px 0 0",
          padding:"0 20px 36px",
          transform:`translateY(${visible ? 0 : 100}%)`,
          transition:"transform .32s cubic-bezier(0.32,0.72,0,1)",
          boxShadow:"0 -4px 40px rgba(0,0,0,0.12)",
        }}>

        {/* Drag handle */}
        <div style={{ display:"flex", justifyContent:"center", padding:"10px 0 4px" }}>
          <div style={{ width:36, height:4, borderRadius:99,
            background:STEEP.dove }} />
        </div>

        {/* Header row */}
        <div style={{ display:"flex", alignItems:"center",
          justifyContent:"space-between", padding:"10px 0 24px" }}>
          <div style={{ width:32 }} />
          <span style={{ fontSize:17, fontWeight:400, color:STEEP.ink,
            fontFamily:STEEP.serif, letterSpacing:"-0.015em" }}>{title}</span>
          <button onClick={close}
            style={{ width:32, height:32, borderRadius:"50%",
              background:STEEP.fog, border:`1px solid ${STEEP.dove}`,
              cursor:"pointer", display:"flex", alignItems:"center",
              justifyContent:"center" }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M1 1l9 9M10 1l-9 9" stroke={STEEP.graphite}
                strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Sign in with Apple */}
        <button
          onClick={() => { onDone(); }}
          style={{
            width:"100%", display:"flex", alignItems:"center", justifyContent:"center",
            gap:10, background:STEEP.ink, border:"none", borderRadius:999,
            padding:"15px", cursor:"pointer", marginBottom:10,
          }}>
          <svg width="17" height="20" viewBox="0 0 17 20" fill="#fff">
            <path d="M14.04 10.57c-.02-2.15 1.75-3.18 1.83-3.23-1-1.46-2.55-1.66-3.1-1.68-1.32-.14-2.58.78-3.25.78-.67 0-1.7-.76-2.8-.74C5.1 5.72 3.6 6.67 2.77 8.12 1.08 11.06 2.33 15.41 4 17.6c.83 1.18 1.82 2.5 3.12 2.45 1.25-.05 1.72-.8 3.23-.8 1.5 0 1.93.8 3.24.78 1.35-.02 2.2-1.2 3.02-2.39a10.8 10.8 0 001.38-2.75c-.03-.01-2.67-1.02-2.69-4.05-.02.13 0 .13 0 .13z"/>
            <path d="M11.72 3.44c.68-.83 1.14-1.98 1.01-3.13-1 .04-2.2.67-2.9 1.49-.63.72-1.19 1.88-1.04 2.99 1.11.08 2.25-.56 2.93-1.35z"/>
          </svg>
          <span style={{ fontSize:16, fontWeight:500, color:"#fff",
            letterSpacing:"-0.009em" }}>Continue with Apple</span>
        </button>

        {/* Sign in with Google */}
        <button
          onClick={() => { onDone(); }}
          style={{
            width:"100%", display:"flex", alignItems:"center", justifyContent:"center",
            gap:10, background:STEEP.white,
            border:`1px solid ${STEEP.dove}`,
            borderRadius:999, padding:"15px", cursor:"pointer", marginBottom:20,
          }}>
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.013 17.64 11.706 17.64 9.2z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
            <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
          </svg>
          <span style={{ fontSize:16, fontWeight:500, color:STEEP.ink,
            letterSpacing:"-0.009em" }}>Continue with Google</span>
        </button>

        {/* Continue with email */}
        <button
          onClick={onEmailPress}
          style={{
            width:"100%", display:"flex", alignItems:"center", justifyContent:"center",
            gap:8, background:"none", border:"none", cursor:"pointer",
            padding:"4px 0", marginBottom:24,
          }}>
          <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
            <rect x="1" y="1" width="14" height="10" rx="2"
              stroke={STEEP.graphite} strokeWidth="1.4"/>
            <path d="M1 3l7 5 7-5" stroke={STEEP.graphite}
              strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span style={{ fontSize:15, color:STEEP.graphite,
            fontWeight:400, letterSpacing:"-0.009em" }}>Continue with email</span>
        </button>

        {/* Legal */}
        <div style={{ textAlign:"center", fontSize:11,
          color:STEEP.dove, lineHeight:1.6, letterSpacing:"-0.009em" }}>
          By continuing you agree to Playbook's{" "}
          <span onClick={() => window.open("https://apple.com/legal/internet-services/itunes/us/terms.html", "_blank")}
            style={{ color:STEEP.graphite, textDecoration:"underline", cursor:"pointer" }}>
            Terms of Service
          </span>{" "}and{" "}
          <span onClick={() => window.open("https://apple.com/legal/privacy", "_blank")}
            style={{ color:STEEP.graphite, textDecoration:"underline", cursor:"pointer" }}>
            Privacy Policy
          </span>
        </div>
      </div>
    </div>
  );
}

function AuthScreen({ onDone }: { onDone:()=>void }) {
  const [phase, setPhase]     = useState<"landing"|"onboarding"|"email">("landing");
  const [sheet, setSheet]     = useState<"none"|"open">("none");
  const [email, setEmail]     = useState("");
  const [pass, setPass]       = useState("");
  const [loading, setLoading] = useState(false);

  function submitEmail() {
    if (!email || pass.length < 6) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onDone(); }, 900);
  }

  if (phase === "onboarding") {
    return (
      <OnboardingFlow
        onComplete={() => setPhase("email")}
        onBack={() => setPhase("landing")}
      />
    );
  }

  // ── Email form (after onboarding + paywall) ────────────────────────────────
  if (phase === "email") {
    return (
      <div style={{
        height:"100%", display:"flex", flexDirection:"column",
        background: STEEP.white,
      }}>
        <button onClick={() => setPhase("onboarding")}
          style={{ background:"none", border:"none", cursor:"pointer",
            padding:"18px 20px 8px", display:"flex", alignItems:"center",
            gap:6, color:STEEP.graphite, fontSize:13, alignSelf:"flex-start" }}>
          <svg width="6" height="10" viewBox="0 0 6 10" fill="none">
            <path d="M5 1L1 5l4 4" stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>
        <div style={{ flex:1, display:"flex", flexDirection:"column",
          justifyContent:"center", padding:"0 28px 40px" }}>
          <div style={{ marginBottom:32 }}>
            <div style={{ fontSize:26, fontWeight:400, color:STEEP.ink,
              fontFamily:STEEP.serif, letterSpacing:"-0.025em", marginBottom:8 }}>
              Continue with email
            </div>
            <div style={{ fontSize:14, color:STEEP.graphite, letterSpacing:"-0.009em" }}>
              Create your account to start your trial
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
            <input placeholder="Email address" value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ background:STEEP.fog, border:`1px solid ${STEEP.dove}`,
                borderRadius:16, padding:"15px 16px",
                color:STEEP.ink, fontSize:15, outline:"none",
                letterSpacing:"-0.009em" }} />
            <input placeholder="Password (6+ chars)" type="password" value={pass}
              onChange={e => setPass(e.target.value)}
              style={{ background:STEEP.fog, border:`1px solid ${STEEP.dove}`,
                borderRadius:16, padding:"15px 16px",
                color:STEEP.ink, fontSize:15, outline:"none",
                letterSpacing:"-0.009em" }} />
          </div>
          <GlowButton accent
            label={loading ? "…" : "Continue"}
            onPress={submitEmail} />
        </div>
      </div>
    );
  }

  // ── Landing ──────────────────────────────────────────────────────────────
  return (
    <div style={{
      height:"100%", display:"flex", flexDirection:"column",
      background: STEEP.white,
      position:"relative", overflow:"hidden",
    }}>
      {/* Warm glow — hero context only */}
      <div style={{ position:"absolute", top:-80, left:"50%", transform:"translateX(-50%)",
        width:300, height:300, borderRadius:"50%",
        background:`radial-gradient(circle, ${STEEP.apricotWash} 0%, transparent 70%)`,
        opacity:0.8, pointerEvents:"none" }} />

      {/* Center: Playbook AI + tagline */}
      <div style={{ flex:1, display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center", textAlign:"center",
        padding:"0 28px" }}>

        <div style={{ fontSize:44, fontWeight:400, color:STEEP.ink,
          fontFamily:STEEP.serif,
          letterSpacing:"-0.66px", lineHeight:1.1,
          marginBottom:16 }}>
          Playbook AI
        </div>

        <div style={{ fontSize:16, color:STEEP.ash, lineHeight:1.5,
          maxWidth:240, letterSpacing:"-0.009em" }}>
          Gameplanning, made smarter.
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding:"0 28px 48px", display:"flex",
        flexDirection:"column", gap:14, textAlign:"center" }}>

        <GlowButton label="Get Started" onPress={() => setPhase("onboarding")} />

        <div style={{ textAlign:"center" }}>
          <span style={{ fontSize:14, color:STEEP.graphite, letterSpacing:"-0.009em" }}>
            Already have an account?{" "}
          </span>
          <span onClick={() => setSheet("open")}
            style={{ fontSize:14, color:STEEP.ink,
              fontWeight:500, cursor:"pointer", letterSpacing:"-0.009em" }}>
            Sign In
          </span>
        </div>
      </div>

      {/* Bottom sheet overlay */}
      {sheet === "open" && (
        <AuthSheet
          title="Sign In"
          onClose={() => setSheet("none")}
          onEmailPress={() => { setSheet("none"); setPhase("email"); }}
          onDone={onDone}
        />
      )}
    </div>
  );
}

// ─── TAB ICONS (SVG) ─────────────────────────────────────────────────────────
function IconFeed({ active, color }: { active:boolean; color?:string }) {
  const { isDark } = useTheme();
  const c = color ?? (active ? th(isDark).tabText : th(isDark).tabIcon);
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      {active
        ? <path d="M3 3h7v7H3V3zm9 0h7v7h-7V3zM3 12h7v7H3v-7zm9 0h7v7h-7v-7z" fill={c}/>
        : <path d="M3 3h7v7H3V3zm9 0h7v7h-7V3zM3 12h7v7H3v-7zm9 0h7v7h-7v-7z"
            stroke={c} strokeWidth="1.5" strokeLinejoin="round"/>
      }
    </svg>
  );
}
function IconPlaybook({ active, color }: { active:boolean; color?:string }) {
  const { isDark } = useTheme();
  const c = color ?? (active ? th(isDark).tabText : th(isDark).tabIcon);
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      {active ? (
        <>
          <rect x="3" y="2" width="10" height="18" rx="2" fill={c}/>
          <path d="M15 5h2a2 2 0 012 2v11a2 2 0 01-2 2h-2" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M6 7h4M6 11h4M6 15h2" stroke={color ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)"} strokeWidth="1.5" strokeLinecap="round"/>
        </>
      ) : (
        <>
          <rect x="3" y="2" width="10" height="18" rx="2" stroke={c} strokeWidth="1.5"/>
          <path d="M15 5h2a2 2 0 012 2v11a2 2 0 01-2 2h-2" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M6 7h4M6 11h4M6 15h2" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
        </>
      )}
    </svg>
  );
}
function IconProfile({ active, color }: { active:boolean; color?:string }) {
  const { isDark } = useTheme();
  const c = color ?? (active ? th(isDark).tabText : th(isDark).tabIcon);
  return (
    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
      {active ? (
        <>
          <circle cx="11" cy="7.5" r="3.5" fill={c}/>
          <path d="M3.5 19c0-4.142 3.358-7.5 7.5-7.5s7.5 3.358 7.5 7.5" fill={c}/>
        </>
      ) : (
        <>
          <circle cx="11" cy="7.5" r="3.5" stroke={c} strokeWidth="1.5"/>
          <path d="M3.5 19c0-4.142 3.358-7.5 7.5-7.5s7.5 3.358 7.5 7.5" stroke={c} strokeWidth="1.5" strokeLinecap="round"/>
        </>
      )}
    </svg>
  );
}

// ─── FLOATING PILL TAB BAR ───────────────────────────────────────────────────
function TabBar({ active, onTab }: { active:string; onTab:(t:string)=>void }) {
  const { isDark } = useTheme();
  const T = th(isDark);
  const tabs = [
    { id:"feed",     Icon:IconFeed,     label:"Feed" },
    { id:"playbook", Icon:IconPlaybook, label:"Playbook" },
    { id:"profile",  Icon:IconProfile,  label:"Profile" },
  ];
  return (
    // Outer wrapper — full width, positions the floating pill
    <div style={{ position:"absolute", bottom:18, left:0, right:0,
      display:"flex", justifyContent:"center", pointerEvents:"none", zIndex:20 }}>

      {/* The pill itself */}
      <div style={{
        display:"flex", alignItems:"center", gap:3,
        padding:4,
        background: T.tabPill,
        backdropFilter:"blur(20px)",
        WebkitBackdropFilter:"blur(20px)" as any,
        borderRadius:999,
        border:`1px solid ${T.tabBorder}`,
        boxShadow: isDark
          ? "0 8px 40px rgba(0,0,0,0.7)"
          : STEEP.cardShadow,
        pointerEvents:"all",
      }}>
        {tabs.map(({ id, Icon, label }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => onTab(id)}
              style={{
                display:"flex", alignItems:"center",
                gap: isActive ? 6 : 0,
                padding: isActive ? "8px 16px" : "8px 13px",
                background: isActive ? T.tabActiveBg : "transparent",
                border:"none",
                borderRadius:999,
                cursor:"pointer",
                transition:"all .2s cubic-bezier(0.34,1.1,0.64,1)",
              }}>
              <Icon active={isActive} color={isActive ? T.tabActiveFg : T.tabIcon} />
              {isActive && (
                <span style={{
                  fontSize:13, fontWeight:500,
                  color: T.tabActiveFg,
                  letterSpacing:"-0.01em", whiteSpace:"nowrap",
                }}>
                  {label}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── PHONE FRAME ─────────────────────────────────────────────────────────────
// Always fullscreen — no preview frame anywhere.
function PhoneFrame({ children }: { children:React.ReactNode }) {
  const { isDark } = useTheme();
  const appBg = isDark ? C.bg : "#f2f2f7";
  return (
    <div style={{ width:"100vw", height:"100vh", overflow:"hidden",
      display:"flex", flexDirection:"column", background:appBg,
      position:"fixed", top:0, left:0 }}>
      {children}
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  // ?skip=1 in the URL bypasses the auth screen for quick preview
  const skipAuth = new URLSearchParams(window.location.search).get("skip") === "1";
  const [authed, setAuthed]   = useState(skipAuth);
  const [screen, setScreen]   = useState<Screen>({ id:"feed" });
  const [theme, setTheme]     = useState<ThemeMode>("light");
  const isDark                = theme === "dark";
  const toggleTheme           = () => setTheme(t => t === "dark" ? "light" : "dark");

  const [likedIds, setLikedIds] = useState<Set<string>>(
    () => new Set(FEED.filter(p => p.liked).map(p => p.id))
  );
  const toggleLike = (id: string) =>
    setLikedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Streak state (persisted to localStorage) ──────────────────────────────
  const [streak, setStreak] = useState<StreakState>(loadStreak);
  const [pendingMilestone, setPendingMilestone] = useState<number | null>(null);

  useEffect(() => {
    try { localStorage.setItem(STREAK_KEY, JSON.stringify(streak)); } catch {}
  }, [streak]);

  // Handle day rollover — if user missed a day, reset streak (unless they have freezes).
  // Runs once on mount.
  useEffect(() => {
    const today = todayStr();
    if (!streak.lastActiveDate) return;
    const gap = daysBetween(streak.lastActiveDate, today);
    if (gap <= 0) return; // same day or in future — no action
    if (gap === 1) return; // consecutive — will be handled on next save
    // gap >= 2: streak broke unless they have freezes
    if (streak.freezes >= gap - 1) {
      // Use freezes to cover missed days
      setStreak(s => ({
        ...s,
        freezes: s.freezes - (gap - 1),
        // lastActiveDate stays — they still need to act today to keep counting
      }));
    } else {
      // Reset streak
      setStreak(s => ({ ...s, count: 0 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordSave = (): { milestone: number | null } => {
    const today = todayStr();
    let milestoneHit: number | null = null;

    setStreak(prev => {
      const gap = prev.lastActiveDate ? daysBetween(prev.lastActiveDate, today) : 999;
      let newCount = prev.count;
      let newFreezes = prev.freezes;

      if (prev.lastActiveDate === today) {
        // Already counted today — just bump saves
      } else if (gap === 1) {
        newCount = prev.count + 1;
      } else if (gap >= 2 && prev.freezes >= gap - 1) {
        newCount = prev.count + 1;
        newFreezes = prev.freezes - (gap - 1);
      } else {
        // Streak broke or first ever save
        newCount = 1;
      }

      // Milestone detection — 7, 30, 100, 365
      const milestones = [7, 30, 100, 365];
      const hit = milestones.find(m =>
        newCount === m && !prev.celebratedMilestones.includes(m)
      );
      if (hit) milestoneHit = hit;

      // Award a freeze at every 7-day streak (max 3 stored)
      if (newCount > 0 && newCount % 7 === 0 && newCount !== prev.count) {
        newFreezes = Math.min(3, newFreezes + 1);
      }

      return {
        count: newCount,
        lastActiveDate: today,
        totalSaves: prev.totalSaves + 1,
        freezes: newFreezes,
        celebratedMilestones: hit
          ? [...prev.celebratedMilestones, hit]
          : prev.celebratedMilestones,
      };
    });

    if (milestoneHit) setPendingMilestone(milestoneHit);
    return { milestone: milestoneHit };
  };

  const acknowledgeMilestone = (_m: number) => setPendingMilestone(null);

  function navigate(s: Screen) { setScreen(s); }
  const tabId = ["feed","playbook","profile"].includes(screen.id) ? screen.id : null;

  return (
    <LikesCtx.Provider value={{ likedIds, toggleLike }}>
    <ThemeCtx.Provider value={{ isDark, toggleTheme }}>
    <StreakCtx.Provider value={{ streak, recordSave, acknowledgeMilestone }}>
    <ToastProvider>
    <div style={{
      minHeight:"100vh",
      display:"flex", flexDirection:"column",
      alignItems:"stretch", justifyContent:"flex-start",
      background: isDark ? C.bg : "#f2f2f7",
      padding: 0, gap: 0,
      fontFamily: STEEP.sans, WebkitFontSmoothing:"antialiased",
      color: isDark ? "#fff" : STEEP.ink,
    }}>

      <PhoneFrame>
        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
          {!authed
            ? <AuthScreen onDone={() => { setAuthed(true); setScreen({ id:"feed" }); }} />
            : <>
                <div style={{ flex:1, overflow:"hidden", position:"relative" }}>
                  {screen.id === "feed"
                    ? <FeedScreen />
                    : screen.id === "playbook"
                    ? <PlaybookScreen navigate={navigate} />
                    : screen.id === "category"
                    ? <CategoryScreen catId={(screen as any).catId} navigate={navigate} from={screen} />
                    : screen.id === "grid"
                    ? <GridScreen catId={(screen as any).catId} label={(screen as any).label} navigate={navigate} />
                    : screen.id === "clip"
                    ? <ClipPlayerScreen playId={(screen as any).playId} from={(screen as any).from} navigate={navigate} />
                    : screen.id === "liked"
                    ? <LikedScreen navigate={navigate} />
                    : screen.id === "profile"
                    ? <ProfileScreen onSignOut={() => setAuthed(false)} />
                    : screen.id === "share-ext"
                    ? <ShareExtPreview navigate={navigate} />
                    : null
                  }
                  {tabId && (
                    <TabBar active={screen.id} onTab={id => navigate({ id } as Screen)} />
                  )}
                </div>
              </>
          }
        </div>
      </PhoneFrame>

      <div style={{ fontSize:11, color:"rgba(255,255,255,.2)", textAlign:"center", lineHeight:2 }}>
        Scroll up/down on the feed to swipe clips · Tap "Add to Playbook" to categorize<br/>
        Browse saved clips in the Playbook tab · Toggle theme in Profile → Appearance
      </div>
    </div>
    {/* Streak milestone celebration modal (shown when 7/30/100/365 hit) */}
    {pendingMilestone && (
      <MilestoneModal
        count={pendingMilestone}
        onClose={() => acknowledgeMilestone(pendingMilestone)}
      />
    )}

    </ToastProvider>
    </StreakCtx.Provider>
    </ThemeCtx.Provider>
    </LikesCtx.Provider>
  );
}
