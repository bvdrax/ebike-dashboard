const TYPE_ICONS = {
  'run':            '🏃',
  'walk':           '🚶',
  'ride':           '🚴',
  'weight training':'🏋️',
  'soccer':         '⚽',
  'hike':           '🥾',
  'manual credit':  '✏️',
}

function formatValue(value, unit) {
  const v = parseFloat(value)
  if (unit === 'mile')   return `${v.toFixed(2)} mi`
  if (unit === 'km')     return `${v.toFixed(2)} km`
  if (unit === 'minute') return `${Math.round(v)} min`
  if (unit === 'hour')   return `${v.toFixed(1)} hr`
  return `${v} ${unit}`
}

export default function ActivityRow({ activity }) {
  const icon = TYPE_ICONS[activity.type_name?.toLowerCase()] || '🏅'
  const date = new Date(activity.activity_date + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  })

  return (
    <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
      <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {activity.name}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
          {date} · {formatValue(activity.value, activity.unit)}
          {activity.note && ` · ${activity.note}`}
        </div>
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.1rem',
        letterSpacing: '0.03em',
        color: 'var(--green)',
        flexShrink: 0,
      }}>
        +{activity.points_awarded}
      </div>
    </div>
  )
}
