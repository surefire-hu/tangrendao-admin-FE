import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { theme } from 'antd'
import type { MonthlyDataPoint } from '../../types'

interface Props {
  data: MonthlyDataPoint[]
  label?: string
  color?: string
  height?: number
}

export function MonthlyChart({ data, label = 'Totale', color, height = 200 }: Props) {
  const { token } = theme.useToken()
  const chartColor = color || token.colorSuccess

  const formatted = data.map((d) => ({
    month: d.month,
    count: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip formatter={(v) => [v, label]} />
        <Bar dataKey="count" fill={chartColor} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
