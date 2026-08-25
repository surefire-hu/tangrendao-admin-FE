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
import type { RevenueSeriesPoint, DashboardPeriod } from '../../types'

interface Props {
  data: RevenueSeriesPoint[]
  period: DashboardPeriod
  color?: string
  height?: number
}

function formatBucket(bucket: string, period: DashboardPeriod): string {
  const d = new Date(bucket)
  if (period === 'day') return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  if (period === '6month' || period === 'year' || period === 'max') {
    return d.toLocaleDateString('zh-CN', { year: '2-digit', month: 'short' })
  }
  return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

export function RevenueChart({ data, period, color, height = 240 }: Props) {
  const { token } = theme.useToken()
  const chartColor = color || token.colorSuccess

  const formatted = data.map((d) => ({
    label: formatBucket(d.bucket, period),
    amount: d.amount,
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={formatted} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-revenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={token.colorBorderSecondary} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip formatter={(v: number) => [`€${v}`, '收入']} />
        <Area
          type="monotone"
          dataKey="amount"
          stroke={chartColor}
          strokeWidth={2}
          fill="url(#grad-revenue)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
