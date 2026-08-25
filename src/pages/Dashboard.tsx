import { useEffect, useState } from 'react'
import {
  Row, Col, Card, Statistic, Typography, Spin, Alert, Divider, Badge, Space, Radio, theme,
} from 'antd'
import type { ReactNode } from 'react'
import {
  UserOutlined,
  RiseOutlined,
  ShoppingOutlined,
  EyeOutlined,
  PhoneOutlined,
  NotificationOutlined,
  ClockCircleOutlined,
  SolutionOutlined,
  DollarOutlined,
  WechatOutlined,
  AlipayCircleOutlined,
  AppleOutlined,
  MobileOutlined,
  GlobalOutlined,
} from '@ant-design/icons'
import { adminApi } from '../api/admin'
import { RevenueChart } from '../components/charts/RevenueChart'
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

const PLATFORM_INFO: { value: 'ios' | 'default'; label: string; icon: ReactNode }[] = [
  { value: 'ios',     label: 'iOS',        icon: <MobileOutlined /> },
  { value: 'default', label: '安卓 / 网页', icon: <GlobalOutlined /> },
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

  const ctr = stats.global_ctr ?? 0
  const providerAmounts = Object.fromEntries(revenue.by_provider.map((p) => [p.provider, p]))
  const platformAmounts = Object.fromEntries(revenue.by_platform.map((p) => [p.platform, p]))
  const otherCurrencies = revenue.by_currency.filter((c) => c.currency !== revenue.currency)

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
        <Col xs={12} sm={6}>
          <StatCard
            title="活跃横幅广告"
            value={stats.ads_active}
            prefix={<NotificationOutlined />}
          />
        </Col>
      </Row>

      <Divider style={{ margin: '4px 0 20px' }} />

      {/* ── 真实收入（微信/支付宝/Apple Pay，不含后台充值）──────────── */}
      <SectionLabel>真实收入</SectionLabel>
      <Card size="small" style={{ marginTop: 8, marginBottom: 24 }}>
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
            {otherCurrencies.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <Text type="warning" style={{ fontSize: 11 }}>
                  另有 {otherCurrencies.map((c) => `${c.amount} ${c.currency}`).join('、')} 非 {revenue.currency} 订单，未计入总额
                </Text>
              </div>
            )}
          </Col>
          <Col xs={24} md={18}>
            <RevenueChart data={revenue.series} period={period} height={200} />
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        <Row gutter={[16, 16]}>
          {PROVIDER_INFO.map((p) => (
            <Col xs={12} sm={8} md={4} key={p.value}>
              <StatCard
                title={p.label}
                value={providerAmounts[p.value]?.amount ?? 0}
                suffix={revenue.currency}
                prefix={p.icon}
              />
            </Col>
          ))}
          {PLATFORM_INFO.map((p) => (
            <Col xs={12} sm={8} md={4} key={p.value}>
              <StatCard
                title={p.label}
                value={platformAmounts[p.value]?.amount ?? 0}
                suffix={revenue.currency}
                prefix={p.icon}
              />
            </Col>
          ))}
        </Row>
      </Card>

      {/* ── 新增与发布（随所选时间范围变化）──────────────────────────── */}
      <SectionLabel>新增与发布</SectionLabel>
      <Row gutter={[16, 16]} style={{ marginTop: 8, marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="新增用户"
            value={stats.users_new}
            prefix={<RiseOutlined />}
            color={token.colorSuccess}
            extra={
              <Space size={4}>
                <Badge color="green" />
                <Text type="secondary" style={{ fontSize: 11 }}>所选时段</Text>
              </Space>
            }
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="招聘信息" value={stats.jobs_new} prefix={<SolutionOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="求职信息" value={stats.seeks_new} prefix={<UserOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="分类广告" value={stats.classifieds_new} prefix={<ShoppingOutlined />} />
        </Col>
      </Row>

      <Divider style={{ margin: '4px 0 20px' }} />

      {/* ── 互动数据（随所选时间范围变化）────────────────────────────── */}
      <SectionLabel>互动数据</SectionLabel>
      <Row gutter={[16, 16]} style={{ marginTop: 8, marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard title="搜索次数" value={stats.searches_new} prefix={<EyeOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard title="电话点击" value={stats.phone_clicks_new} prefix={<PhoneOutlined />} />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="AI 对话"
            value={stats.convs_new}
            prefix={<NotificationOutlined />}
            extra={<Text type="secondary" style={{ fontSize: 11 }}>消息数: {stats.messages_new}</Text>}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="广告点击率"
            value={ctr}
            suffix="%"
            prefix={<RiseOutlined />}
            color={ctr > 2 ? token.colorSuccess : token.colorWarning}
          />
        </Col>
      </Row>
    </div>
  )
}
