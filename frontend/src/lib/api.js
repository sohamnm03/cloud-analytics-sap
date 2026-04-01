/**
 * api.js — all calls to the FastAPI backend.
 * The JWT is always attached. If it expires mid-session, calls fail gracefully.
 * Keeps the original call signatures used by all dashboard components:
 *   queryData(apiBase, token, queryType, filters)
 *   fetchAllDashboardData(apiBase, token)
 *
 * session_id is read from the URL directly here — dashboards don't need
 * to know about it at all.
 */
function getSessionId() {
  try {
    return new URLSearchParams(window.location.search).get('session_id') || null
  } catch {
    return null
  }
}
export async function queryData(apiBase, token, queryType, filters = {}, rawData = null) {
  const sessionId = getSessionId()
  const body = {
    query_type: queryType,
    filters,
    ...(sessionId ? { session_id: sessionId } : {}),
    ...(rawData ? { raw_data: rawData } : {}), // ✅ ADD THIS
  }
  console.log("API BODY:", body) // 👈 DEBUG
  const res = await fetch(`${apiBase}/data/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `API error ${res.status}`)
  }
  return res.json()
}
export async function fetchAllDashboardData(apiBase, token) {
  const [summary, maturity, rateMix, currency] = await Promise.all([
    queryData(apiBase, token, 'borrowings_summary', { year: 2024 }),
    queryData(apiBase, token, 'maturity_profile'),
    queryData(apiBase, token, 'interest_rate_mix'),
    queryData(apiBase, token, 'currency_exposure'),
  ])
  return { summary, maturity, rateMix, currency }
}
export async function fetchCofDashboard(apiBase, token) {
  return queryData(apiBase, token, 'cof_dashboard')
}