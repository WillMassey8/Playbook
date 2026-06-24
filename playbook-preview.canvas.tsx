import { useState } from "react";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        "#121214",
  surface:   "#1e1e23",
  surface2:  "#2a2a30",
  card:      "#1e1e23",
  accent:    "#33D67D",
  accentDim: "rgba(51,214,125,0.13)",
  white:     "#FFFFFF",
  muted:     "rgba(255,255,255,0.45)",
  faint:     "rgba(255,255,255,0.18)",
  divider:   "rgba(255,255,255,0.07)",
  red:       "#FF4D4D",
  orange:    "#FF9A3C",
  blue:      "#5C9CFF",
  purple:    "#B56BFF",
  teal:      "#42D6D6",
};

const categoryColors = [C.accent, C.blue, C.orange, C.red, C.purple, C.teal];
function catColor(name: string) {
  const idx = Math.abs([...name].reduce((a, c) => a + c.charCodeAt(0), 0)) % categoryColors.length;
  return categoryColors[idx];
}

// ─── Mock data ────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: "1", parentId: null, name: "Pass Plays",  slug: "pass-plays",  sort: 1 },
  { id: "2", parentId: "1",  name: "Rub Routes",  slug: "rub-routes",  sort: 1 },
  { id: "3", parentId: "1",  name: "Screen Passes",slug:"screen-passes",sort: 2 },
  { id: "4", parentId: "1",  name: "Deep Shots",  slug: "deep-shots",  sort: 3 },
  { id: "5", parentId: null, name: "Run Plays",   slug: "run-plays",   sort: 2 },
  { id: "6", parentId: "5",  name: "Inside Zone", slug: "inside-zone", sort: 1 },
  { id: "7", parentId: "5",  name: "Outside Zone",slug:"outside-zone", sort: 2 },
  { id: "8", parentId: null, name: "RPOs",        slug: "rpos",        sort: 3 },
  { id: "9", parentId: "8",  name: "Glance RPO",  slug: "glance-rpo",  sort: 1 },
  { id: "10",parentId: "8",  name: "Bubble RPO",  slug: "bubble-rpo",  sort: 2 },
];

const PLAYS = [
  { id:"p1", categoryId:"2", title:"Corner Rub – Switch Concept", platform:"twitter", status:"ready",   createdAt:"2h ago" },
  { id:"p2", categoryId:"3", title:"Tunnel Screen to TE",         platform:"twitter", status:"ready",   createdAt:"5h ago" },
  { id:"p3", categoryId:"4", title:"Fade vs. Cover 2",            platform:"instagram",status:"ready",  createdAt:"1d ago" },
  { id:"p4", categoryId:"2", title:"Speed Out Rub",               platform:"twitter", status:"ready",   createdAt:"1d ago" },
  { id:"p5", categoryId:"6", title:"IZ with Counter Action",      platform:"twitter", status:"ready",   createdAt:"2d ago" },
  { id:"p6", categoryId:"9", title:"Glance RPO vs. Cover 3",      platform:"twitter", status:"ready",   createdAt:"3d ago" },
  { id:"p7", categoryId:"3", title:"Bubble Screen — WR motion",   platform:"instagram",status:"processing",createdAt:"10m ago" },
  { id:"p8", categoryId:"10",title:"Bubble RPO – TE flat",        platform:"twitter", status:"failed",  createdAt:"4d ago" },
];

function playsInCategory(catId: string): typeof PLAYS {
  const childIds = CATEGORIES.filter(c => c.parentId === catId).map(c => c.id);
  const ids = new Set([catId, ...childIds]);
  return PLAYS.filter(p => ids.has(p.categoryId));
}

function playCount(catId: string) { return playsInCategory(catId).length; }
function children(parentId: string) { return CATEGORIES.filter(c => c.parentId === parentId); }
const topLevel = CATEGORIES.filter(c => !c.parentId);

// ─── Shared components ────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: string }) {
  const cfg: Record<string, { label: string; color: string; icon: string }> = {
    twitter:   { label: "X / Twitter", color: C.white,  icon: "𝕏" },
    instagram: { label: "Instagram",   color: C.orange, icon: "◎" },
    unknown:   { label: "Link",        color: C.muted,  icon: "🔗" },
  };
  const c = cfg[platform] ?? cfg.unknown;
  return (
    <span style={{ fontSize:11, fontWeight:600, color:c.color, background:`${c.color}22`,
      borderRadius:99, padding:"2px 8px", display:"inline-flex", gap:4, alignItems:"center" }}>
      <span>{c.icon}</span>{c.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; color: string }> = {
    ready:      { label:"Ready",      color:C.accent },
    processing: { label:"Processing", color:"#FFD700" },
    pending:    { label:"Pending",    color:C.muted },
    failed:     { label:"Failed",     color:C.red },
  };
  const c = cfg[status] ?? cfg.pending;
  return (
    <span style={{ fontSize:11, fontWeight:600, color:c.color, background:`${c.color}22`,
      borderRadius:99, padding:"2px 8px" }}>
      {status === "processing" ? "⏳ " : ""}{c.label}
    </span>
  );
}

function Btn({ children: ch, onClick, variant = "primary", disabled = false, small = false }:
  { children: React.ReactNode; onClick?: () => void; variant?: "primary"|"secondary"|"ghost"; disabled?: boolean; small?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    primary:   { background: C.accent, color:"#000", fontWeight:700 },
    secondary: { background: C.accentDim, color:C.accent, fontWeight:700 },
    ghost:     { background:"transparent", color:C.muted, fontWeight:500 },
  };
  return (
    <button onClick={disabled ? undefined : onClick} style={{
      ...styles[variant], border:"none", borderRadius:12, cursor: disabled ? "default":"pointer",
      padding: small ? "8px 16px" : "14px 20px", fontSize: small ? 13 : 15,
      width: variant === "ghost" ? "auto" : "100%",
      opacity: disabled ? 0.4 : 1, transition:"opacity .15s",
    }}>{ch}</button>
  );
}

// ─── PlayCard ─────────────────────────────────────────────────────────────────
function PlayCard({ play, onClick }: { play: typeof PLAYS[0]; onClick?: () => void }) {
  const color = catColor(play.title);
  return (
    <div onClick={onClick} style={{ cursor:"pointer", borderRadius:12, overflow:"hidden",
      aspectRatio:"9/16", background:`linear-gradient(135deg, ${color}22 0%, #1a1a1f 100%)`,
      position:"relative", border:`1px solid ${color}22` }}>
      {/* Play icon */}
      {play.status === "ready" && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
          justifyContent:"center" }}>
          <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(255,255,255,0.15)",
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>▶</div>
        </div>
      )}
      {play.status === "processing" && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:22 }}>⏳</div>
      )}
      {play.status === "failed" && (
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center",
          justifyContent:"center", fontSize:22 }}>⚠️</div>
      )}
      {/* Bottom info */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0,
        background:"linear-gradient(transparent, rgba(0,0,0,0.8))", padding:"24px 8px 8px" }}>
        <div style={{ fontSize:11, fontWeight:600, color:"#fff", lineHeight:1.3, marginBottom:4 }}
          >{play.title}</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <PlatformBadge platform={play.platform} />
          {play.status !== "ready" && <StatusBadge status={play.status} />}
        </div>
      </div>
    </div>
  );
}

// ─── Screens ──────────────────────────────────────────────────────────────────

type Screen =
  | { id: "auth" }
  | { id: "home" }
  | { id: "playbook" }
  | { id: "category"; catId: string }
  | { id: "reel"; plays: typeof PLAYS; startIdx: number }
  | { id: "add" }
  | { id: "profile" };

function AuthScreen({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"signIn"|"signUp">("signIn");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  function submit() {
    if (!email || pass.length < 6) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onDone(); }, 900);
  }

  return (
    <div style={{ padding:"0 20px", display:"flex", flexDirection:"column", gap:0 }}>
      {/* Hero */}
      <div style={{ textAlign:"center", paddingTop:64, paddingBottom:32 }}>
        <div style={{ fontSize:52, marginBottom:8 }}>🎬</div>
        <div style={{ fontSize:32, fontWeight:800, color:C.white, marginBottom:4 }}>Playbook</div>
        <div style={{ fontSize:14, color:C.muted }}>Your football film library</div>
      </div>

      {/* Mode toggle */}
      <div style={{ display:"flex", background:C.card, borderRadius:12, padding:4, marginBottom:20 }}>
        {(["signIn","signUp"] as const).map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex:1, border:"none", borderRadius:9, padding:"10px 0", fontSize:14, fontWeight:700,
            cursor:"pointer", transition:"all .2s",
            background: mode === m ? C.accent : "transparent",
            color: mode === m ? "#000" : C.muted,
          }}>{m === "signIn" ? "Sign In" : "Sign Up"}</button>
        ))}
      </div>

      {/* Fields */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
          style={{ background:C.card, border:"none", borderRadius:12, padding:"14px 16px",
            color:C.white, fontSize:15, outline:"none" }} />
        <input placeholder="Password (6+ characters)" type="password" value={pass}
          onChange={e => setPass(e.target.value)}
          style={{ background:C.card, border:"none", borderRadius:12, padding:"14px 16px",
            color:C.white, fontSize:15, outline:"none" }} />
        <div style={{ marginTop:8 }}>
          <Btn onClick={submit} disabled={!email || pass.length < 6}>
            {loading ? "…" : mode === "signIn" ? "Sign In" : "Create Account"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const ready = PLAYS.filter(p => p.status === "ready");
  const processing = PLAYS.filter(p => p.status === "processing");

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Header */}
      <div style={{ padding:"24px 20px 12px", display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:28, fontWeight:800, color:C.white }}>Playbook</div>
          <div style={{ fontSize:13, color:C.muted }}>Your film library</div>
        </div>
        <button onClick={() => navigate({ id:"add" })} style={{
          width:40, height:40, borderRadius:"50%", background:C.accent, border:"none",
          cursor:"pointer", fontSize:20, color:"#000", fontWeight:700, flexShrink:0 }}>+</button>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"0 20px 20px" }}>
        {/* Processing banner */}
        {processing.length > 0 && (
          <div style={{ background:C.accentDim, borderRadius:10, padding:"10px 14px",
            display:"flex", gap:8, alignItems:"center", marginBottom:16 }}>
            <span style={{ fontSize:13 }}>⏳</span>
            <span style={{ fontSize:13, color:C.white, opacity:.7 }}>
              {processing.length} clip{processing.length > 1 ? "s" : ""} processing…
            </span>
          </div>
        )}

        {/* Grid */}
        <div style={{ fontSize:13, fontWeight:600, color:C.muted, marginBottom:10 }}>Recent clips</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:8 }}>
          {ready.map(p => (
            <PlayCard key={p.id} play={p} onClick={() => navigate({ id:"reel", plays:ready, startIdx:ready.indexOf(p) })} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PlaybookScreen({ navigate }: { navigate: (s: Screen) => void }) {
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ padding:"24px 20px 12px" }}>
        <div style={{ fontSize:28, fontWeight:800, color:C.white }}>Playbook</div>
      </div>
      <div style={{ flex:1, overflowY:"auto", padding:"0 16px 20px", display:"flex", flexDirection:"column", gap:8 }}>
        {topLevel.map(cat => {
          const color = catColor(cat.name);
          const kids = children(cat.id);
          const count = playCount(cat.id);
          const preview = playsInCategory(cat.id).filter(p => p.status === "ready").slice(0, 3);
          return (
            <div key={cat.id} onClick={() => navigate({ id:"category", catId:cat.id })}
              style={{ background:C.card, borderRadius:14, padding:"16px", cursor:"pointer",
                display:"flex", alignItems:"center", gap:14,
                border:`1px solid ${C.divider}` }}>
              {/* Accent bar */}
              <div style={{ width:4, height:56, borderRadius:3, background:color, flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:700, color:C.white, marginBottom:3 }}>{cat.name}</div>
                <div style={{ fontSize:12, color:C.muted }}>
                  {count} clip{count !== 1 ? "s" : ""}
                  {kids.length > 0 && <span style={{ opacity:.6 }}> · {kids.length} subcategories</span>}
                </div>
              </div>
              {/* Mini preview */}
              {preview.length > 0 && (
                <div style={{ display:"flex" }}>
                  {preview.map((p, i) => (
                    <div key={p.id} style={{ width:32, height:46, borderRadius:6,
                      background:`${color}28`, marginLeft: i > 0 ? -10 : 0,
                      border:`1px solid ${color}33`, display:"flex", alignItems:"center",
                      justifyContent:"center", fontSize:10 }}>▶</div>
                  ))}
                </div>
              )}
              <span style={{ color:C.faint, fontSize:13 }}>›</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryScreen({ catId, navigate }: { catId: string; navigate: (s: Screen) => void }) {
  const cat = CATEGORIES.find(c => c.id === catId)!;
  const color = catColor(cat.name);
  const kids = children(cat.id);
  const direct = PLAYS.filter(p => p.categoryId === catId && p.status === "ready");

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Nav */}
      <div style={{ padding:"16px 20px 8px", display:"flex", alignItems:"center", gap:12 }}>
        <button onClick={() => navigate({ id:"playbook" })} style={{ background:"none", border:"none",
          color:C.accent, fontSize:16, cursor:"pointer", padding:0 }}>‹ Back</button>
      </div>
      <div style={{ padding:"0 20px 16px", display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:6, height:40, borderRadius:3, background:color }} />
        <div style={{ fontSize:24, fontWeight:800, color:C.white }}>{cat.name}</div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"0 16px 20px", display:"flex", flexDirection:"column", gap:16 }}>
        {/* Sub-categories */}
        {kids.length > 0 && (
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:C.muted, marginBottom:8, paddingLeft:4 }}>CATEGORIES</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {kids.map(child => {
                const cc = catColor(child.name);
                const n = PLAYS.filter(p => p.categoryId === child.id).length;
                return (
                  <div key={child.id} onClick={() => navigate({ id:"category", catId:child.id })}
                    style={{ background:C.card, borderRadius:12, padding:"14px 16px", cursor:"pointer",
                      display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:cc }} />
                    <span style={{ flex:1, fontSize:15, fontWeight:600, color:C.white }}>{child.name}</span>
                    <span style={{ fontSize:12, color:C.muted }}>{n}</span>
                    <span style={{ color:C.faint }}>›</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Direct clips */}
        {direct.length > 0 && (
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
              marginBottom:8, paddingLeft:4 }}>
              <div style={{ fontSize:12, fontWeight:600, color:C.muted }}>CLIPS</div>
              <button onClick={() => navigate({ id:"reel", plays:direct, startIdx:0 })}
                style={{ background:"none", border:"none", color, fontSize:13, fontWeight:600,
                  cursor:"pointer" }}>▶ Watch all</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
              {direct.map((p, i) => (
                <PlayCard key={p.id} play={p} onClick={() => navigate({ id:"reel", plays:direct, startIdx:i })} />
              ))}
            </div>
          </div>
        )}

        {direct.length === 0 && kids.length === 0 && (
          <div style={{ textAlign:"center", paddingTop:60, color:C.muted }}>
            <div style={{ fontSize:36, marginBottom:12 }}>📂</div>
            No clips in {cat.name} yet
          </div>
        )}
      </div>
    </div>
  );
}

function ReelScreen({ plays, startIdx, navigate }: { plays: typeof PLAYS; startIdx: number; navigate: (s: Screen) => void }) {
  const [idx, setIdx] = useState(startIdx);
  const play = plays[idx];

  return (
    <div style={{ position:"relative", height:"100%", background:"#000", overflow:"hidden" }}>
      {/* Video bg */}
      <div style={{ position:"absolute", inset:0,
        background:`linear-gradient(135deg, ${catColor(play.title)}30 0%, #000 100%)`,
        display:"flex", alignItems:"center", justifyContent:"center" }}>
        {play.status === "ready"
          ? <div style={{ width:72, height:72, borderRadius:"50%", background:"rgba(255,255,255,0.12)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>▶</div>
          : <div style={{ textAlign:"center", color:"rgba(255,255,255,.5)", fontSize:14 }}>
              {play.status === "processing" ? "⏳ Processing…" : "⚠️ " + (play.title)}
            </div>
        }
      </div>

      {/* Dismiss */}
      <button onClick={() => navigate({ id:"home" })} style={{
        position:"absolute", top:52, left:16, width:36, height:36, borderRadius:"50%",
        background:"rgba(255,255,255,0.15)", backdropFilter:"blur(10px)", border:"none",
        color:"#fff", fontSize:18, cursor:"pointer", display:"flex", alignItems:"center",
        justifyContent:"center" }}>✕</button>

      {/* Info overlay */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0,
        background:"linear-gradient(transparent, rgba(0,0,0,0.85))", padding:"60px 20px 40px" }}>
        <div style={{ fontSize:17, fontWeight:700, color:"#fff", marginBottom:8 }}>{play.title}</div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <PlatformBadge platform={play.platform} />
          <span style={{ fontSize:11, color:"rgba(255,255,255,.35)" }}>{play.createdAt}</span>
        </div>
      </div>

      {/* Prev/Next arrows */}
      <div style={{ position:"absolute", top:"50%", left:0, right:0, transform:"translateY(-50%)",
        display:"flex", justifyContent:"space-between", padding:"0 8px", pointerEvents:"none" }}>
        <button onClick={() => setIdx(i => Math.max(0, i-1))} disabled={idx === 0}
          style={{ pointerEvents:"all", background:"rgba(255,255,255,0.12)", border:"none", borderRadius:"50%",
            width:36, height:36, color:"#fff", fontSize:18, cursor:"pointer", opacity: idx === 0 ? 0.2 : 1 }}>‹</button>
        <button onClick={() => setIdx(i => Math.min(plays.length-1, i+1))} disabled={idx === plays.length-1}
          style={{ pointerEvents:"all", background:"rgba(255,255,255,0.12)", border:"none", borderRadius:"50%",
            width:36, height:36, color:"#fff", fontSize:18, cursor:"pointer", opacity: idx === plays.length-1 ? 0.2 : 1 }}>›</button>
      </div>

      {/* Dots */}
      <div style={{ position:"absolute", bottom:12, left:0, right:0, display:"flex",
        justifyContent:"center", gap:5 }}>
        {plays.map((_, i) => (
          <div key={i} onClick={() => setIdx(i)} style={{ cursor:"pointer",
            height:6, borderRadius:99, background: i === idx ? "#fff" : "rgba(255,255,255,0.3)",
            width: i === idx ? 20 : 6, transition:"all .2s" }} />
        ))}
      </div>
    </div>
  );
}

function AddClipScreen({ navigate }: { navigate: (s: Screen) => void }) {
  const [url, setUrl] = useState("");
  const [selectedCat, setSelectedCat] = useState<string|null>(null);
  const [state, setState] = useState<"idle"|"loading"|"success">("idle");

  const leafCats = CATEGORIES.filter(c => !CATEGORIES.some(x => x.parentId === c.id));
  const hint = url.includes("twitter.com") || url.includes("x.com") ? "Twitter/X clip detected ✓"
    : url.includes("instagram.com") ? "Instagram clip detected (link saved) ✓" : null;

  function submit() {
    setState("loading");
    setTimeout(() => setState("success"), 1200);
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Nav */}
      <div style={{ padding:"16px 20px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <button onClick={() => navigate({ id:"home" })} style={{ background:"none", border:"none",
          color:C.accent, fontSize:15, cursor:"pointer" }}>Cancel</button>
        <div style={{ fontSize:16, fontWeight:700, color:C.white }}>Add Clip</div>
        <div style={{ width:56 }} />
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"8px 20px 24px", display:"flex", flexDirection:"column", gap:20 }}>
        {/* URL field */}
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:C.muted, marginBottom:8 }}>🔗 Clip URL</div>
          <div style={{ background:C.card, borderRadius:12, padding:"2px 14px",
            display:"flex", alignItems:"center", gap:8 }}>
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://x.com/…"
              style={{ flex:1, background:"none", border:"none", color:C.white, fontSize:15,
                padding:"12px 0", outline:"none" }} />
            {url && <button onClick={() => setUrl("")} style={{ background:"none", border:"none",
              color:C.muted, cursor:"pointer", fontSize:16 }}>✕</button>}
          </div>
          {hint && <div style={{ fontSize:12, color:C.accent, marginTop:6, paddingLeft:4 }}>{hint}</div>}
        </div>

        {/* Category chips */}
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:C.muted, marginBottom:8 }}>📁 Category</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {leafCats.map(cat => {
              const parent = CATEGORIES.find(c => c.id === cat.parentId);
              const sel = selectedCat === cat.id;
              return (
                <button key={cat.id} onClick={() => setSelectedCat(sel ? null : cat.id)}
                  style={{ borderRadius:10, border:"none", cursor:"pointer", padding:"8px 14px",
                    background: sel ? C.accent : C.card, transition:"all .15s",
                    display:"flex", flexDirection:"column", alignItems:"flex-start" }}>
                  {parent && <span style={{ fontSize:10, color: sel ? "#00000088" : C.muted }}>{parent.name}</span>}
                  <span style={{ fontSize:13, fontWeight:600, color: sel ? "#000" : C.white }}>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit */}
        {state === "idle" && <Btn onClick={submit} disabled={!url || !selectedCat}>Save to Playbook</Btn>}
        {state === "loading" && (
          <div style={{ textAlign:"center", padding:20, color:C.muted, fontSize:14 }}>Saving clip…</div>
        )}
        {state === "success" && (
          <div style={{ background:C.accentDim, borderRadius:12, padding:20, textAlign:"center" }}>
            <div style={{ fontSize:36, marginBottom:8 }}>✅</div>
            <div style={{ fontSize:16, fontWeight:700, color:C.white }}>Clip saved!</div>
            <div style={{ fontSize:13, color:C.muted, marginTop:4 }}>Video processing in background</div>
            <div style={{ marginTop:16 }}>
              <Btn onClick={() => navigate({ id:"home" })} variant="secondary" small>Back to Home</Btn>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileScreen({ navigate, onSignOut }: { navigate: (s: Screen) => void; onSignOut: () => void }) {
  const [confirm, setConfirm] = useState(false);

  const rows = [
    { icon:"📤", label:"How to share clips",    sub:"Share from Twitter/X or Instagram",   color:C.accent },
    { icon:"🌙", label:"Dark Mode",             sub:"Always on",                           color:C.purple },
    { icon:"ℹ️", label:"Version",              sub:"1.0.0",                               color:"#888" },
    { icon:"✉️", label:"Feedback",             sub:"Report a bug or suggest a feature",   color:C.blue },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ flex:1, overflowY:"auto", padding:"0 16px 24px" }}>
        {/* Avatar */}
        <div style={{ textAlign:"center", paddingTop:40, paddingBottom:28 }}>
          <div style={{ width:80, height:80, borderRadius:"50%", background:C.accentDim,
            display:"flex", alignItems:"center", justifyContent:"center", fontSize:36,
            margin:"0 auto 12px" }}>👤</div>
          <div style={{ fontSize:18, fontWeight:700, color:C.white }}>coach@team.com</div>
          <div style={{ fontSize:13, color:C.muted }}>Coach</div>
        </div>

        {/* Settings group */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:11, fontWeight:600, color:"rgba(255,255,255,.25)",
            marginBottom:6, paddingLeft:4, letterSpacing:1 }}>SETTINGS</div>
          <div style={{ background:C.card, borderRadius:14, overflow:"hidden" }}>
            {rows.map((r, i) => (
              <div key={i}>
                {i > 0 && <div style={{ height:1, background:C.divider, margin:"0 16px" }} />}
                <div style={{ display:"flex", alignItems:"center", gap:14, padding:"14px 16px", cursor:"pointer" }}>
                  <div style={{ width:32, height:32, borderRadius:9,
                    background:`${r.color}28`, display:"flex", alignItems:"center",
                    justifyContent:"center", fontSize:16 }}>{r.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:15, color:C.white }}>{r.label}</div>
                    <div style={{ fontSize:12, color:C.muted }}>{r.sub}</div>
                  </div>
                  <span style={{ color:C.faint }}>›</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sign out */}
        {!confirm
          ? <button onClick={() => setConfirm(true)} style={{ width:"100%", background:C.card,
              border:"none", borderRadius:14, padding:"16px", cursor:"pointer",
              display:"flex", alignItems:"center", gap:14, color:C.red, fontSize:15, fontWeight:600 }}>
              <span style={{ fontSize:18 }}>🚪</span> Sign Out
            </button>
          : <div style={{ background:C.card, borderRadius:14, padding:"16px", display:"flex",
              flexDirection:"column", gap:10 }}>
              <div style={{ fontSize:14, color:C.white, fontWeight:600, marginBottom:4 }}>
                Sign out of Playbook?
              </div>
              <button onClick={onSignOut} style={{ background:C.red, border:"none", borderRadius:10,
                padding:"12px", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:14 }}>
                Sign Out
              </button>
              <button onClick={() => setConfirm(false)} style={{ background:C.surface2, border:"none",
                borderRadius:10, padding:"12px", color:C.white, cursor:"pointer", fontSize:14 }}>
                Cancel
              </button>
            </div>
        }
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
function TabBar({ active, onTab }: { active: string; onTab: (t: string) => void }) {
  const tabs = [
    { id:"home",    icon:"🏠", label:"Home" },
    { id:"playbook",icon:"📖", label:"Playbook" },
    { id:"profile", icon:"👤", label:"Profile" },
  ];
  return (
    <div style={{ display:"flex", background:C.surface, borderTop:`1px solid ${C.divider}`,
      paddingBottom:"env(safe-area-inset-bottom, 0)" }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onTab(t.id)} style={{
          flex:1, background:"none", border:"none", cursor:"pointer",
          padding:"10px 0 12px", display:"flex", flexDirection:"column",
          alignItems:"center", gap:3 }}>
          <span style={{ fontSize:22 }}>{t.icon}</span>
          <span style={{ fontSize:11, fontWeight:600,
            color: active === t.id ? C.accent : "rgba(255,255,255,.35)" }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── iPhone frame ─────────────────────────────────────────────────────────────
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width:390, height:844, borderRadius:48, overflow:"hidden",
      boxShadow:"0 0 0 12px #1a1a1f, 0 0 0 14px #333, 0 40px 80px rgba(0,0,0,0.6)",
      display:"flex", flexDirection:"column", position:"relative", background:C.bg }}>
      {/* Notch */}
      <div style={{ height:50, background:C.bg, display:"flex", justifyContent:"center",
        alignItems:"flex-start", paddingTop:12, flexShrink:0 }}>
        <div style={{ width:120, height:34, background:"#000", borderRadius:99 }} />
      </div>
      <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
        {children}
      </div>
    </div>
  );
}

// ─── Root app ─────────────────────────────────────────────────────────────────
export default function App() {
  const [authed, setAuthed] = useState(false);
  const [screen, setScreen] = useState<Screen>({ id: "home" });

  function navigate(s: Screen) { setScreen(s); }

  const tabId = ["home","playbook","profile"].includes(screen.id) ? screen.id : null;

  const inReel = screen.id === "reel";
  const inAuth = !authed;

  return (
    <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", background:"#0a0a0c",
      fontFamily:"-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color:C.white, gap:24 }}>

      <div style={{ fontSize:13, color:"rgba(255,255,255,.3)", letterSpacing:1, fontWeight:600 }}>
        PLAYBOOK — UI PREVIEW
      </div>

      <PhoneFrame>
        <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column",
          background:C.bg }}>
          {/* Screen content */}
          <div style={{ flex:1, overflow:"hidden", display:"flex", flexDirection:"column" }}>
            {inAuth
              ? <AuthScreen onDone={() => { setAuthed(true); setScreen({ id:"home" }); }} />
              : screen.id === "home"
              ? <HomeScreen navigate={navigate} />
              : screen.id === "playbook"
              ? <PlaybookScreen navigate={navigate} />
              : screen.id === "category"
              ? <CategoryScreen catId={(screen as any).catId} navigate={navigate} />
              : screen.id === "reel"
              ? <ReelScreen plays={(screen as any).plays} startIdx={(screen as any).startIdx} navigate={navigate} />
              : screen.id === "add"
              ? <AddClipScreen navigate={navigate} />
              : screen.id === "profile"
              ? <ProfileScreen navigate={navigate} onSignOut={() => setAuthed(false)} />
              : null
            }
          </div>

          {/* Tab bar — hide on reel, add, category, auth */}
          {authed && tabId && !inReel && (
            <TabBar active={screen.id} onTab={id => navigate({ id } as Screen)} />
          )}
        </div>
      </PhoneFrame>

      {/* Nav hint */}
      <div style={{ fontSize:12, color:"rgba(255,255,255,.2)", textAlign:"center", lineHeight:1.7 }}>
        Click clips to open reel · Browse categories · Try adding a clip<br />
        Sign out from Profile to return to auth screen
      </div>
    </div>
  );
}
