async function intervalsFetch(path) {
  const res = await fetch('/.netlify/functions/intervals-api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  })
  if (!res.ok) {
    let detail = res.status
    try { const j = await res.json(); detail = j.error || res.status } catch {}
    throw Object.assign(new Error(`Intervals ${res.status}: ${detail}`), { status: res.status })
  }
  return res.json()
}

// Planned events (workouts) in a date range
export async function fetchEvents(oldest, newest) {
  return intervalsFetch(
    `/events?oldest=${oldest}&newest=${newest}&fields=id,name,start_date_local,description,type,moving_time,category`
  )
}

// Completed activities in a date range
export async function fetchActivities(oldest, newest) {
  return intervalsFetch(
    `/activities?oldest=${oldest}&newest=${newest}&fields=id,name,start_date_local,type,distance,moving_time,icu_training_load,average_heartrate,max_heartrate`
  )
}
