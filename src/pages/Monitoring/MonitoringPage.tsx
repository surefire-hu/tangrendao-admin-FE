import { useEffect, useState } from 'react'
import {
  Card, Col, Row, Statistic, Table, Tag, Segmented,
  Typography, Space, Spin, Alert, Progress, Tooltip,
} from 'antd'
import {
  BugOutlined, ClockCircleOutlined, MobileOutlined,
  BarChartOutlined, AppstoreOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import { apiClient } from '../../api/client'

const { Title, Text } = Typography

// ── Types ─────────────────────────────────────────────────────────────────────

interface ErrorStats {
  period_days: number
  total: number
  by_type: { error_type: string; count: number }[]
  by_version: { app_version: string; count: number }[]
  by_platform: { platform: string; count: number }[]
  recent: {
    id: string
    error_type: string
    message: string
    url: string
    app_version: string
    platform: string
    os_version: string
    created_at: string
    user__email: string | null
  }[]
}

interface EngagementStats {
  period_days: number
  funnel: Record<string, Record<string, number>>
  avg_dwell_seconds: Record<string, number>
  by_platform: { platform: string; count: number }[]
  by_version: { app_version: string; count: number }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// "classified" from the backend maps to 3 separate types client-side.
// We keep them separate so the funnel cards are readable.
const ENTITY_LABELS: Record<string, string> = {
  restaurant:    '商家/餐厅',
  job_post:      '招聘帖子',
  job_seek:      '求职帖子',
  housing:       '房源信息',
  market:        '买卖市场',
  local_service: '本地服务',
  forum_post:    '社区帖子',
  classified:    '分类广告',   // fallback if backend still uses generic key
}

const ENTITY_ORDER = [
  'restaurant', 'job_post', 'job_seek',
  'housing', 'market', 'local_service', 'forum_post', 'classified',
]

const ERROR_COLOR: Record<string, string> = {
  api_error:    'red',
  js_error:     'orange',
  crash:        'volcano',
  upload_fail:  'gold',
  auth_fail:    'purple',
  unknown:      'default',
}

const ERROR_DESC: Record<string, string> = {
  api_error:   'HTTP请求失败，通常是后端返回4xx/5xx错误',
  js_error:    'JavaScript运行时异常，未被捕获的错误',
  crash:       'App崩溃或致命错误，导致页面无法使用',
  upload_fail: '文件上传失败，可能是网络超时或文件格式问题',
  auth_fail:   'Token刷新失败，用户被强制退出登录',
  unknown:     '未分类的错误',
}

// Tooltip helper
function Info({ text }: { text: string }) {
  return (
    <Tooltip title={text}>
      <InfoCircleOutlined style={{ color: '#8c8c8c', marginLeft: 4, fontSize: 12, cursor: 'help' }} />
    </Tooltip>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MonitoringPage() {
  const [days, setDays] = useState<number>(7)
  const [errorStats, setErrorStats] = useState<ErrorStats | null>(null)
  const [engStats, setEngStats] = useState<EngagementStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([
      apiClient.get<ErrorStats>(`/admin/analytics/errors/?days=${days}`),
      apiClient.get<EngagementStats>(`/admin/analytics/engagement/?days=${days}`),
    ])
      .then(([errRes, engRes]) => {
        setErrorStats(errRes.data)
        setEngStats(engRes.data)
      })
      .catch(() => setError('加载失败，请重试'))
      .finally(() => setLoading(false))
  }, [days])

  // Sort funnel entries by our preferred display order
  const funnelEntries = engStats
    ? Object.entries(engStats.funnel).sort(
        ([a], [b]) => (ENTITY_ORDER.indexOf(a) ?? 99) - (ENTITY_ORDER.indexOf(b) ?? 99)
      )
    : []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>监控 & 分析</Title>
        <Space>
          <Text type="secondary">时间范围：</Text>
          <Segmented
            value={days}
            onChange={(v) => setDays(v as number)}
            options={[
              { label: '7天', value: 7 },
              { label: '30天', value: 30 },
              { label: '90天', value: 90 },
            ]}
          />
        </Space>
      </div>

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} />}

      <Spin spinning={loading}>

        {/* ── Section 1: Client Errors ── */}
        <Title level={5} style={{ marginBottom: 12 }}>
          <BugOutlined /> 客户端错误
          <Info text="来自App和Web端上报的错误，包括API失败、JS异常、崩溃等。用于远程排查用户遇到的问题。" />
        </Title>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title={
                  <span>
                    {days}天内错误总数
                    <Info text="所选时间范围内收到的客户端错误上报次数。每次App遇到错误都会自动上报一条。" />
                  </span>
                }
                value={errorStats?.total ?? 0}
                valueStyle={{ color: errorStats && errorStats.total > 0 ? '#cf1322' : '#52c41a' }}
                prefix={<BugOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">按错误类型</Text>
                <Info text="api_error=接口失败 · js_error=前端代码报错 · crash=App崩溃 · upload_fail=上传失败 · auth_fail=登录Token过期" />
              </div>
              {errorStats?.by_type.slice(0, 5).map(r => (
                <Tooltip key={r.error_type} title={ERROR_DESC[r.error_type] ?? r.error_type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, cursor: 'help' }}>
                    <Tag color={ERROR_COLOR[r.error_type] ?? 'default'}>{r.error_type}</Tag>
                    <Text strong>{r.count}</Text>
                  </div>
                </Tooltip>
              )) ?? <Text type="secondary">—</Text>}
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <div style={{ marginBottom: 8 }}>
                <Text type="secondary">按平台</Text>
                <Info text="ios / android = App原生端 · web = 网页端。可用于判断某个错误是否只出现在特定平台。" />
              </div>
              {errorStats?.by_platform.map(r => (
                <div key={r.platform} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Tag icon={<MobileOutlined />} color="blue">{r.platform || '未知'}</Tag>
                  <Text strong>{r.count}</Text>
                </div>
              )) ?? <Text type="secondary">—</Text>}
            </Card>
          </Col>
        </Row>

        {/* Recent errors table */}
        <Card
          title={
            <span>
              最近错误记录
              <Info text="最近50条错误详情。点击「消息」列可查看具体报错内容，结合版本号和平台可快速定位问题。" />
            </span>
          }
          style={{ marginBottom: 32 }}
        >
          <Table
            dataSource={errorStats?.recent ?? []}
            rowKey="id"
            size="small"
            scroll={{ x: 900 }}
            pagination={{ pageSize: 20 }}
            columns={[
              {
                title: '类型',
                dataIndex: 'error_type',
                width: 120,
                render: (v: string) => (
                  <Tooltip title={ERROR_DESC[v] ?? v}>
                    <Tag color={ERROR_COLOR[v] ?? 'default'} style={{ cursor: 'help' }}>{v}</Tag>
                  </Tooltip>
                ),
              },
              {
                title: '消息',
                dataIndex: 'message',
                ellipsis: true,
                render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text>,
              },
              {
                title: (
                  <span>
                    页面/Screen
                    <Info text="发生错误时用户所在的页面URL或App路由名称" />
                  </span>
                ),
                dataIndex: 'url',
                width: 180,
                ellipsis: true,
                render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v || '—'}</Text>,
              },
              {
                title: (
                  <span>
                    版本
                    <Info text="App版本号，来自package.json（Web）或App Store构建号（iOS/Android）" />
                  </span>
                ),
                dataIndex: 'app_version',
                width: 80,
                render: (v: string) => <Tag>{v || '—'}</Tag>,
              },
              {
                title: '平台',
                dataIndex: 'platform',
                width: 80,
                render: (v: string) => <Tag color="blue">{v || '—'}</Tag>,
              },
              {
                title: '用户',
                dataIndex: 'user__email',
                width: 180,
                ellipsis: true,
                render: (v: string | null) => <Text type="secondary" style={{ fontSize: 11 }}>{v ?? '匿名'}</Text>,
              },
              {
                title: '时间',
                dataIndex: 'created_at',
                width: 160,
                render: (v: string) => new Date(v).toLocaleString('zh-CN'),
              },
            ]}
          />
        </Card>

        {/* ── Section 2: Engagement Funnel ── */}
        <Title level={5} style={{ marginBottom: 12 }}>
          <BarChartOutlined /> 用户行为漏斗
          <Info text="追踪用户从看到内容到发生联系的完整路径：曝光→打开详情→点击电话。转化率越高说明内容吸引力越强。" />
        </Title>

        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          {funnelEntries.map(([entityType, events]) => {
            const impressions = events['impression']  ?? 0
            const views       = events['view']        ?? 0
            const phoneClicks = events['phone_click'] ?? 0
            const dwellCount  = events['dwell']       ?? 0
            const avgDwell    = engStats!.avg_dwell_seconds[entityType] ?? 0

            const viewRate  = impressions > 0 ? Math.round((views / impressions) * 100) : 0
            const clickRate = views > 0       ? Math.round((phoneClicks / views) * 100) : 0

            return (
              <Col key={entityType} xs={24} sm={12} lg={8}>
                <Card
                  title={
                    <Space>
                      <AppstoreOutlined />
                      {ENTITY_LABELS[entityType] ?? entityType}
                    </Space>
                  }
                  size="small"
                >
                  <Row gutter={8} style={{ marginBottom: 12 }}>
                    <Col span={8}>
                      <Statistic
                        title={
                          <span>
                            曝光
                            <Info text="卡片在屏幕上可见≥50%且停留≥300ms，计为一次曝光" />
                          </span>
                        }
                        value={impressions}
                        valueStyle={{ fontSize: 16 }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title={
                          <span>
                            详情页
                            <Info text="用户点击卡片进入详情页的次数" />
                          </span>
                        }
                        value={views}
                        valueStyle={{ fontSize: 16 }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title={
                          <span>
                            电话点击
                            <Info text="用户在详情页点击电话号码或复制电话的次数" />
                          </span>
                        }
                        value={phoneClicks}
                        valueStyle={{ fontSize: 16 }}
                      />
                    </Col>
                  </Row>
                  <div style={{ marginBottom: 6 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      曝光→详情
                      <Info text={`${impressions}次曝光中有${views}次进入了详情页，转化率${viewRate}%`} />
                    </Text>
                    <Progress percent={viewRate} size="small" strokeColor="#1677ff" />
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      详情→电话
                      <Info text={`${views}次详情页中有${phoneClicks}次点击了电话，转化率${clickRate}%`} />
                    </Text>
                    <Progress percent={clickRate} size="small" strokeColor="#52c41a" />
                  </div>
                  {dwellCount > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <ClockCircleOutlined style={{ color: '#faad14', marginRight: 4 }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        平均停留 <Text strong>{avgDwell}秒</Text>（{dwellCount}次）
                      </Text>
                      <Info text="用户在详情页停留的平均时间（秒）。停留时间越长说明内容越有吸引力，≥10秒为优质内容。" />
                    </div>
                  )}
                </Card>
              </Col>
            )
          })}

          {funnelEntries.length === 0 && (
            <Col span={24}>
              <Alert type="info" message={`近${days}天暂无行为数据`} />
            </Col>
          )}
        </Row>

        {/* Platform breakdown */}
        {engStats && engStats.by_platform.length > 0 && (
          <Card
            title={
              <span>
                活跃平台分布
                <Info text="所选时间范围内产生行为事件的用户按平台分布，帮助了解主要用户群体使用哪个端" />
              </span>
            }
            style={{ marginBottom: 32 }}
          >
            <Row gutter={16}>
              {engStats.by_platform.map(r => (
                <Col key={r.platform} xs={12} sm={8} md={6}>
                  <Statistic
                    title={r.platform || '未知'}
                    value={r.count}
                    prefix={<MobileOutlined />}
                  />
                </Col>
              ))}
            </Row>
          </Card>
        )}

      </Spin>
    </div>
  )
}
