import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import { ChartCard, Spinner, ErrorBox, KpiCard } from '../components/UI.jsx'
import { useQuery } from '../hooks/useQuery.js'
import { fetchInterestRateMix, fetchCurrencyExposure } from '../lib/api.js'
import { colors, chartDefaults as cd } from '../lib/theme.js'

// Custom label for pie slices
function PieLabel({ cx, cy, midAngle, outerRadius, percent }) {
  if (percent < 0.06) return null
  const rad = Math.PI / 180
  const x = cx + (outerRadius + 20) * Math.cos(-midAngle * rad)
  const y = cy + (outerRadius + 20) * Math.sin(-midAngle * rad)
  return (
    <text x={x} y={y} fill={colors.textSecondary} textAnchor="middle"
      dominantBaseline="central" fontSize={11} fontFamily={`'IBM Plex Sans'`}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function RateCurrencyPage() {
  const rateMix  = useQuery(fetchInterestRateMix)
  const currency = useQuery(fetchCurrencyExposure)

  const loading = rateMix.loading || currency.loading
  const error   = rateMix.error   || currency.error

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <Spinner size={36} />
    </div>
  )
  if (error) return <ErrorBox message={error} />

  const rateData = rateMix.data.chart_data.labels.map((label, i) => ({
    name: label,
    value: rateMix.data.chart_data.amounts[i],
  }))
  const currencyData = currency.data.chart_data.labels.map((label, i) => ({
    name: label,
    value: currency.data.chart_data.amounts[i],
  }))

  const totalRate = rateData.reduce((s, d) => s + d.value, 0)
  const totalCcy  = currencyData.reduce((s, d) => s + d.value, 0)
  const fixedPct  = ((rateData[0]?.value || 0) / totalRate * 100).toFixed(0)

  return (
    <div style={{ padding: '20px 28px 32px', display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <KpiCard label="Fixed Rate Exposure"  value={fixedPct} unit="%" sub="of total portfolio" subColor={colors.teal} />
        <KpiCard label="Total Portfolio"      value={totalRate.toFixed(1)} unit="M USD" sub="across all facilities" />
        <KpiCard label="Currency Count"       value={currencyData.length} unit="CCY" sub="multi-currency facilities" subColor={colors.purple} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Rate mix donut */}
        <ChartCard title="Interest Rate Mix">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={rateData}
                cx="50%" cy="50%"
                innerRadius={70} outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={PieLabel}
              >
                {rateData.map((_, i) => (
                  <Cell key={i} fill={colors.chart[i % colors.chart.length]} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={cd.tooltipStyle.contentStyle}
                labelStyle={cd.tooltipStyle.labelStyle}
                formatter={(v, name) => [`${v}M`, name]}
              />
              <Legend {...cd.legendStyle} iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Currency exposure bar */}
        <ChartCard title="Currency Exposure (USD M equivalent)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={currencyData} layout="vertical" barCategoryGap="30%">
              <CartesianGrid {...cd.gridStyle} horizontal={false} />
              <XAxis type="number" {...cd.axisStyle} unit="M" />
              <YAxis type="category" dataKey="name" {...cd.axisStyle} width={40} />
              <Tooltip
                contentStyle={cd.tooltipStyle.contentStyle}
                cursor={cd.tooltipStyle.cursor}
                formatter={(v) => [`${v}M`, 'Exposure']}
              />
              <Bar dataKey="value" radius={[0,4,4,0]}>
                {currencyData.map((_, i) => (
                  <Cell key={i} fill={colors.chart[i % colors.chart.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  )
}
