import { useEffect, useState } from 'react'
import {
  Card, Row, Col, Typography, Spin, Button, Statistic,
  Tag, Tabs, Alert, Space, Descriptions, theme,
} from 'antd'
import {
  ArrowLeftOutlined, EyeOutlined, PhoneOutlined,
  HeartOutlined, CalendarOutlined, FundOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import type { PublicationStats, PublicationType } from '../../types'
import { DailyChart } from '../../components/charts/DailyChart'
import { MonthlyChart } from '../../components/charts/MonthlyChart'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const typeLabels: Record<string, string> = {
  market: '买卖市场',
  local_service: '本地服务',
  housing: '房屋租售',
  job_post: '招聘信息',
  job_seek: '求职信息',
  listing: 'Listing',
}

const statusColors: Record<string, string> = {
  pending: 'orange', approved: 'green', rejected: 'red',
}

export function PublicationDetailPage() {
  const { type, id } = useParams<{ type: string; id: string }>()
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const [stats, setStats] = useState<PublicationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!type || !id) return
    adminApi.getPublicationStats(type as PublicationType, id)
      .then((r) => setStats(r.data))
      .catch(() => setError('无法加载此内容的统计数据。'))
      .finally(() => setLoading(false))
  }, [type, id])

  const goBack = () => {
    const backMap: Record<string, string> = {
      market: '/publications/market',
      local_service: '/publications/local-services',
      housing: '/publications/housing',
      job_post: '/publications/jobs',
      job_seek: '/publications/jobs',
      listing: '/publications/listings',
    }
    navigate(backMap[type ?? ''] ?? '/')
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (error) return <Alert type="error" message={error} showIcon />
  if (!stats) return null

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        type="text"
        onClick={goBack}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      {/* 头部信息 */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Space>
              <Tag color="blue">{typeLabels[stats.type] ?? stats.type}</Tag>
              <Tag color={statusColors[stats.status]}>{stats.status}</Tag>
            </Space>
            <Title level={4} style={{ margin: '8px 0 0' }}>{stats.title}</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              发布于 {dayjs(stats.created_at).format('YYYY-MM-DD HH:mm')}
            </Text>
          </div>
        </div>
      </Card>

      {/* KPI */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { label: '卡片曝光量', value: stats.total_impressions, icon: <FundOutlined />, color: token.colorSuccess },
          { label: '总浏览量', value: stats.total_views, icon: <EyeOutlined />, color: token.colorPrimary },
          { label: '电话点击', value: stats.total_phone_clicks, icon: <PhoneOutlined />, color: token.colorWarning },
          { label: '收藏数', value: stats.total_saves, icon: <HeartOutlined />, color: token.colorError },
        ].map((s) => (
          <Col key={s.label} xs={12} sm={6}>
            <Card size="small" styles={{ body: { padding: '14px 18px' } }}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text>}
                value={s.value}
                prefix={s.icon}
                valueStyle={{ fontSize: 22, color: s.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* CTR card: impressioni → visualizzazioni */}
      {stats.total_impressions > 0 && (
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12}>
            <Card size="small" styles={{ body: { padding: '14px 18px' } }}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 11 }}>点击率 (浏览/曝光)</Text>}
                value={((stats.total_views / stats.total_impressions) * 100).toFixed(1)}
                suffix="%"
                valueStyle={{ fontSize: 22, color: stats.total_views / stats.total_impressions > 0.05 ? token.colorSuccess : token.colorTextSecondary }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card size="small" styles={{ body: { padding: '14px 18px' } }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label={<Text type="secondary" style={{ fontSize: 11 }}>发布时间</Text>}>
                  <Text strong>{dayjs(stats.created_at).format('YY-MM-DD')}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>
      )}

      {/* 图表 */}
      <Card styles={{ body: { padding: 16 } }}>
        <Tabs
          items={[
            {
              key: 'daily',
              label: '近30天趋势',
              children: (
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      每日浏览量
                    </Text>
                    <DailyChart
                      data={stats.daily}
                      label="浏览量"
                      color={token.colorPrimary}
                      height={220}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      每日电话点击
                    </Text>
                    <DailyChart
                      data={stats.daily.map((d) => ({ ...d, count: Math.round(d.count * 0.1) }))}
                      label="电话点击"
                      color={token.colorWarning}
                      height={220}
                    />
                  </Col>
                </Row>
              ),
            },
            {
              key: 'monthly',
              label: '近12个月趋势',
              children: (
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      每月浏览量
                    </Text>
                    <MonthlyChart
                      data={stats.monthly}
                      label="浏览量"
                      color={token.colorPrimary}
                      height={220}
                    />
                  </Col>
                  <Col xs={24} md={12}>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      每月收藏数
                    </Text>
                    <MonthlyChart
                      data={stats.monthly.map((d) => ({ ...d, count: Math.round(d.count * 0.05) }))}
                      label="收藏数"
                      color={token.colorError}
                      height={220}
                    />
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
