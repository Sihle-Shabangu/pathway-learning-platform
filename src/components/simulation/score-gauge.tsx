/** Circular 0–100 score gauge. The number is real text; the ring is decoration. */
export function ScoreGauge({ score, size = 160, label = "Score" }: { score: number; size?: number; label?: string }) {
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(100, score)) / 100) * circumference;
  const color = score >= 90 ? "var(--sim-success)" : score >= 70 ? "var(--sim-teal)" : score >= 50 ? "var(--sim-warning)" : "var(--sim-danger)";

  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`${label}: ${score} out of 100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--sim-border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="text-4xl font-semibold text-sim-text">{score}</span>
        <span className="text-sm text-sim-muted">/ 100</span>
      </div>
    </div>
  );
}
