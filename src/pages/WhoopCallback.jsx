import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { exchangeCode } from '../lib/whoop'
import { setItem } from '../lib/storage'

export default function WhoopCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('connecting') // 'connecting' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error) {
      setStatus('error')
      setErrorMsg(error === 'access_denied' ? 'Access denied. Please try again.' : `OAuth error: ${error}`)
      return
    }

    if (!code) {
      setStatus('error')
      setErrorMsg('No authorization code received.')
      return
    }

    exchangeCode(code)
      .then(data => {
        setItem('whoop_access_token', data.access_token)
        if (data.refresh_token) setItem('whoop_refresh_token', data.refresh_token)
        setItem('whoop_token_expiry', Date.now() + (data.expires_in || 3600) * 1000)
        sessionStorage.removeItem('whoop_code_verifier')
        navigate('/', { replace: true })
      })
      .catch(err => {
        setStatus('error')
        setErrorMsg(err.message || 'Failed to connect Whoop.')
      })
  }, [navigate])

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h1 className="text-xl font-bold text-white mb-2">Connection Failed</h1>
        <p className="text-sm text-gray-400 mb-6">{errorMsg}</p>
        <button onClick={() => navigate('/settings')} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold">
          Back to Settings
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-blue-400 rounded-full animate-spin mb-4" />
      <p className="text-sm text-gray-400">Connecting Whoop...</p>
    </div>
  )
}
