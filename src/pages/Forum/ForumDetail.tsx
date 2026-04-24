import { useEffect, useState } from 'react'
import {
  Card, Row, Col, Typography, Spin, Button, Statistic,
  Tag, Tabs, Alert, Space, Descriptions, Image, Popconfirm,
  message, theme,
} from 'antd'
import {
  ArrowLeftOutlined, EyeOutlined, HeartOutlined, MessageOutlined,
  StarOutlined, FundOutlined, CheckOutlined, CloseOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import type { ForumPostStats } from '../../types'
import { DailyChart } from '../../components/charts/DailyChart'
import { MonthlyChart } from '../../components/charts/MonthlyChart'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

const statusColors: Record<string, string> = {
  pending: 'orange', approved: 'green', rejected: 'red',
}
const statusLabels: Record<string, string> = {
  pending: '待审核', approved: '已通过', rejected: '已拒绝',
}

export function ForumDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const [stats, setStats] = useState<ForumPostStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = () => {
    if (!id) return
    setLoading(true)
    adminApi.getForumPostStats(id)
      .then((r) => setStats(r.data))
      .catch(() => setError('无法加载此内容的统计数据。'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const handleApprove = async () => {
    if (!id) return
    try {
      await adminApi.approveForumPost(id)
      message.success('已通过')
      load()
    } catch { message.error('操作失败') }
  }

  const handleReject = async () => {
    if (!id) return
    try {
      await adminApi.rejectForumPost(id)
      message.success('已拒绝')
      load()
    } catch { message.error('操作失败') }
  }

  const goBack = () => {
    if (stats?.type === 'forum_video') navigate('/forum/videos')
    else navigate('/forum/posts')
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (error) return <Alert type="error" message={error} showIcon />
  if (!stats) return null

  const d = stats.details
  const isVideo = stats.type === 'forum_video'

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
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          {stats.cover_image && (
            <div style={{ position: 'relative' }}>
              <img
                src={stats.cover_image}
                alt=""
                style={{ width: 140, height: 140, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
              />
              {isVideo && (
                <PlayCircleOutlined style={{
                  position: 'absolute', top: '50%', left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#fff', fontSize: 36,
                  textShadow: '0 0 6px rgba(0,0,0,0.6)',
                }} />
              )}
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Space>
              <Tag color={isVideo ? 'purple' : 'blue'}>{isVideo ? '视频' : '帖子'}</Tag>
              <Tag color={statusColors[stats.status]}>{statusLabels[stats.status] ?? stats.status}</Tag>
              {d.is_sponsored && <Tag color="gold">已推广</Tag>}
              {d.is_anonymous && <Tag>匿名发布</Tag>}
              {!d.is_active && <Tag color="default">已下架</Tag>}
            </Space>
            <Title level={4} style={{ margin: '8px 0 0' }}>{stats.title}</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              发布于 {dayjs(stats.created_at).format('YYYY-MM-DD HH:mm')}
              {d.author && <> · {d.author.username || d.author.email}</>}
            </Text>
          </div>
          {stats.status === 'pending' && (
            <Space>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleApprove}>通过</Button>
              <Popconfirm
                title="确定拒绝此内容？"
                onConfirm={handleReject}
                okText="确定" cancelText="取消"
              >
                <Button danger icon={<CloseOutlined />}>拒绝</Button>
              </Popconfirm>
            </Space>
          )}
        </div>
      </Card>

      {/* 详细信息 */}
      <Card title="详细信息" style={{ marginBottom: 16 }}>
        {d.body && (
          <div style={{ marginBottom: 20 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>正文</Text>
            <Paragraph style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{d.body}</Paragraph>
          </div>
        )}

        {d.video_url && (
          <div style={{ marginBottom: 20 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>视频</Text>
            <video
              src={d.video_url}
              controls
              style={{ maxWidth: '100%', maxHeight: 480, borderRadius: 6, background: '#000' }}
            />
          </div>
        )}

        <Row gutter={[24, 16]}>
          <Col xs={24} md={12}>
            <Descriptions title="内容信息" column={1} size="small">
              <Descriptions.Item label="分类">{d.category_display}</Descriptions.Item>
              <Descriptions.Item label="类型">
                {d.post_type === 'video' ? '视频' : d.post_type === 'photo' ? '图文' : '文字'}
              </Descriptions.Item>
              {d.tags.length > 0 && (
                <Descriptions.Item label="标签">
                  <Space wrap size={4}>
                    {d.tags.map((t) => <Tag key={t}>{t}</Tag>)}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </Col>

          <Col xs={24} md={12}>
            <Descriptions title="位置信息" column={1} size="small">
              <Descriptions.Item label="国家">{d.country}</Descriptions.Item>
              {d.city && <Descriptions.Item label="城市">{d.city}</Descriptions.Item>}
              {d.latitude != null && d.longitude != null && (
                <Descriptions.Item label="坐标">{d.latitude}, {d.longitude}</Descriptions.Item>
              )}
            </Descriptions>
          </Col>

          {d.linked_listing && (
            <Col xs={24} md={12}>
              <Descriptions title="关联商家" column={1} size="small">
                <Descriptions.Item label="商家">
                  <a onClick={() => navigate(`/publications/listing/${d.linked_listing!.id}`)}>
                    {d.linked_listing.name}
                  </a>
                </Descriptions.Item>
              </Descriptions>
            </Col>
          )}
        </Row>

        {d.images.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
              图片 ({d.images.length})
            </Text>
            <Image.PreviewGroup>
              <Space wrap>
                {d.images.map((url, idx) => (
                  <Image
                    key={idx}
                    src={url}
                    width={100}
                    height={100}
                    style={{ objectFit: 'cover', borderRadius: 6 }}
                  />
                ))}
              </Space>
            </Image.PreviewGroup>
          </div>
        )}

        {d.rejection_reason && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <Text type="danger">拒绝原因：{d.rejection_reason}</Text>
          </div>
        )}
      </Card>

      {/* KPI */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {[
          { label: '卡片曝光', value: stats.total_impressions, icon: <FundOutlined />, color: token.colorSuccess },
          { label: '浏览量', value: d.view_count, icon: <EyeOutlined />, color: token.colorPrimary },
          { label: '点赞', value: d.like_count, icon: <HeartOutlined />, color: token.colorError },
          { label: '评论', value: d.comment_count, icon: <MessageOutlined />, color: token.colorInfo },
          { label: '收藏', value: d.saved_count, icon: <StarOutlined />, color: token.colorWarning },
        ].map((s) => (
          <Col key={s.label} xs={12} sm={8} md={4}>
            <Card size="small" styles={{ body: { padding: '14px 18px' } }}>
              <Statistic
                title={<Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text>}
                value={s.value}
                prefix={s.icon}
                valueStyle={{ fontSize: 20, color: s.color }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 图表 */}
      <Card styles={{ body: { padding: 16 } }}>
        <Tabs
          items={[
            {
              key: 'daily', label: '近30天趋势',
              children: (
                <DailyChart
                  data={stats.daily}
                  label="浏览量"
                  color={token.colorPrimary}
                  height={240}
                />
              ),
            },
            {
              key: 'monthly', label: '近12个月趋势',
              children: (
                <MonthlyChart
                  data={stats.monthly}
                  label="浏览量"
                  color={token.colorPrimary}
                  height={240}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
