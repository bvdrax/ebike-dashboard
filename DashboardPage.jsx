import { useState, useEffect, useCallback } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import PointsRing from '../components/PointsRing'
import ActivityRow from '../components/ActivityRow'

function StatusBanner({ rideAllowed, isAtRisk, isOnTrack, week }) {
  if (week?.goal_met !== null && week?.goal_met !== undefined) {
    // Finalized week view - shouldn't show but handle gracefully
    return null
  }

  if (!rideAllowed) {
    return (
      <div style={{
        background: 'var(--red-glow)',
        border: '1px solid var(--red)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        animation: 'fadeIn 0.3s ease',
      }}>
        <span style={{ fontSize: '1.5rem' }}>🚫</span>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--red)', letterSpacing: '0.05em' }}>
            RIDE SUSPENDED
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Last week's goal was not met. Earn 100 points this week to restore riding privileges.
          </div>
        </div>
      </div>
    )
  }

  if (isAtRisk) {
    return (
      <div style={{
        background: 'var(--amber-glow)',
        border: '1px solid var(--amber)',
        borderRadius: 'var(--radius-lg)',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        <span style={{ fontSize: '1.5rem' }}>⚠️</span>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--amber)', letterSpacing: '0.05em' }}>
            AT RISK
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Need ~{week.points_per_day_needed} pts/day for the remaining {week.days_remaining} day{week.days_remaining !== 1 ? 's' : ''} to hit the goal.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--green-glow)',
      border: '1px solid var(--green-dim)',
      borderRadius: 'var(--radius-lg)',
      padding: '1rem 1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      marginBottom: '1.5rem',
    }}>
      <span style={{ fontSize: '1.5rem' }}>✅</span>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--green)', letterSpacing: '0.05em' }}>
          {week?.points_earned >= week?.goal ? 'GOAL MET — RIDE ON' : 'ON TRACK'}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          {week?.points_earned >= week?.goal
            ? "This week's goal is met. Riding privileges secured."
            : `${week?.points_needed} points to go. Keep it up.`}
        </div>
      </div>
    </div>
  )
}

function WeekHistoryRow({ week, goal }) {
  const [activities, setActivities] = useState(null)
  const [open, setOpen] = useState(false)

  const toggle = async () => {
    if (!open && !activities) {
      const data = await api.getWeekActivities(week.id)
      setActivities(data)
    }
    setOpen(o => !o)
  }

  const start = new Date(week.week_start + 'T00:00:00Z')
  const end = new Date(week.week_end + 'T00:00:00Z')
  const label = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`

  const statusColor = week.goal_met === true ? 'var(--green)'
    : week.goal_met === false ? 'var(--red)'
    : 'var(--amber)'
  const statusLabel = week.goal_met === true ? 'PASSED'
    : week.goal_met === false ? (week.suspension_lifted ? 'LIFTED' : 'FAILED')
    : 'IN PROGRESS'

  return (
    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
      <button
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '1rem',
          padding: '1rem 1.25rem', background: 'none', color: 'var(--text)',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>{label}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {week.activity_count} activities
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', letterSpacing: '0.05em', color: statusColor }}>
            {week.points_earned} / {goal}
          </div>
          <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.1em', color: statusColor, textTransform: 'uppercase' }}>
            {statusLabel}
          </div>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.25rem' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activities === null
            ? <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '0.5rem 0' }}>Loading...</div>
            : activities.length === 0
              ? <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '0.5rem 0' }}>No activities this week.</div>
              : activities.map(a => <ActivityRow key={a.id} activity={a} />)
          }
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [currentWeek, setCurrentWeek] = useState(null)
  const [activities, setActivities] = useState([])
  const [weeks, setWeeks] = useState([])
  const [goal, setGoal] = useState(100)
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const [cw, wk] = await Promise.all([api.getCurrentWeek(), api.getWeeks()])
      setCurrentWeek(cw)
      setGoal(wk.goal)

      // Load current week activities
      if (cw.week?.id) {
        const acts = await api.getWeekActivities(cw.week.id)
        setActivities(acts)
      }

      // Past weeks only
      const past = wk.weeks.filter(w => w.finalized_at !== null)
      setWeeks(past)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await api.sync()
      setLastSync(new Date())
      await load()
    } catch (err) {
      console.error(err)
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '0.75rem' }}>
        <div className="spinner" />
        <span style={{ color: 'var(--text-muted)' }}>Loading...</span>
      </div>
    )
  }

  const week = currentWeek?.week
  const rideAllowed = currentWeek?.ride_currently_allowed ?? true

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.05em', lineHeight: 1 }}>
            THIS WEEK
          </h1>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            {week?.week_start && (() => {
              const s = new Date(week.week_start + 'T00:00:00Z')
              const e = new Date(week.week_end + 'T00:00:00Z')
              return `${s.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })} – ${e.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}`
            })()}
          </div>
        </div>
        <button
          className="btn btn-ghost"
          onClick={handleSync}
          disabled={syncing}
          style={{ flexShrink: 0 }}
        >
          {syncing ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '↻'}
          {syncing ? 'Syncing...' : 'Sync Strava'}
        </button>
      </div>

      {/* Status Banner */}
      <StatusBanner
        rideAllowed={rideAllowed}
        isAtRisk={week?.is_at_risk}
        isOnTrack={week?.is_on_track}
        week={week}
      />

      {/* Points Card */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
        <PointsRing earned={week?.points_earned || 0} goal={goal} size={160} />
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
            <Stat label="Points Earned" value={week?.points_earned || 0} unit="pts" />
            <Stat label="Points Needed" value={week?.points_needed || 0} unit="pts" />
            <Stat label="Days Remaining" value={week?.days_remaining ?? '—'} unit="days" />
            {week?.is_at_risk && <Stat label="Pace Needed" value={week?.points_per_day_needed} unit="pts/day" accent="var(--amber)" />}
          </div>
          {lastSync && (
            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Last synced: {lastSync.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Activities */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', letterSpacing: '0.05em' }}>
            ACTIVITIES THIS WEEK
          </h2>
          <span className="label">{activities.length} logged</span>
        </div>
        {activities.length === 0
          ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
              No activities logged yet this week.
            </div>
          )
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {activities.map(a => <ActivityRow key={a.id} activity={a} />)}
            </div>
          )
        }
      </div>

      {/* History */}
      {weeks.length > 0 && (
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
            PAST WEEKS
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {weeks.map(w => <WeekHistoryRow key={w.id} week={w} goal={goal} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, unit, accent }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: '0.25rem' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          letterSpacing: '0.03em',
          color: accent || 'var(--text)',
          lineHeight: 1,
        }}>{value}</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{unit}</span>
      </div>
    </div>
  )
}
