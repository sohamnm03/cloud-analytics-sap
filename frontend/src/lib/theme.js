/**
 * Design tokens — SAP-embedded dark theme
 * All components import from here for consistency.
 */

export const colors = {
  // Backgrounds
  bg:        '#0a1628',
  bgCard:    '#0f1e35',
  bgHover:   '#132542',
  border:    '#1a3050',
  borderHover: '#2a4a72',

  // Text
  textPrimary:   '#e2ecff',
  textSecondary: '#5a7a9a',
  textMuted:     '#2d4a66',

  // Brand / accent
  blue:     '#3b82f6',
  blueDim:  '#1a3a6e',
  teal:     '#14b8a6',
  amber:    '#f59e0b',
  red:      '#ef4444',
  purple:   '#8b5cf6',

  // Chart palette — ordered for use in datasets
  chart: ['#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
}

export const fonts = {
  sans: "'IBM Plex Sans', sans-serif",
  mono: "'IBM Plex Mono', monospace",
}

// Recharts shared axis/grid props
export const chartDefaults = {
  axisStyle: {
    tick: { fill: colors.textSecondary, fontSize: 11, fontFamily: fonts.sans },
    axisLine: { stroke: colors.border },
    tickLine: { stroke: 'transparent' },
  },
  gridStyle: {
    stroke: colors.border,
    strokeDasharray: '3 3',
  },
  tooltipStyle: {
    contentStyle: {
      background: colors.bgCard,
      border: `1px solid ${colors.border}`,
      borderRadius: 8,
      fontSize: 12,
      fontFamily: fonts.sans,
      color: colors.textPrimary,
    },
    labelStyle: { color: colors.textSecondary, marginBottom: 4 },
    cursor: { fill: colors.blueDim + '44' },
  },
  legendStyle: {
    wrapperStyle: { fontSize: 11, fontFamily: fonts.sans, color: colors.textSecondary },
  },
}
