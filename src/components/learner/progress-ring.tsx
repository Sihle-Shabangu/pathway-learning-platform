/** Circular progress indicator for light surfaces. The percentage is real text, the ring is decoration. */
export function ProgressRing({ percent, size = 128, caption }: { percent: number | null; size?: number; caption: string }) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = percent ?? 0;
  const filled = (Math.max(0, Math.min(100, value)) / 100) * circumference;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={percent === null ? `No activities assigned yet` : `${percent}% complete. ${caption}`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        {/* Skip the arc at 0%: a zero-length stroke with round caps would still draw a dot. */}
        {filled > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--progress)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="text-2xl font-semibold text-foreground">{percent === null ? "—" : `${percent}%`}</span>
        <span className="text-xs text-muted-foreground">done</span>
      </div>
    </div>
  );
}
