interface ScoreDialProps {
  value: number // 0 - 10
  size?: number
}

// Circular score readout used on cards and detail pages.
export function ScoreDial({ value, size = 56 }: ScoreDialProps) {
  const pct = Math.max(0, Math.min(1, value / 10))
  const r = size / 2 - 4
  const c = 2 * Math.PI * r
  const dash = c * pct

  const hue = 30 + pct * 15
  const stroke = `hsl(${hue}, ${55 + pct * 20}%, ${45 + pct * 12}%)`

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(246,239,227,0.08)"
          strokeWidth="4"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
        />
      </svg>
      <div className="absolute text-center leading-none">
        <span className="font-display text-lg font-semibold text-cream">
          {value % 1 === 0 ? value : value.toFixed(1)}
        </span>
      </div>
    </div>
  )
}
