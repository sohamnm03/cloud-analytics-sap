/**
 * TEMPLATE_Dashboard.jsx — Copy this file to add a new dashboard.
 *
 * Steps:
 *  1. Copy to src/pages/CashflowDashboard.jsx (or whatever name)
 *  2. Add your query_type to the FastAPI backend (main.py)
 *  3. Register the route in App.jsx:
 *       cashflow: <CashflowDashboard env={env} secondsLeft={secondsLeft} />
 *  4. Set ?dashboard=cashflow in the SAP bootstrapper to load it
 *
 * The `env` prop gives you everything you need:
 *   env.token    — JWT for all API calls
 *   env.apiBase  — FastAPI base URL
 *   env.sid      — SAP System ID
 *   env.client   — SAP Client
 *   env.user     — SAP Username
 */
import React, { useEffect, useState } from 'react'
import { queryData } from '../lib/api'
import { KpiCard }   from '../components/KpiCard'
import { ChartCard } from '../components/ChartCard'
import { SessionBar } from '../components/SessionBar'

export default function TemplateDashboard({ env, secondsLeft }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    // Replace 'your_query_type' with what you add to main.py
    queryData(env.apiBase, env.token, 'your_query_type')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [env.token])

  if (loading) return <div style={styles.center}>Loading…</div>
  if (error)   return <div style={{...styles.center, color:'var(--accent4)'}}>Error: {error}</div>

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <header style={styles.header}>
        <div style={styles.title}>Your Dashboard Title</div>
      </header>

      {/* KPIs */}
      <div style={styles.kpiGrid}>
        <KpiCard label="Your KPI" value="123" unit="M" delay={50} />
      </div>

      {/* Charts */}
      <div style={styles.chartGrid}>
        <ChartCard title="Your Chart" delay={200}>
          {/* Recharts component here */}
        </ChartCard>
      </div>

      <div style={{ marginTop:'auto' }}>
        <SessionBar env={env} secondsLeft={secondsLeft} />
      </div>
    </div>
  )
}

const styles = {
  center: { display:'flex', alignItems:'center', justifyContent:'center', height:'100vh' },
  header: { padding:'22px 28px', borderBottom:'1px solid var(--border)', background:'var(--bg-panel)' },
  title:  { fontSize:'20px', fontWeight:'700', fontFamily:'var(--font-display)' },
  kpiGrid:   { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'12px', padding:'20px 24px 0' },
  chartGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', padding:'14px 24px 24px' },
}
