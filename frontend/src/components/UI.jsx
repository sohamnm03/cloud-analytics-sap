import { colors, fonts } from '../lib/theme.js'

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, style = {}, className = '' }) {
  return (
    <div style={{
      background: colors.bgCard,
      border: `1px solid ${colors.border}`,
      borderRadius: 12,
      padding: '20px 22px',
      transition: 'border-color .2s',
      ...style,
    }}
    onMouseEnter={e => e.currentTarget.style.borderColor = colors.borderHover}
    onMouseLeave={e => e.currentTarget.style.borderColor = colors.border}
    >
      {children}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────
export function KpiCard({ label, value, unit, sub, subColor }) {
  return (
    <Card>
      <div style={{
        fontSize: 10,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        color: colors.textSecondary,
        marginBottom: 10,
        fontFamily: fonts.sans,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontSize: 28,
          fontWeight: 600,
          color: colors.textPrimary,
          fontFamily: fonts.mono,
          letterSpacing: '-1px',
          lineHeight: 1,
        }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: 12, color: colors.textSecondary, fontFamily: fonts.sans }}>
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div style={{
          fontSize: 11,
          color: subColor || colors.blue,
          marginTop: 6,
          fontFamily: fonts.sans,
        }}>
          {sub}
        </div>
      )}
    </Card>
  )
}

// ── Chart Card (with title) ───────────────────────────────────────────────
export function ChartCard({ title, children, style = {} }) {
  return (
    <Card style={style}>
      <div style={{
        fontSize: 10,
        letterSpacing: '1.5px',
        textTransform: 'uppercase',
        color: colors.textSecondary,
        marginBottom: 18,
        fontFamily: fonts.sans,
      }}>
        {title}
      </div>
      {children}
    </Card>
  )
}

// ── Section Header ────────────────────────────────────────────────────────
export function SectionHeader({ label }) {
  return (
    <div style={{
      fontSize: 10,
      letterSpacing: '2px',
      textTransform: 'uppercase',
      color: colors.textMuted,
      padding: '16px 0 8px',
      fontFamily: fonts.sans,
      borderBottom: `1px solid ${colors.border}`,
      marginBottom: 16,
    }}>
      {label}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 28 }) {
  return (
    <div style={{
      width: size,
      height: size,
      border: `2px solid ${colors.border}`,
      borderTopColor: colors.blue,
      borderRadius: '50%',
      animation: 'spin .7s linear infinite',
      display: 'inline-block',
    }} />
  )
}

// ── Error Box ─────────────────────────────────────────────────────────────
export function ErrorBox({ message }) {
  return (
    <div style={{
      background: '#1a0a0a',
      border: `1px solid ${colors.red}44`,
      borderRadius: 10,
      padding: '16px 20px',
      color: colors.red,
      fontSize: 13,
      fontFamily: fonts.sans,
    }}>
      <strong>Error: </strong>{message}
    </div>
  )
}

// ── Tag / Badge ───────────────────────────────────────────────────────────
export function Tag({ children, color }) {
  const c = color || colors.blue
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 10px',
      borderRadius: 20,
      background: c + '18',
      border: `1px solid ${c}44`,
      fontSize: 10,
      letterSpacing: '1px',
      color: c,
      textTransform: 'uppercase',
      fontFamily: fonts.sans,
    }}>
      {children}
    </span>
  )
}
