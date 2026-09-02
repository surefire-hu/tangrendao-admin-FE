import { useEffect, useState } from 'react'
import {
  Row, Col, Card, Statistic, Typography, Spin, Alert, Divider, Badge, Space, Radio, Button, theme,
} from 'antd'
import type { ReactNode } from 'react'
import {
  UserOutlined,
  EyeOutlined,
  NotificationOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  WechatOutlined,
  AlipayCircleOutlined,
  AppleOutlined,
  MobileOutlined,
  IdcardOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
import { adminApi } from '../api/admin'
import { RevenueChart } from '../components/charts/RevenueChart'
import { RevenueTransactionsModal } from '../components/RevenueTransactionsModal'
import type { DashboardStats, RevenueStats, DashboardPeriod } from '../types'

const { Title, Text } = Typography

const PERIOD_OPTIONS: { value: DashboardPeriod; label: string }[] = [
  { value: 'day',    label: '今天' },
  { value: 'week',   label: '本周' },
  { value: 'month',  label: '本月' },
  { value: '6month', label: '近6月' },
  { value: 'year',   label: '近1年' },
  { value: 'max',    label: '全部' },
]

const PROVIDER_INFO: { value: 'wechat' | 'alipay' | 'apple'; label: string; icon: ReactNode }[] = [
  { value: 'wechat', label: '微信支付', icon: <WechatOutlined /> },
  { value: 'alipay', label: '支付宝',   icon: <AlipayCircleOutlined /> },
  { value: 'apple',  label: 'Apple Pay', icon: <AppleOutlined /> },
]

const AD_TYPE_INFO: { value: 'card' | 'banner' | 'splash'; label: string; icon: ReactNode }[] = [
  { value: 'card',   label: '卡片广告', icon: <IdcardOutlined /> },
  { value: 'banner', label: '横幅广告', icon: <NotificationOutlined /> },
  { value: 'splash', label: '全屏广告', icon: <MobileOutlined /> },
]

interface StatCardProps {
  title: string
  value: number
  suffix?: string
  prefix?: React.ReactNode
  color?: string
  extra?: React.ReactNode
}

function StatCard({ title, value, suffix, prefix, color, extra }: StatCardProps) {
  const { token } = theme.useToken()
  return (
    <Card
      size="small"
      style={{ height: '100%' }}
      styles={{ body: { padding: '16px 20px' } }}
    >
      <Statistic
        title={<Text type="secondary" style={{ fontSize: 12 }}>{title}</Text>}
        value={value}
        suffix={suffix}
        prefix={prefix}
        valueStyle={{ color: color ?? token.colorText, fontSize: 24, fontWeight: 600 }}
      />
      {extra && <div style={{ marginTop: 4 }}>{extra}</div>}
    </Card>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text strong type="secondary" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>
      {children}
    </Text>
  )
}

export function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('day')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [revenue, setRevenue] = useState<RevenueStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transactionsOpen, setTransactionsOpen] = useState(false)
  const { token } = theme.useToken()

  useEffect(() => {
    setLoading(true)
    Promise.all([adminApi.getStats(period), adminApi.getRevenueStats(period)])
      .then(([statsRes, revenueRes]) => {
        setStats(statsRes.data)
        setRevenue(revenueRes.data)
        setError(null)
      })
      .catch(() => setError('无法加载统计数据，请确认后端服务是否正常运行。'))
      .finally(() => setLoading(false))
  }, [period])

  if (loading && !stats) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>

  if (error) return <Alert type="error" message={error} showIcon style={{ margin: 24 }} />

  if (!stats || !revenue) return null

  const providerAmounts = Object.fromEntries(revenue.by_provider.map((p) => [p.provider, p]))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <Title level={4} style={{ margin: 0 }}>数据总览</Title>
        <Radio.Group
          size="small"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          optionType="button"
          buttonStyle="solid"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <Radio.Button key={opt.value} value={opt.value}>{opt.label}</Radio.Button>
          ))}
        </Radio.Group>
      </div>

      {/* ── 总览（当前实时状态，不随时间范围变化）───────────────────── */}
      <SectionLabel>总览</SectionLabel>
      <Row gutter={[16, 16]} style={{ marginTop: 8, marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="注册用户总数"
            value={stats.users_total}
            prefix={<UserOutlined />}
            color={token.colorPrimary}
            extra={
              <Space size={4}>
                <Badge color="green" />
                <Text type="secondary" style={{ fontSize: 11 }}>+{stats.users_new}</Text>
              </Space>
            }
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="游客用户"
            value={stats.guests_total}
            prefix={<ClockCircleOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="待审核商家"
            value={stats.listings_pending}
            prefix={<EyeOutlined />}
            color={stats.listings_pending > 0 ? token.colorWarning : undefined}
          />
        </Col>
      </Row>

      <Divider style={{ margin: '4px 0 20px' }} />

      {/* ── 真实收入（微信/支付宝/Apple Pay，不含后台充值）──────────── */}
      <SectionLabel>真实收入</SectionLabel>
      <Card
        size="small"
        style={{ marginTop: 8, marginBottom: 24 }}
        extra={
          <Button
            type="link"
            size="small"
            icon={<UnorderedListOutlined />}
            onClick={() => setTransactionsOpen(true)}
          >
            查看交易明细
          </Button>
        }
      >
        <Row gutter={[24, 16]} align="middle">
          <Col xs={24} md={6}>
            <Statistic
              title={<Text type="secondary" style={{ fontSize: 12 }}>所选时段总收入</Text>}
              value={revenue.total_amount}
              prefix={<DollarOutlined />}
              suffix={revenue.currency}
              valueStyle={{ color: token.colorSuccess, fontSize: 28, fontWeight: 700 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>{revenue.total_orders} 笔订单</Text>
          </Col>
          <Col xs={24} md={18}>
            <RevenueChart data={revenue.series} period={period} height={200} />
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        <Row gutter={[16, 16]}>
          {PROVIDER_INFO.map((p) => (
            <Col xs={24} sm={8} key={p.value}>
              <StatCard
                title={p.label}
                value={providerAmounts[p.value]?.amount ?? 0}
                suffix={revenue.currency}
                prefix={p.icon}
              />
            </Col>
          ))}
        </Row>
      </Card>

      <RevenueTransactionsModal
        open={transactionsOpen}
        period={period}
        currencies={revenue.by_currency.map((c) => c.currency)}
        onClose={() => setTransactionsOpen(false)}
      />

      {/* ── 广告效果（当前实时状态，不随时间范围变化）───────────────── */}
      <SectionLabel>广告效果</SectionLabel>
      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        {AD_TYPE_INFO.map((t) => {
          const s = stats.ads[t.value]
          return (
            <Col xs={24} sm={8} key={t.value}>
              <Card size="small" styles={{ body: { padding: '16px 20px' } }}>
                <Space size={6}>
                  {t.icon}
                  <Text type="secondary" style={{ fontSize: 12 }}>{t.label}</Text>
                </Space>
                <Row gutter={8} style={{ marginTop: 8 }}>
                  <Col span={12}>
                    <Statistic
                      title={<Text type="secondary" style={{ fontSize: 11 }}>曝光</Text>}
                      value={s.impressions}
                      valueStyle={{ fontSize: 20, fontWeight: 600 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title={<Text type="secondary" style={{ fontSize: 11 }}>点击</Text>}
                      value={s.clicks}
                      valueStyle={{ fontSize: 20, fontWeight: 600 }}
                    />
                  </Col>
                </Row>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>点击率 </Text>
                  <Text strong style={{ color: s.ctr > 2 ? token.colorSuccess : token.colorWarning, fontSize: 12 }}>
                    {s.ctr}%
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}> · {s.active_count} 个投放中</Text>
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}
