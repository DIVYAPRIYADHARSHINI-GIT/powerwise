// Savings-goal celebration: a trophy that pops in, a glowing ring and a CSS
// confetti burst (pure CSS animation, runs once, no JS loop).
const COLORS = ["#f59e0b", "#10b981", "#fde047", "#34d399", "#fb923c", "#22d3ee"];
const PIECES = Array.from({ length: 26 }, (_, i) => {
  const a = (i / 26) * Math.PI * 2;
  const d = 80 + (i % 4) * 22;
  return { dx: Math.cos(a) * d, dy: Math.sin(a) * d - 20, rot: (i % 2 ? 1 : -1) * (180 + i * 20), c: COLORS[i % COLORS.length], delay: (i % 5) * 50, w: i % 3 === 0 ? 6 : 9, h: i % 3 === 0 ? 6 : 4, round: i % 3 === 0 };
});

export function Celebration({ size = 150 }: { size?: number }) {
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }} data-testid="celebration" aria-hidden="true">
      {PIECES.map((p, i) => (
        <span
          key={i}
          className="animate-confetti absolute left-1/2 top-1/2"
          style={{ width: p.w, height: p.h, background: p.c, borderRadius: p.round ? 999 : 2, animationDelay: `${p.delay}ms`, ["--dx" as string]: `${p.dx}px`, ["--dy" as string]: `${p.dy}px`, ["--rot" as string]: `${p.rot}deg` }}
        />
      ))}
      <svg viewBox="0 0 120 120" className="animate-trophy absolute inset-0 h-full w-full">
        <circle cx="60" cy="60" r="50" fill="#fef3c7" className="animate-pulse-glow" />
        <circle cx="60" cy="60" r="50" fill="none" stroke="#f59e0b" strokeWidth="4" strokeDasharray="6 7" />
        <path d="M40 32h40v14c0 12-9 21-20 21s-20-9-20-21z" fill="#fbbf24" stroke="#b45309" strokeWidth="3" strokeLinejoin="round" />
        <path d="M40 37H31c0 10 5 15 11 15M80 37h9c0 10-5 15-11 15" fill="none" stroke="#b45309" strokeWidth="3" strokeLinecap="round" />
        <path d="M60 67v12M46 88h28l-3-9H49z" fill="#fbbf24" stroke="#b45309" strokeWidth="3" strokeLinejoin="round" />
        <path d="M62 38l-7 10h5l-2 9 7-11h-5z" fill="#059669" />
      </svg>
    </div>
  );
}
