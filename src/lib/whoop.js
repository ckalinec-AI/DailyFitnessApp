// PKCE utilities
export async function generateCodeVerifier() {
  const array = new Uint8Array(64)
  window.crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// Build Whoop OAuth authorization URL
export async function buildAuthUrl() {
  const verifier = await generateCodeVerifier()
  const challenge = await generateCodeChallenge(verifier)
  const state = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  sessionStorage.setItem('whoop_code_verifier', verifier)
  sessionStorage.setItem('whoop_oauth_state', state)

  const clientId = import.meta.env.VITE_WHOOP_CLIENT_ID || ''
  const redirectUri = import.meta.env.VITE_WHOOP_REDIRECT_URI || `${window.location.origin}/whoop/callback`
  const scopes = 'offline read:recovery read:cycles read:workout read:sleep read:profile read:body_measurement'

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state,
  })

  return `https://api.prod.whoop.com/oauth/oauth2/auth?${params.toString()}`
}

// Exchange code for tokens via Netlify function
export async function exchangeCode(code) {
  const codeVerifier = sessionStorage.getItem('whoop_code_verifier')
  if (!codeVerifier) throw new Error('Missing code verifier')

  const redirectUri = import.meta.env.VITE_WHOOP_REDIRECT_URI || `${window.location.origin}/whoop/callback`

  const res = await fetch('/.netlify/functions/whoop-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, code_verifier: codeVerifier, redirect_uri: redirectUri }),
  })
  if (!res.ok) throw new Error('Token exchange failed')
  return res.json()
}

// Refresh access token via Netlify function
export async function refreshAccessToken(refreshToken) {
  const res = await fetch('/.netlify/functions/whoop-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) throw new Error('Token refresh failed')
  return res.json()
}

// Whoop API base
const API_BASE = 'https://api.prod.whoop.com/developer'

async function whoopFetch(path, accessToken) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw Object.assign(new Error('Whoop API error'), { status: res.status })
  return res.json()
}

// GET /v2/recovery — returns latest record or null
export async function fetchRecovery(accessToken) {
  const data = await whoopFetch('/v2/recovery?limit=1', accessToken)
  return data.records?.[0] ?? null
}

// GET /v2/activity/sleep — returns latest record or null
export async function fetchSleep(accessToken) {
  const data = await whoopFetch('/v2/activity/sleep?limit=1', accessToken)
  return data.records?.[0] ?? null
}

// GET /v2/recovery for last N days (for HRV trend)
export async function fetchRecoveryHistory(accessToken, days = 30) {
  const start = new Date(Date.now() - days * 86400000).toISOString()
  const data = await whoopFetch(`/v2/recovery?limit=${days}&start=${start}`, accessToken)
  return data.records ?? []
}
