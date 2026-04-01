import { useState, useEffect, useCallback } from 'react'

/**
 * Simple data fetching hook.
 * Usage: const { data, loading, error, refetch } = useQuery(fetchFn, deps)
 */
export function useQuery(fetchFn, deps = []) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchFn()
      setData(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { run() }, [run])

  return { data, loading, error, refetch: run }
}

/**
 * Auth-specific hook — runs once on mount, manages auth state.
 */
export function useAuth(authenticateFn) {
  const [authState, setAuthState] = useState({
    status: 'idle', // idle | loading | success | error
    env: null,
    error: null,
    expiresAt: null,
  })

  useEffect(() => {
    setAuthState(s => ({ ...s, status: 'loading' }))
    authenticateFn()
      .then(({ env, expiresIn }) => {
        setAuthState({
          status: 'success',
          env,
          expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
          error: null,
        })
      })
      .catch(e => {
        setAuthState({ status: 'error', env: null, error: e.message, expiresAt: null })
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return authState
}
