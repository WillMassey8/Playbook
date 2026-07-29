import { useEffect, useMemo, useState, type ReactNode } from "react";

/** Logical points matching Xcode Simulator device templates (iOS pt). */
export type DeviceTemplate = {
  id: string;
  name: string;
  width: number;
  height: number;
  /** Corner radius of the outer bezel (CSS px at 1×). */
  corner: number;
  /** Dynamic Island vs classic notch. */
  island: "dynamic" | "notch" | "none";
  /** iOS safe-area insets, so screen chrome clears the status bar / indicator. */
  safeTop: number;
  safeBottom: number;
};

export const IPHONE_TEMPLATES: DeviceTemplate[] = [
  {
    id: "iphone-16-pro",
    name: "iPhone 16 Pro",
    width: 393,
    height: 852,
    corner: 55,
    island: "dynamic",
    safeTop: 59,
    safeBottom: 34,
  },
  {
    id: "iphone-16-pro-max",
    name: "iPhone 16 Pro Max",
    width: 430,
    height: 932,
    corner: 55,
    island: "dynamic",
    safeTop: 62,
    safeBottom: 34,
  },
  {
    id: "iphone-16",
    name: "iPhone 16",
    width: 393,
    height: 852,
    corner: 47,
    island: "dynamic",
    safeTop: 59,
    safeBottom: 34,
  },
  {
    id: "iphone-15",
    name: "iPhone 15",
    width: 393,
    height: 852,
    corner: 47,
    island: "dynamic",
    safeTop: 59,
    safeBottom: 34,
  },
  {
    id: "iphone-se",
    name: "iPhone SE (3rd gen)",
    width: 375,
    height: 667,
    corner: 20,
    island: "none",
    safeTop: 20,
    safeBottom: 0,
  },
];

const BEZEL = 12;
const DEVICE_KEY = "playbook.simulator.device";

function loadDeviceId(): string {
  try {
    return localStorage.getItem(DEVICE_KEY) || "iphone-16-pro";
  } catch {
    return "iphone-16-pro";
  }
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function StatusBar({
  time,
  lightContent,
}: {
  time: string;
  lightContent: boolean;
}) {
  const fg = lightContent ? "#fff" : "#000";
  return (
    <div
      className="sim-status-bar"
      style={{ color: fg }}
      aria-hidden
    >
      <span className="sim-status-time">{time}</span>
      <div className="sim-status-trailing">
        <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor">
          <rect x="0" y="7.5" width="3" height="4.5" rx="0.6" opacity="0.35" />
          <rect x="4.5" y="5" width="3" height="7" rx="0.6" opacity="0.55" />
          <rect x="9" y="2.5" width="3" height="9.5" rx="0.6" opacity="0.75" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.6" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <path d="M8 2.4c2.2 0 4.2.9 5.7 2.3l-1.2 1.2A6.2 6.2 0 0 0 8 4.2c-1.6 0-3.1.6-4.2 1.7L2.6 4.7A7.9 7.9 0 0 1 8 2.4Zm0 3.2c1.3 0 2.5.5 3.4 1.4L10.2 8A3.6 3.6 0 0 0 8 7.2c-.9 0-1.7.3-2.3.9L4.5 7C5.4 6.1 6.6 5.6 8 5.6Zm0 3.2c.6 0 1.1.2 1.5.6L8 11.1 6.5 9.4c.4-.4.9-.6 1.5-.6Z" />
        </svg>
        <svg width="27" height="12" viewBox="0 0 27 12" fill="none">
          <rect
            x="0.5"
            y="0.5"
            width="22"
            height="11"
            rx="3.5"
            stroke={fg}
            strokeOpacity="0.35"
          />
          <rect x="2" y="2" width="17" height="8" rx="2" fill={fg} />
          <path
            d="M24 3.8v4.4a2.2 2.2 0 0 0 0-4.4Z"
            fill={fg}
            fillOpacity="0.4"
          />
        </svg>
      </div>
    </div>
  );
}

function Island({ kind }: { kind: DeviceTemplate["island"] }) {
  if (kind === "none") return null;
  if (kind === "notch") {
    return <div className="sim-notch" aria-hidden />;
  }
  return <div className="sim-dynamic-island" aria-hidden />;
}

function SideButtons() {
  return (
    <>
      <div className="sim-btn sim-btn-silent" aria-hidden />
      <div className="sim-btn sim-btn-vol-up" aria-hidden />
      <div className="sim-btn sim-btn-vol-down" aria-hidden />
      <div className="sim-btn sim-btn-power" aria-hidden />
    </>
  );
}

type Props = {
  children: ReactNode;
  /** When true, status bar icons are light (for dark app chrome). */
  lightStatusBar?: boolean;
};

/**
 * Xcode Simulator–style iPhone chrome for the Vite UI preview.
 * Scales to fit the viewport while keeping true device pt dimensions.
 */
export default function IPhoneSimulator({
  children,
  lightStatusBar = false,
}: Props) {
  const [deviceId, setDeviceId] = useState(loadDeviceId);
  const [scale, setScale] = useState(1);
  const time = useClock();

  const device = useMemo(
    () =>
      IPHONE_TEMPLATES.find((d) => d.id === deviceId) ?? IPHONE_TEMPLATES[0],
    [deviceId],
  );

  useEffect(() => {
    try {
      localStorage.setItem(DEVICE_KEY, deviceId);
    } catch {
      /* ignore */
    }
  }, [deviceId]);

  useEffect(() => {
    const update = () => {
      const padX = 48;
      const padY = 120; // toolbar + margins
      const outerW = device.width + BEZEL * 2;
      const outerH = device.height + BEZEL * 2;
      const sx = (window.innerWidth - padX) / outerW;
      const sy = (window.innerHeight - padY) / outerH;
      setScale(Math.min(1, sx, sy));
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [device]);

  const outerW = device.width + BEZEL * 2;
  const outerH = device.height + BEZEL * 2;

  return (
    <div className="sim-desk">
      <header className="sim-toolbar">
        <div className="sim-toolbar-brand">
          <span className="sim-toolbar-dot" />
          <span>Playbook · iOS Simulator</span>
          <span className="sim-live">LIVE</span>
        </div>
        <label className="sim-device-picker">
          <span className="sim-device-picker-label">Device</span>
          <select
            value={device.id}
            onChange={(e) => setDeviceId(e.target.value)}
            aria-label="iPhone device template"
          >
            {IPHONE_TEMPLATES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.width}×{d.height})
              </option>
            ))}
          </select>
        </label>
        <div className="sim-toolbar-meta">
          {Math.round(scale * 100)}% · HMR on
        </div>
      </header>

      <div className="sim-stage">
        <div
          className="sim-scale-wrap"
          style={{
            width: outerW * scale,
            height: outerH * scale,
          }}
        >
          <div
            className="sim-device"
            style={{
              width: outerW,
              height: outerH,
              borderRadius: device.corner + BEZEL / 2,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <SideButtons />
            <div
              className="sim-screen"
              style={{
                width: device.width,
                height: device.height,
                borderRadius: device.corner,
                // The browser reports no insets, so the device template supplies
                // them and app screens lay out like they do on iOS.
                ["--pb-safe-top" as string]: `${device.safeTop}px`,
                ["--pb-safe-bottom" as string]: `${device.safeBottom}px`,
              }}
            >
              <div className="sim-chrome-overlay">
                <StatusBar time={time} lightContent={lightStatusBar} />
                <Island kind={device.island} />
              </div>

              <div className="sim-app">{children}</div>

              {device.island !== "none" && (
                <div className="sim-home-indicator" aria-hidden />
              )}
            </div>
          </div>
        </div>

        <p className="sim-caption">
          {device.name} · Edit <code>preview/src</code> for live updates
        </p>
      </div>
    </div>
  );
}
