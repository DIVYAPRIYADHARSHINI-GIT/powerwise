// Inline SVG icons (no icon font / network). UI icons use currentColor;
// appliance icons are small two-tone illustrations drawn for PowerWise.
import type { UsageId } from "@/lib/types";

type P = { size?: number; className?: string };
const base = (size = 20) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true });

export const IconBolt = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
  </svg>
);
export const IconSun = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
export const IconMoon = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
  </svg>
);
export const IconGlobe = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
  </svg>
);
export const IconMenu = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
export const IconX = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
export const IconCheck = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M20 6 9 17l-5-5" />
  </svg>
);
export const IconChevron = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const IconArrow = ({ size, className }: P) => (
  <svg {...base(size)} className={`rtl:-scale-x-100 ${className ?? ""}`}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const IconDownload = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
  </svg>
);
export const IconUpload = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 21V9M7 14l5-5 5 5M5 3h14" />
  </svg>
);
export const IconTrash = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);
export const IconPlus = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const IconAlert = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </svg>
);
export const IconInfo = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);
export const IconSearch = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const IconLeaf = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M11 20A7 7 0 0 1 4 13c0-6 6-9 16-9 0 10-3 16-9 16zM4 21c3-5 6-8 10-10" />
  </svg>
);
export const IconTrendDown = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m3 7 7 7 4-4 7 7M21 11v6h-6" />
  </svg>
);
export const IconTrendUp = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m3 17 7-7 4 4 7-7M21 13V7h-6" />
  </svg>
);
export const IconHome = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m3 11 9-8 9 8M5 9.5V21h14V9.5M10 21v-6h4v6" />
  </svg>
);
export const IconChart = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 3v18h18M7 15l3-4 3 2 5-7" />
  </svg>
);
export const IconSliders = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
    <circle cx="16" cy="6" r="2" />
    <circle cx="10" cy="12" r="2" />
    <circle cx="18" cy="18" r="2" />
  </svg>
);
export const IconFile = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M14 3H6v18h12V7l-4-4zM14 3v4h4M9 13h6M9 17h6" />
  </svg>
);
export const IconCalendar = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);
export const IconPie = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M21 12A9 9 0 1 1 12 3v9h9z" />
    <path d="M15 3.5A9 9 0 0 1 20.5 9H15V3.5z" />
  </svg>
);
export const IconBulb = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z" />
  </svg>
);
export const IconGear = ({ size, className }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
);

/* ------------------------------------------------------------------ appliances */
// 40x40 two-tone illustrations. `tone` is the accent colour.

export const APPLIANCE_COLORS: Record<UsageId | "solar", string> = {
  ac: "#0ea5e9",
  fridge: "#6366f1",
  geyser: "#f97316",
  washer: "#14b8a6",
  tv: "#8b5cf6",
  fans: "#22c55e",
  lights: "#eab308",
  iron: "#ef4444",
  induction: "#ec4899",
  ev: "#84cc16",
  other: "#94a3b8",
  solar: "#f59e0b",
};

function Shapes({ id, c }: { id: UsageId | "solar"; c: string }) {
  const body = "var(--icon-body, #ffffff)";
  const line = "var(--icon-line, #334155)";
  switch (id) {
    case "ac":
      return (
        <>
          <rect x="4" y="9" width="32" height="13" rx="4" fill={body} stroke={line} strokeWidth="2" />
          <path d="M8 18h24" stroke={line} strokeWidth="2" strokeLinecap="round" />
          <circle cx="30" cy="13.5" r="1.6" fill={c} />
          <path d="M12 26c-1 2 1 3 0 5M20 26c-1 2 1 3 0 5M28 26c-1 2 1 3 0 5" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      );
    case "fridge":
      return (
        <>
          <rect x="10" y="3" width="20" height="34" rx="4" fill={body} stroke={line} strokeWidth="2" />
          <path d="M10 15h20" stroke={line} strokeWidth="2" />
          <path d="M14 8v4M14 19v6" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
    case "geyser":
      return (
        <>
          <rect x="11" y="4" width="18" height="26" rx="9" fill={body} stroke={line} strokeWidth="2" />
          <circle cx="20" cy="13" r="3" fill={c} />
          <path d="M16 30v4M24 30v4" stroke={line} strokeWidth="2" strokeLinecap="round" />
          <path d="M20 19c-2 3 2 4 0 7" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      );
    case "washer":
      return (
        <>
          <rect x="7" y="4" width="26" height="32" rx="4" fill={body} stroke={line} strokeWidth="2" />
          <path d="M7 11h26" stroke={line} strokeWidth="2" />
          <circle cx="20" cy="23" r="8" fill="none" stroke={line} strokeWidth="2" />
          <path d="M14 24c3-2 6 2 12-1" stroke={c} strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <circle cx="28" cy="7.5" r="1.4" fill={c} />
        </>
      );
    case "tv":
      return (
        <>
          <rect x="4" y="7" width="32" height="21" rx="3" fill={body} stroke={line} strokeWidth="2" />
          <rect x="8" y="11" width="24" height="13" rx="1.5" fill={c} opacity="0.85" />
          <path d="M14 34h12M20 28v6" stroke={line} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "fans":
      return (
        <>
          <circle cx="20" cy="17" r="13" fill={body} stroke={line} strokeWidth="2" />
          <path d="M20 17c-1-5 1-9 4-9s2 6-4 9zM20 17c5-1 9 1 9 4s-6 2-9-4zM20 17c-4 3-9 3-10 0s4-4 10 0z" fill={c} />
          <circle cx="20" cy="17" r="2" fill={line} />
          <path d="M20 30v6M14 36h12" stroke={line} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "lights":
      return (
        <>
          <path d="M20 4a10 10 0 0 0-6 18c1.2 1 2 2.2 2 4h8c0-1.8.8-3 2-4A10 10 0 0 0 20 4z" fill={c} stroke={line} strokeWidth="2" />
          <path d="M16 30h8M17 34h6" stroke={line} strokeWidth="2" strokeLinecap="round" />
          <path d="M17 15l3 3 3-3" stroke={body} strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </>
      );
    case "iron":
      return (
        <>
          <path d="M5 30h28c0-9-5-15-13-15h-6l-2 4h7c3 0 6 2 7 6H8z" fill={body} stroke={line} strokeWidth="2" strokeLinejoin="round" />
          <path d="M6 30h27" stroke={c} strokeWidth="3" strokeLinecap="round" />
          <circle cx="24" cy="24" r="1.6" fill={c} />
          <path d="M14 11c-1-2 1-3 0-5M20 11c-1-2 1-3 0-5" stroke={c} strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      );
    case "induction":
      return (
        <>
          <rect x="4" y="12" width="32" height="20" rx="4" fill={body} stroke={line} strokeWidth="2" />
          <circle cx="20" cy="22" r="6" fill="none" stroke={c} strokeWidth="2.5" />
          <circle cx="20" cy="22" r="2.5" fill={c} />
          <path d="M12 7c-1 2 1 2 0 4M20 6c-1 2 1 3 0 5M28 7c-1 2 1 2 0 4" stroke={line} strokeWidth="1.8" strokeLinecap="round" fill="none" />
        </>
      );
    case "ev":
      return (
        <>
          <circle cx="10" cy="28" r="6" fill={body} stroke={line} strokeWidth="2" />
          <circle cx="30" cy="28" r="6" fill={body} stroke={line} strokeWidth="2" />
          <path d="M10 28l7-11h9l4 11M16 17h-4M24 11h4l2 6" stroke={line} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M21 3l-4 7h4l-2 6 5-8h-4l2-5z" fill={c} />
        </>
      );
    case "solar":
      return (
        <>
          <circle cx="30" cy="9" r="5" fill={c} />
          <path d="M5 33l5-16h22l-5 16z" fill={body} stroke={line} strokeWidth="2" strokeLinejoin="round" />
          <path d="M8.5 25h21M16 17l-3 16M24 17l-3 16" stroke={c} strokeWidth="1.8" />
        </>
      );
    default:
      return (
        <>
          <rect x="8" y="8" width="11" height="18" rx="2.5" fill={body} stroke={line} strokeWidth="2" />
          <rect x="22" y="14" width="11" height="18" rx="2.5" fill={body} stroke={line} strokeWidth="2" />
          <path d="M13.5 22h0M27.5 28h0" stroke={c} strokeWidth="3" strokeLinecap="round" />
          <path d="M11 32h6" stroke={c} strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
  }
}

export function ApplianceIcon({ id, size = 40, className }: { id: UsageId | "solar"; size?: number; className?: string }) {
  const c = APPLIANCE_COLORS[id];
  return (
    <span className={`appliance-icon inline-flex shrink-0 items-center justify-center rounded-xl ${className ?? ""}`} style={{ width: size, height: size, background: `${c}1f` }} data-appliance={id}>
      <svg viewBox="0 0 40 40" width={size * 0.78} height={size * 0.78} aria-hidden="true">
        <Shapes id={id} c={c} />
      </svg>
    </span>
  );
}
