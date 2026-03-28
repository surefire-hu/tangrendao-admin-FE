import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { theme } from 'antd'
import type { DailyDataPoint } from '../../types'

interface Props {
  data: DailyDataPoint[]
  label?: string
  color?: string
  height?: number
}

export function DailyChart({ data, label = 'Visite', color, height = 200 }: Props) {
  const { token } = theme.useToken()
  const chartColor = color || token.colorPrimary

  const formatted = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }),
    count: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id={`grad-${label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip formatter={(v) => [v, label]} />
        <Area
          type="monotone"
          dataKey="count"
          stroke={chartColor}
          strokeWidth={2}
          fill={`url(#grad-${label})`}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
