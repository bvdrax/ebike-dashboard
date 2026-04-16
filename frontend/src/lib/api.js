function getToken() {
  try {
    const stored = localStorage.getItem('auth')
    return stored ? JSON.parse(stored).token : null
  } catch {
    return null
  }
}

async function request(method, path, body) {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  // Auth
  login:      (username, password) => request('POST', '/auth/login', { username, password }),
  me:         ()                   => request('GET',  '/auth/me'),
  listUsers:  ()                   => request('GET',  '/auth/users'),
  createUser: (data)               => request('POST', '/auth/users', data),

  // Dashboard
  getCurrentWeek:     ()   => request('GET',  '/dashboard/current-week'),
  getWeeks:           ()   => request('GET',  '/dashboard/weeks'),
  getWeekActivities:  (id) => request('GET',  `/dashboard/weeks/${id}/activities`),
  sync:               ()   => request('POST', '/dashboard/sync'),

  // Config
  getActivityTypes:   ()        => request('GET',  '/config/activity-types'),
  createActivityType: (data)    => request('POST', '/config/activity-types', data),
  updateActivityType: (id, data)=> request('PUT',  `/config/activity-types/${id}`, data),
  getWeeklyConfig:    ()        => request('GET',  '/config/weekly'),
  updateWeeklyConfig: (data)    => request('PUT',  '/config/weekly', data),
  addCredit:          (data)    => request('POST', '/config/credits', data),
  liftSuspension:     (weekId)  => request('POST', `/config/weeks/${weekId}/lift-suspension`),
  getActivities:      ()        => request('GET',  '/config/activities'),
  updateActivity:     (id, data)=> request('PUT',  `/config/activities/${id}`, data),
  deleteActivity:     (id)      => request('DELETE',`/config/activities/${id}`),
}
