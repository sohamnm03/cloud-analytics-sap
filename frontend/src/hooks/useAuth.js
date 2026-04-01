/**
 * useAuth — reads JWT from URL params, validates it, exposes SAP env context.
 * This is the FIRST thing the React app does. If it fails, nothing renders.
 *
 * URL format (set by SAP bootstrapper):
 *   https://your-app.azurestaticapps.net/?token=JWT&sid=PRD&client=100
 */
import { useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

function parseJwtPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(atob(base64))
  } catch {
    return null
  }
}

export function useAuth() {
  const [state, setState] = useState({
    status: 'loading',
    env: null,
    error: null,
    secondsLeft: null,
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const sidParam = params.get('sid')

    if (!token) {
      setState({ status: 'error', error: 'No session token. Launch this app from SAP.', env: null })
      return
    }

    const payload = parseJwtPayload(token)
    if (!payload) {
      setState({ status: 'error', error: 'Malformed session token.', env: null })
      return
    }

    const now = Math.floor(Date.now() / 1000)
    if (now >= payload.exp) {
      setState({ status: 'error', error: 'Session expired. Please relaunch from SAP.', env: null })
      return
    }

    if (sidParam && sidParam.toUpperCase() !== payload.sap_sid) {
      setState({ status: 'error', error: 'Environment mismatch. Do not share this URL.', env: null })
      return
    }

    // env.apiBase is used by all dashboard components as the first arg to queryData()
    const env = {
      token,
      sid: payload.sap_sid,
      client: payload.sap_client,
      user: payload.sap_user,
      scope: payload.scope,
      exp: payload.exp,
      apiBase: API_BASE,
    }

    setState({ status: 'valid', env, error: null, secondsLeft: payload.exp - now })

    const interval = setInterval(() => {
      const rem = env.exp - Math.floor(Date.now() / 1000)
      if (rem <= 0) {
        clearInterval(interval)
        setState(s => ({ ...s, status: 'error', error: 'Session expired. Please relaunch from SAP.' }))
      } else {
        setState(s => ({ ...s, secondsLeft: rem }))
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return state
}