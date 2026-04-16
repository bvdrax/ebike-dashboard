import { useState, useEffect } from 'react'
import { api } from '../lib/api'

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = ['Manual Credit', 'Activities', 'Activity Config', 'Weekly Goal', 'Users', 'Weeks']

export default function AdminPage() {
  const [tab, setTab] = useState(0)

  return (
    <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.05em' }}>
        ADMIN
      </h1>
      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            style={{
              background: tab === i ? 'var(--surface-3)' : 'none',
              border: tab === i ? '1px solid var(--border-bright)' : '1px solid transparent',
              color: tab === i ? 'var(--text)' : 'var(--text-muted)',
              borderRadius: 'var(--radius)',
              padding: '0.4rem 0.875rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <ManualCreditTab />}
      {tab === 1 && <ActivitiesTab />}
      {tab === 2 && <ActivityConfigTab />}
      {tab === 3 && <WeeklyGoalTab />}
      {tab === 4 && <UsersTab />}
      {tab === 5 && <WeeksTab />}
    </div>
  )
}

// ── Manual Credit ─────────────────────────────────────────────────────────────
function ManualCreditTab() {
  const [types, setTypes] = useState([])
  const [form, setForm] = useState({ activity_type_id: '', activity_date: '', value: '', name: '', note: '' })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getActivityTypes().then(data => {
      const enabled = data.filter(t => t.enabled)
      setTypes(enabled)
      if (enabled.length > 0) setForm(f => ({ ...f, activity_type_id: enabled[0].id }))
    })
  }, [])

  const selectedType = types.find(t => t.id === parseInt(form.activity_type_id))
  const previewPoints = selectedType && form.value
    ? (parseFloat(form.value) < selectedType.minimum_value ? 0 : Math.round(parseFloat(form.value) * selectedType.points_per_unit))
    : null

  const handleSubmit = async () => {
    setError('')
    setLoading(true)
    try {
      const data = await api.addCredit({
        activity_type_id: parseInt(form.activity_type_id),
        activity_date: form.activity_date,
        value: parseFloat(form.value),
        name: form.name || undefined,
        note: form.note || undefined,
      })
      setResult(data)
      setForm(f => ({ ...f, value: '', name: '', note: '' }))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Manually credit Lachlan for an activity not captured by Strava.
      </p>

      {result && (
        <div style={{ background: 'var(--green-glow)', border: '1px solid var(--green-dim)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', color: 'var(--green)', fontSize: '0.875rem' }}>
          ✓ Credited <strong>{result.points_awarded} points</strong> for "{result.activity?.name}"
        </div>
      )}

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Field label="Activity Type">
          <select
            value={form.activity_type_id}
            onChange={e => setForm(f => ({ ...f, activity_type_id: e.target.value }))}
            style={selectStyle}
          >
            {types.map(t => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.points_per_unit} pts/{t.unit})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Date">
          <input type="date" value={form.activity_date} onChange={e => setForm(f => ({ ...f, activity_date: e.target.value }))} style={inputStyle} />
        </Field>

        <Field label={selectedType ? `Value (${selectedType.unit}, min: ${selectedType.minimum_value})` : 'Value'}>
          <input type="number" step="0.01" min="0" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} style={inputStyle} placeholder="0" />
        </Field>

        <Field label="Activity Name (optional)">
          <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder={selectedType ? `Manual: ${selectedType.name}` : ''} />
        </Field>

        <Field label="Note (optional)">
          <input type="text" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={inputStyle} placeholder="e.g. Soccer practice at school" />
        </Field>

        {previewPoints !== null && (
          <div style={{ fontSize: '0.875rem', color: previewPoints > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
            {previewPoints > 0 ? `→ Will award ${previewPoints} points` : `→ Below minimum (${selectedType.minimum_value} ${selectedType.unit}) — 0 points`}
          </div>
        )}

        {error && <div style={{ color: 'var(--red)', fontSize: '0.875rem' }}>{error}</div>}

        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading || !form.activity_type_id || !form.activity_date || !form.value}
        >
          {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '+ Add Credit'}
        </button>
      </div>
    </div>
  )
}

// ── Activities ────────────────────────────────────────────────────────────────
function ActivitiesTab() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(null)
  const [clearing, setClearing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const reload = () => api.getActivities().then(data => { setActivities(data); setLoading(false) })
  useEffect(() => { reload() }, [])

  const startEdit = (activity) => {
    // Pre-fill with current effective values (override if exists, else original)
    setEditing({
      id: activity.id,
      value: String(activity.override_value ?? activity.original_value),
      name: activity.override_name ?? activity.original_name ?? '',
      note: activity.override_note ?? activity.original_note ?? '',
    })
  }

  const save = async (id) => {
    setSaving(id)
    try {
      await api.updateActivity(id, {
        value: parseFloat(editing.value),
        name: editing.name || null,
        note: editing.note || null,
      })
      setEditing(null)
      await reload()
    } catch (err) {
      alert(err.message)
    } finally {
      setSaving(null)
    }
  }

  const clearOverride = async (id) => {
    setClearing(id)
    try {
      await api.clearActivityOverride(id)
      await reload()
    } finally {
      setClearing(null)
    }
  }

  const remove = async (activity) => {
    const msg = activity.source === 'strava'
      ? 'Delete this Strava activity? It will re-appear on the next Strava sync. Use an override to change values instead.'
      : 'Delete this manual credit? Points will be recalculated.'
    if (!window.confirm(msg)) return
    setDeleting(activity.id)
    try {
      await api.deleteActivity(activity.id)
      await reload()
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <div className="spinner" />
  if (activities.length === 0) return <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No activities yet.</div>

  const grouped = activities.reduce((acc, a) => {
    const key = a.week_start || 'unknown'
    if (!acc[key]) acc[key] = []
    acc[key].push(a)
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '800px' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Edits are stored as overrides and survive Strava re-syncs. Strava values are always preserved.
      </p>
      {Object.entries(grouped).map(([weekStart, acts]) => {
        const label = weekStart !== 'unknown'
          ? new Date(weekStart + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
          : 'Unknown week'
        return (
          <div key={weekStart}>
            <div className="label" style={{ marginBottom: '0.5rem' }}>Week of {label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {acts.map(activity => {
                const isEditing = editing?.id === activity.id
                const hasOverride = activity.override_id != null
                const effValue = activity.override_value ?? activity.original_value
                const effPoints = activity.override_points ?? activity.original_points
                const effName = activity.override_name ?? activity.original_name
                const effNote = activity.override_note ?? activity.original_note

                return (
                  <div key={activity.id} className="card" style={{ padding: '0.875rem 1rem', borderLeft: hasOverride ? '2px solid var(--amber)' : undefined }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Strava original: {parseFloat(activity.original_value).toFixed(2)} {activity.unit} · {activity.original_points} pts · {activity.original_name}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
                          <Field label={`Value (${activity.unit})`}>
                            <input type="number" step="0.01" value={editing.value}
                              onChange={e => setEditing(ed => ({ ...ed, value: e.target.value }))}
                              style={inputStyle} />
                          </Field>
                          <Field label="Name (blank = use original)">
                            <input type="text" value={editing.name}
                              onChange={e => setEditing(ed => ({ ...ed, name: e.target.value }))}
                              style={inputStyle} placeholder={activity.original_name} />
                          </Field>
                          <Field label="Note">
                            <input type="text" value={editing.note}
                              onChange={e => setEditing(ed => ({ ...ed, note: e.target.value }))}
                              style={inputStyle} />
                          </Field>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-primary" onClick={() => save(activity.id)} disabled={saving === activity.id}>
                            {saving === activity.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Save Override'}
                          </button>
                          <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                          <div style={{ fontWeight: 500, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {effName}
                            {hasOverride && (
                              <span style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: '3px', fontWeight: 700,
                                letterSpacing: '0.08em', background: 'var(--amber-glow)', color: 'var(--amber)', textTransform: 'uppercase' }}>
                                overridden
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {new Date(activity.activity_date + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                            {' · '}{activity.type_name}
                            {' · '}{parseFloat(effValue).toFixed(2)} {activity.unit}
                            {hasOverride && parseFloat(activity.override_value) !== parseFloat(activity.original_value) && (
                              <span style={{ color: 'var(--text-dim)' }}> (was {parseFloat(activity.original_value).toFixed(2)})</span>
                            )}
                            {effNote && ` · ${effNote}`}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: 'var(--green)' }}>
                            +{effPoints}
                            {hasOverride && parseFloat(activity.override_points) !== parseFloat(activity.original_points) && (
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.7rem', color: 'var(--text-dim)', marginLeft: '4px' }}>
                                (was {activity.original_points})
                              </span>
                            )}
                          </span>
                          <span style={{
                            fontSize: '0.65rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 600,
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                            background: activity.source === 'strava' ? 'var(--blue-dim)' : 'var(--surface-3)',
                            color: activity.source === 'strava' ? 'var(--blue)' : 'var(--text-muted)',
                          }}>
                            {activity.source}
                          </span>
                          <button className="btn btn-ghost" onClick={() => startEdit(activity)}
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem' }}>
                            {hasOverride ? 'Edit Override' : 'Override'}
                          </button>
                          {hasOverride && (
                            <button className="btn btn-ghost" onClick={() => clearOverride(activity.id)}
                              disabled={clearing === activity.id}
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', color: 'var(--amber)', borderColor: 'var(--amber-glow)' }}>
                              {clearing === activity.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Clear'}
                            </button>
                          )}
                          <button className="btn btn-ghost" onClick={() => remove(activity)}
                            disabled={deleting === activity.id}
                            style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', color: 'var(--red)', borderColor: 'var(--red-dim)' }}>
                            {deleting === activity.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Delete'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Activity Config ───────────────────────────────────────────────────────────
function ActivityConfigTab() {
  const [types, setTypes] = useState([])
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newType, setNewType] = useState({ name: '', strava_type: '', points_per_unit: 10, unit: 'mile', minimum_value: 1, points_increment: '' })
  const [addError, setAddError] = useState('')

  useEffect(() => { api.getActivityTypes().then(setTypes) }, [])

  const save = async (id) => {
    setSaving(id)
    try {
      const updated = await api.updateActivityType(id, editing)
      setTypes(ts => ts.map(t => t.id === id ? updated : t))
      setEditing(null)
    } finally {
      setSaving(null)
    }
  }

  const toggle = async (type) => {
    const updated = await api.updateActivityType(type.id, { enabled: !type.enabled })
    setTypes(ts => ts.map(t => t.id === type.id ? updated : t))
  }

  const addType = async () => {
    setAddError('')
    try {
      const created = await api.createActivityType({
        ...newType,
        strava_type: newType.strava_type || null,
        points_per_unit: parseFloat(newType.points_per_unit),
        minimum_value: parseFloat(newType.minimum_value),
        points_increment: newType.points_increment !== '' ? parseFloat(newType.points_increment) : null,
      })
      setTypes(ts => [...ts, created])
      setShowAdd(false)
      setNewType({ name: '', strava_type: '', points_per_unit: 10, unit: 'mile', minimum_value: 1 })
    } catch (err) {
      setAddError(err.message)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: '700px' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Changes apply to future activities only. Past activities keep their original points.
      </p>

      {types.map(type => (
        <div key={type.id} className="card" style={{ padding: '1rem' }}>
          {editing?.id === type.id ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                <Field label="Points per unit">
                  <input type="number" step="0.1" value={editing.points_per_unit}
                    onChange={e => setEditing(ed => ({ ...ed, points_per_unit: parseFloat(e.target.value) }))}
                    style={inputStyle} />
                </Field>
                <Field label="Unit">
                  <select value={editing.unit} onChange={e => setEditing(ed => ({ ...ed, unit: e.target.value }))} style={selectStyle}>
                    <option value="mile">mile</option>
                    <option value="km">km</option>
                    <option value="minute">minute</option>
                    <option value="hour">hour</option>
                  </select>
                </Field>
                <Field label={`Minimum (${editing.unit}s)`}>
                  <input type="number" step="0.1" value={editing.minimum_value}
                    onChange={e => setEditing(ed => ({ ...ed, minimum_value: parseFloat(e.target.value) }))}
                    style={inputStyle} />
                </Field>
                <Field label={`Increment (${editing.unit}s, blank = none)`}>
                  <input type="number" step="0.1" min="0.1"
                    value={editing.points_increment ?? ''}
                    onChange={e => setEditing(ed => ({ ...ed, points_increment: e.target.value !== '' ? parseFloat(e.target.value) : null }))}
                    style={inputStyle} placeholder="No increment" />
                </Field>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" onClick={() => save(type.id)} disabled={saving === type.id}>
                  {saving === type.id ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Save'}
                </button>
                <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '140px' }}>
                <div style={{ fontWeight: 500, opacity: type.enabled ? 1 : 0.4 }}>{type.name}</div>
                {type.strava_type && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Strava: {type.strava_type}</div>}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)', opacity: type.enabled ? 1 : 0.4 }}>
                {type.points_per_unit} pts/{type.unit} · min {type.minimum_value} {type.unit}{type.points_increment ? ` · every ${type.points_increment} ${type.unit}` : ''}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-ghost" onClick={() => setEditing({ ...type })} style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                  Edit
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => toggle(type)}
                  style={{
                    padding: '0.35rem 0.75rem', fontSize: '0.8rem',
                    color: type.enabled ? 'var(--red)' : 'var(--green)',
                    borderColor: type.enabled ? 'var(--red-dim)' : 'var(--green-dim)',
                  }}
                >
                  {type.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {showAdd ? (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>New Activity Type</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            <Field label="Name"><input value={newType.name} onChange={e => setNewType(n => ({ ...n, name: e.target.value }))} style={inputStyle} /></Field>
            <Field label="Strava Type (optional)"><input value={newType.strava_type} onChange={e => setNewType(n => ({ ...n, strava_type: e.target.value }))} style={inputStyle} placeholder="e.g. Run" /></Field>
            <Field label="Pts per unit"><input type="number" value={newType.points_per_unit} onChange={e => setNewType(n => ({ ...n, points_per_unit: e.target.value }))} style={inputStyle} /></Field>
            <Field label="Unit">
              <select value={newType.unit} onChange={e => setNewType(n => ({ ...n, unit: e.target.value }))} style={selectStyle}>
                <option value="mile">mile</option>
                <option value="km">km</option>
                <option value="minute">minute</option>
                <option value="hour">hour</option>
              </select>
            </Field>
            <Field label={`Minimum (${newType.unit}s)`}><input type="number" value={newType.minimum_value} onChange={e => setNewType(n => ({ ...n, minimum_value: e.target.value }))} style={inputStyle} /></Field>
            <Field label={`Increment (${newType.unit}s, blank = none)`}><input type="number" step="0.1" value={newType.points_increment} onChange={e => setNewType(n => ({ ...n, points_increment: e.target.value }))} style={inputStyle} placeholder="No increment" /></Field>
          </div>
          {addError && <div style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{addError}</div>}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-primary" onClick={addType} disabled={!newType.name}>Add</button>
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="btn btn-ghost" onClick={() => setShowAdd(true)} style={{ alignSelf: 'flex-start' }}>
          + Add Activity Type
        </button>
      )}
    </div>
  )
}

// ── Weekly Goal ───────────────────────────────────────────────────────────────
function WeeklyGoalTab() {
  const [goal, setGoal] = useState('')
  const [maxPerDay, setMaxPerDay] = useState('')
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getWeeklyConfig().then(c => {
      setGoal(c.points_goal)
      setMaxPerDay(c.max_points_per_day ?? '')
      setLoading(false)
    })
  }, [])

  const save = async () => {
    await api.updateWeeklyConfig({
      points_goal: parseInt(goal),
      max_points_per_day: maxPerDay !== '' ? parseInt(maxPerDay) : null,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className="spinner" />

  return (
    <div style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        Changes apply to the current week going forward. Recalculates existing week totals.
      </p>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <Field label="Weekly Points Goal">
          <input type="number" min="1" value={goal} onChange={e => setGoal(e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Max Points Per Day (leave blank for no cap)">
          <input
            type="number" min="1" value={maxPerDay}
            onChange={e => setMaxPerDay(e.target.value)}
            style={inputStyle}
            placeholder="No cap"
          />
        </Field>
        <button className="btn btn-primary" onClick={save} disabled={!goal} style={{ alignSelf: 'flex-start' }}>
          {saved ? '✓ Saved' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ── Users ─────────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ username: '', password: '', role: 'athlete', display_name: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [resetingId, setResetingId] = useState(null)
  const [resetForm, setResetForm] = useState({ password: '', confirm: '' })
  const [resetError, setResetError] = useState('')
  const [resetSaving, setResetSaving] = useState(false)

  useEffect(() => { api.listUsers().then(setUsers) }, [])

  const create = async () => {
    setError(''); setSuccess('')
    try {
      const data = await api.createUser(form)
      setUsers(u => [...u, data.user])
      setSuccess(`User "${data.user.username}" created.`)
      setForm({ username: '', password: '', role: 'athlete', display_name: '' })
    } catch (err) {
      setError(err.message)
    }
  }

  const startReset = (id) => {
    setResetingId(id)
    setResetForm({ password: '', confirm: '' })
    setResetError('')
  }

  const saveReset = async (id) => {
    if (resetForm.password !== resetForm.confirm) { setResetError('Passwords do not match'); return }
    if (resetForm.password.length < 4) { setResetError('Password too short'); return }
    setResetSaving(true); setResetError('')
    try {
      await api.resetUserPassword(id, resetForm.password)
      setResetingId(null)
    } catch (err) {
      setResetError(err.message)
    } finally {
      setResetSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
        {users.map((u, i) => (
          <div key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.6rem 0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', minWidth: '80px' }}>{u.username}</span>
              <span style={{ flex: 1, fontSize: '0.875rem' }}>{u.display_name}</span>
              <span style={{
                fontSize: '0.7rem', padding: '2px 7px', borderRadius: '4px', fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                background: u.role === 'admin' ? 'var(--amber-glow)' : u.role === 'parent' ? 'var(--blue-dim)' : 'var(--green-dim)',
                color: u.role === 'admin' ? 'var(--amber)' : u.role === 'parent' ? 'var(--blue)' : 'var(--green)',
              }}>{u.role}</span>
              <button className="btn btn-ghost" onClick={() => resetingId === u.id ? setResetingId(null) : startReset(u.id)}
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}>
                {resetingId === u.id ? 'Cancel' : 'Reset Password'}
              </button>
            </div>
            {resetingId === u.id && (
              <div style={{ padding: '0.75rem', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <Field label="New Password">
                    <input type="password" value={resetForm.password} onChange={e => setResetForm(f => ({ ...f, password: e.target.value }))}
                      style={inputStyle} autoComplete="new-password" />
                  </Field>
                  <Field label="Confirm">
                    <input type="password" value={resetForm.confirm} onChange={e => setResetForm(f => ({ ...f, confirm: e.target.value }))}
                      style={inputStyle} autoComplete="new-password" />
                  </Field>
                </div>
                {resetError && <div style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{resetError}</div>}
                <button className="btn btn-primary" onClick={() => saveReset(u.id)}
                  disabled={resetSaving || !resetForm.password || !resetForm.confirm}
                  style={{ alignSelf: 'flex-start' }}>
                  {resetSaving ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Save'}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Create User</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <Field label="Username"><input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} style={inputStyle} /></Field>
          <Field label="Display Name"><input value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} style={inputStyle} /></Field>
          <Field label="Password"><input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={inputStyle} /></Field>
          <Field label="Role">
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} style={selectStyle}>
              <option value="athlete">Athlete</option>
              <option value="parent">Parent</option>
            </select>
          </Field>
        </div>
        {error && <div style={{ color: 'var(--red)', fontSize: '0.8rem' }}>{error}</div>}
        {success && <div style={{ color: 'var(--green)', fontSize: '0.8rem' }}>{success}</div>}
        <button className="btn btn-primary" onClick={create}
          disabled={!form.username || !form.password || !form.display_name}
          style={{ alignSelf: 'flex-start' }}>
          Create User
        </button>
      </div>
    </div>
  )
}

// ── Weeks (suspension management) ────────────────────────────────────────────
function WeeksTab() {
  const [weeks, setWeeks] = useState([])
  const [goal, setGoal] = useState(100)
  const [lifting, setLifting] = useState(null)

  useEffect(() => {
    api.getWeeks().then(data => { setWeeks(data.weeks); setGoal(data.goal) })
  }, [])

  const lift = async (weekId) => {
    setLifting(weekId)
    try {
      await api.liftSuspension(weekId)
      setWeeks(ws => ws.map(w => w.id === weekId ? { ...w, suspension_lifted: true, ride_allowed: true } : w))
    } finally {
      setLifting(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '700px' }}>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
        Manage week results and override suspensions.
      </p>
      {weeks.map(w => {
        const start = new Date(w.week_start + 'T00:00:00Z')
        const end = new Date(w.week_end + 'T00:00:00Z')
        const label = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`
        const failed = w.goal_met === false && !w.suspension_lifted

        return (
          <div key={w.id} className="card" style={{ padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                {w.points_earned} / {goal} pts
                {w.suspension_lifted && ' · suspension lifted'}
                {w.finalized_at === null && ' · in progress'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <StatusPill week={w} />
              {failed && (
                <button
                  className="btn btn-ghost"
                  onClick={() => lift(w.id)}
                  disabled={lifting === w.id}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem', color: 'var(--green)', borderColor: 'var(--green-dim)' }}
                >
                  {lifting === w.id ? <span className="spinner" style={{ width: 12, height: 12 }} /> : 'Lift Suspension'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatusPill({ week }) {
  let color, label
  if (week.finalized_at === null) { color = 'var(--amber)'; label = 'In Progress' }
  else if (week.goal_met) { color = 'var(--green)'; label = 'Passed' }
  else if (week.suspension_lifted) { color = 'var(--blue)'; label = 'Lifted' }
  else { color = 'var(--red)'; label = 'Failed' }

  return (
    <span style={{
      fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.05em',
      background: color + '22', color,
    }}>
      {label}
    </span>
  )
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputStyle = {
  width: '100%',
  background: 'var(--surface-3)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '0.55rem 0.75rem',
  color: 'var(--text)',
  fontSize: '0.875rem',
  outline: 'none',
}

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label" style={{ display: 'block', marginBottom: '0.35rem' }}>{label}</label>
      {children}
    </div>
  )
}
