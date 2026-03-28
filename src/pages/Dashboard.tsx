import { useEffect, useState } from 'react'
import {
  Row, Col, Card, Statistic, Typography, Spin, Alert, Divider, Badge, Space, theme,
} from 'antd'
import {
  UserOutlined,
  RiseOutlined,
  ShoppingOutlined,
  EyeOutlined,
  PhoneOutlined,
  NotificationOutlined,
  ClockCircleOutlined,
  HomeOutlined,
  ToolOutlined,
  SolutionOutlined,
} from '@ant-design/icons'
import { adminApi } from '../api/admin'
import type { DashboardStats } from '../types'

const { Title, Text } = Typography

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

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { token } = theme.useToken()

  useEffect(() => {
    adminApi.getStats()
      .then((r) => setStats(r.data))
      .catch(() => setError('无法加载统计数据，请确认后端服务是否正常运行。'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>

  if (error) return <Alert type="error" message={error} showIcon style={{ margin: 24 }} />

  if (!stats) return null

  const ctr = stats.global_ctr ?? 0

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>数据总览</Title>

      {/* ── 用户 ────────────────────────────────────────────────────── */}
      <Text strong type="secondary" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>
        用户
      </Text>
      <Row gutter={[16, 16]} style={{ marginTop: 8, marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="注册用户"
            value={stats.users_total}
            prefix={<UserOutlined />}
            color={token.colorPrimary}
            extra={
              <Space size={4}>
                <Badge color="green" />
                <Text type="secondary" style={{ fontSize: 11 }}>今日 +{stats.users_today}</Text>
              </Space>
            }
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="本周新增"
            value={stats.users_week}
            prefix={<RiseOutlined />}
            color={token.colorSuccess}
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

      {/* ── 今日内容 ────────────────────────────────────────────────── */}
      <Text strong type="secondary" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>
        今日发布内容
      </Text>
      <Row gutter={[16, 16]} style={{ marginTop: 8, marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="招聘信息"
            value={stats.jobs_today}
            prefix={<SolutionOutlined />}
            extra={<Text type="secondary" style={{ fontSize: 11 }}>本周: {stats.jobs_week}</Text>}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="求职信息"
            value={stats.seeks_today}
            prefix={<UserOutlined />}
            extra={<Text type="secondary" style={{ fontSize: 11 }}>本周: {stats.seeks_week}</Text>}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="分类广告"
            value={stats.classifieds_today}
            prefix={<ShoppingOutlined />}
            extra={<Text type="secondary" style={{ fontSize: 11 }}>本周: {stats.classifieds_week}</Text>}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="已审核商家"
            value={stats.listings_approved}
            prefix={<ToolOutlined />}
            color={token.colorSuccess}
          />
        </Col>
      </Row>

      <Divider style={{ margin: '4px 0 20px' }} />

      {/* ── 今日互动 ────────────────────────────────────────────────── */}
      <Text strong type="secondary" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>
        今日互动数据
      </Text>
      <Row gutter={[16, 16]} style={{ marginTop: 8, marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="搜索次数"
            value={stats.searches_today}
            prefix={<EyeOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="电话点击"
            value={stats.phone_clicks_today}
            prefix={<PhoneOutlined />}
            extra={<Text type="secondary" style={{ fontSize: 11 }}>本周: {stats.phone_clicks_week}</Text>}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="AI 对话"
            value={stats.convs_today}
            prefix={<HomeOutlined />}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="AI 消息"
            value={stats.messages_today}
            prefix={<NotificationOutlined />}
          />
        </Col>
      </Row>

      <Divider style={{ margin: '4px 0 20px' }} />

      {/* ── 广告 ────────────────────────────────────────────────────── */}
      <Text strong type="secondary" style={{ textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>
        广告
      </Text>
      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={12} sm={6}>
          <StatCard
            title="活跃横幅"
            value={stats.ads_active}
            prefix={<NotificationOutlined />}
            color={token.colorPrimary}
          />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard
            title="全局点击率"
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
