export default function PointsRing({ earned, goal, size = 160 }) {
  const strokeWidth = 10
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const progress = goal > 0 ? Math.min(earned / goal, 1) : 0
  const dash = progress * circumference
  const cx = size / 2

  const color = progress >= 1
    ? 'var(--green)'
    : progress >= 0.5
    ? 'var(--amber)'
    : 'var(--text-muted)'

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle
        cx={cx} cy={cx} r={radius}
        fill="none"
        stroke="var(--surface-3)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={cx} cy={cx} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: 'stroke-dasharray 0.5s ease' }}
      />
      {/* Points earned */}
      <text
        x={cx} y={cx - 6}
        textAnchor="middle"
        fill="var(--text)"
        fontSize={size * 0.2}
        fontFamily="var(--font-display)"
        letterSpacing="0.03em"
      >
        {Math.round(earned)}
      </text>
      {/* Goal label */}
      <text
        x={cx} y={cx + 14}
        textAnchor="middle"
        fill="var(--text-muted)"
        fontSize={size * 0.085}
        fontFamily="var(--font-display)"
        letterSpacing="0.05em"
      >
        / {goal} PTS
      </text>
    </svg>
  )
}
