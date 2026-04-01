import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell,
} from 'recharts'
import { KpiCard, ChartCard, Spinner, ErrorBox } from '../components/UI.jsx'
import { useQuery } from '../hooks/useQuery.js'
import { fetchBorrowingsSummary, fetchMaturityProfile } from '../lib/api.js'
import { colors, chartDefaults as cd } from '../lib/theme.js'

// ── Custom tooltip for utilisation chart ─────────────────────────────────
function UtilTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={cd.tooltipStyle.contentStyle}>
      <div style={{ ...cd.tooltipStyle.labelStyle, marginBottom: 8 }}>{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 3 }}>
          <span style={{ color: p.fill }}>{p.name}</span>
          <span style={{ color: colors.textPrimary, fontWeight: 500 }}>{p.value}M</span>
        </div>
      ))}
    </div>
  )
}

// ── Maturity bar colours (near = amber/red, far = teal) ──────────────────
const MATURITY_COLORS = [colors.red, colors.amber, colors.amber, colors.blue, colors.teal, colors.teal]

export function OverviewPage() {
  const summary  = useQuery(fetchBorrowingsSummary)
  const maturity = useQuery(fetchMaturityProfile)

  const loading = summary.loading || maturity.loading
  const error   = summary.error   || maturity.error

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <Spinner size={36} />
    </div>
  )
  if (error) return <ErrorBox message={error} />

  const k = summary.data.kpis
  const utilisationData = summary.data.chart_data.labels.map((month, i) => ({
    month,
    Drawn:   summary.data.chart_data.drawn[i],
    Undrawn: summary.data.chart_data.undrawn[i],
  }))
  const maturityData = maturity.data.chart_data.labels.map((label, i) => ({
    label,
    amount: maturity.data.chart_data.amounts[i],
  }))

  return (
    <div style={{ padding: '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <KpiCard
          label="Avg Monthly Drawn"
          value={k.total_drawn_mln}
          unit="M"
          sub={`Facility: ${k.total_facility_mln}M`}
        />
        <KpiCard
          label="Utilisation"
          value={k.utilisation_pct}
          unit="%"
          sub={`${k.facilities_count} active facilities`}
          subColor={k.utilisation_pct > 85 ? colors.amber : colors.teal}
        />
        <KpiCard
          label="Wtd. Avg. Rate"
          value={k.weighted_avg_rate_pct}
          unit="%"
          sub={`YTD interest: ${k.ytd_interest_mln}M`}
          subColor={colors.textSecondary}
        />
      </div>

      {/* Utilisation chart */}
      <ChartCard title="Monthly Drawn vs Undrawn Facility (USD M)">
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={utilisationData} barCategoryGap="30%">
            <CartesianGrid {...cd.gridStyle} vertical={false} />
            <XAxis dataKey="month" {...cd.axisStyle} />
            <YAxis {...cd.axisStyle} unit="M" />
            <Tooltip content={<UtilTooltip />} />
            <Legend {...cd.legendStyle} />
            <Bar dataKey="Drawn"   stackId="a" fill={colors.blue}    radius={[0,0,3,3]} />
            <Bar dataKey="Undrawn" stackId="a" fill={colors.blueDim} radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Maturity profile */}
      <ChartCard title="Debt Maturity Profile (USD M)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={maturityData} barCategoryGap="35%">
            <CartesianGrid {...cd.gridStyle} vertical={false} />
            <XAxis dataKey="label" {...cd.axisStyle} />
            <YAxis {...cd.axisStyle} unit="M" />
            <Tooltip
              contentStyle={cd.tooltipStyle.contentStyle}
              labelStyle={cd.tooltipStyle.labelStyle}
              cursor={cd.tooltipStyle.cursor}
              formatter={(v) => [`${v}M`, 'Amount']}
            />
            <Bar dataKey="amount" radius={[4,4,0,0]}>
              {maturityData.map((_, i) => (
                <Cell key={i} fill={MATURITY_COLORS[i] || colors.blue} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

    </div>
  )
}
