const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  const apiKey = process.env.INTERVALS_API_KEY
  const athleteId = process.env.INTERVALS_ATHLETE_ID

  if (!apiKey || !athleteId) {
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Intervals.icu not configured' }),
    }
  }

  let body
  try {
    body = JSON.parse(event.body)
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) }
  }

  const { path } = body
  if (!path) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing path' }) }
  }

  const url = `https://intervals.icu/api/v1/athlete/${athleteId}${path}`
  const auth = Buffer.from(`API_KEY:${apiKey}`).toString('base64')

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
    })
    const data = await res.json()
    return {
      statusCode: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  } catch (err) {
    return {
      statusCode: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to reach Intervals.icu', details: err.message }),
    }
  }
}
