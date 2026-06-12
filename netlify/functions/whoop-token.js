/**
 * Netlify serverless function: whoop-token
 *
 * Handles Whoop OAuth token exchange and refresh server-side so that
 * WHOOP_CLIENT_SECRET never leaves the server.
 *
 * Supported operations (POST body JSON):
 *   - Token exchange:  { code, code_verifier }
 *   - Token refresh:   { refresh_token }
 *
 * Returns: { access_token, refresh_token, expires_in }
 */

const WHOOP_TOKEN_ENDPOINT = 'https://api.prod.whoop.com/oauth/oauth2/token'

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  // Add your production Netlify URL here, e.g.:
  // 'https://kadence.netlify.app',
]

function getCorsHeaders(requestOrigin) {
  const origin = ALLOWED_ORIGINS.includes(requestOrigin)
    ? requestOrigin
    : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

exports.handler = async function (event, _context) {
  const corsHeaders = getCorsHeaders(event.headers.origin || event.headers.Origin || '')

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  // Validate server-side secret is configured
  const clientSecret = process.env.WHOOP_CLIENT_SECRET
  if (!clientSecret) {
    console.error('[whoop-token] WHOOP_CLIENT_SECRET environment variable is not set')
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Server configuration error' }),
    }
  }

  let body
  try {
    body = JSON.parse(event.body || '{}')
  } catch {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    }
  }

  const clientId = process.env.VITE_WHOOP_CLIENT_ID
  const redirectUri = process.env.VITE_WHOOP_REDIRECT_URI

  let formParams

  if (body.code && body.code_verifier) {
    // ── PKCE authorization code exchange ──────────────────────────────────────
    formParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: body.code,
      code_verifier: body.code_verifier,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    })
  } else if (body.refresh_token) {
    // ── Refresh token ──────────────────────────────────────────────────────────
    formParams = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: body.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    })
  } else {
    return {
      statusCode: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Bad request',
        message: 'Provide either { code, code_verifier } or { refresh_token }',
      }),
    }
  }

  // Call Whoop token endpoint
  let whoopResponse
  try {
    whoopResponse = await fetch(WHOOP_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: formParams.toString(),
    })
  } catch (networkError) {
    console.error('[whoop-token] Network error calling Whoop:', networkError)
    return {
      statusCode: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to reach Whoop API' }),
    }
  }

  let tokenData
  try {
    tokenData = await whoopResponse.json()
  } catch {
    return {
      statusCode: 502,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid response from Whoop API' }),
    }
  }

  if (!whoopResponse.ok) {
    console.error('[whoop-token] Whoop token error:', whoopResponse.status, tokenData)
    return {
      statusCode: whoopResponse.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: tokenData.error || 'Token request failed',
        error_description: tokenData.error_description,
      }),
    }
  }

  // Return only the fields the client needs (never echo back client_secret)
  return {
    statusCode: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type || 'Bearer',
    }),
  }
}
