import { useEffect, useState, useCallback } from 'react'
import {
  Card, Row, Col, Avatar, Tag, Typography, Spin, Button,
  Descriptions, Statistic, Space, Tabs, Alert, Divider, theme,
  Switch, Checkbox, message, Select, Modal, Input, Empty, Image, Popconfirm,
} from 'antd'
import {
  UserOutlined, ArrowLeftOutlined, CalendarOutlined,
  PhoneOutlined, EyeOutlined, HeartOutlined,
  StopOutlined, CheckCircleOutlined,
} from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import type {
  AdminUser, UserOperationStats, ModeratorContentType, Gender,
  AdminContentType, AdminUserContentItem,
} from '../../types'
import { MODERATOR_CONTENT_LABELS } from '../../types'
import { DailyChart } from '../../components/charts/DailyChart'
import { MonthlyChart } from '../../components/charts/MonthlyChart'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const roleColors: Record<string, string> = {
  admin: 'red', moderator: 'orange', merchant: 'blue', user: 'default',
}

const eventLabels: Record<string, string> = {
  search: '搜索',
  view: '浏览',
  phone_click: '电话点击',
  save: '收藏',
  create: '发布',
  ai_rating: 'AI 评分',
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token } = theme.useToken()

  const [user, setUser] = useState<AdminUser | null>(null)
  const [opStats, setOpStats] = useState<UserOperationStats | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingRoles, setSavingRoles] = useState(false)
  const [banModalOpen, setBanModalOpen] = useState(false)
  const [banReason, setBanReason] = useState('')
  const [banSaving, setBanSaving] = useState(false)
  const [contentType, setContentType] = useState<AdminContentType>('forum_post')
  const [contentItems, setContentItems] = useState<AdminUserContentItem[]>([])
  const [contentLoading, setContentLoading] = useState(false)
  const [localRoles, setLocalRoles] = useState<ModeratorContentType[]>([])
  const [localJournalist, setLocalJournalist] = useState(false)
  const [localContentCreator, setLocalContentCreator] = useState(false)
  const [localBot, setLocalBot] = useState(false)
  const [localGender, setLocalGender] = useState<Gender | null>(null)

  const ALL_CONTENT_TYPES = Object.keys(MODERATOR_CONTENT_LABELS) as ModeratorContentType[]

  useEffect(() => {
    if (!id) return
    Promise.all([
      adminApi.getUser(id).then((r) => {
        setUser(r.data)
        setLocalRoles((r.data.moderator_roles ?? []) as ModeratorContentType[])
        setLocalJournalist(r.data.is_journalist ?? false)
        setLocalContentCreator(r.data.is_content_creator ?? false)
        setLocalBot(r.data.is_bot ?? false)
        setLocalGender((r.data.gender ?? null) as Gender | null)
      }),
      adminApi.getUserStats(id).then((r) => setOpStats(r.data)),
    ])
      .catch(() => setError('无法加载用户数据。'))
      .finally(() => { setLoadingUser(false); setLoadingStats(false) })
  }, [id])

  async function saveRoles() {
    if (!id) return
    setSavingRoles(true)
    try {
      const res = await adminApi.updateUser(id, {
        is_journalist: localJournalist,
        is_content_creator: localContentCreator,
        is_bot: localBot,
        gender: localGender,
        moderator_roles: localRoles,
      })
      setUser(res.data)
      message.success('角色已保存')
    } catch {
      message.error('保存失败')
    } finally {
      setSavingRoles(false)
    }
  }

  function toggleModRole(ct: ModeratorContentType) {
    setLocalRoles(prev =>
      prev.includes(ct) ? prev.filter(r => r !== ct) : [...prev, ct]
    )
  }

  async function confirmBan() {
    if (!id) return
    if (!banReason.trim()) {
      message.warning('请填写封禁原因')
      return
    }
    setBanSaving(true)
    try {
      const res = await adminApi.banUser(id, banReason.trim())
      setUser(res.data)
      setBanModalOpen(false)
      setBanReason('')
      message.success('已封禁')
    } catch {
      message.error('操作失败')
    } finally {
      setBanSaving(false)
    }
  }

  async function unban() {
    if (!id) return
    try {
      const res = await adminApi.unbanUser(id)
      setUser(res.data)
      message.success('已解除封禁')
    } catch {
      message.error('操作失败')
    }
  }

  const loadContent = useCallback(async (type: AdminContentType) => {
    if (!id) return
    setContentLoading(true)
    try {
      const res = await adminApi.getUserContent(id, type, { page_size: 50 })
      setContentItems(res.data.results ?? [])
    } catch {
      setContentItems([])
    } finally {
      setContentLoading(false)
    }
  }, [id])

  async function toggleHidden(item: AdminUserContentItem) {
    try {
      await adminApi.setContentHidden(item.type, item.id, item.visible)
      setContentItems(prev =>
        prev.map(p => p.id === item.id ? { ...p, visible: !item.visible } : p)
      )
      message.success(item.visible ? '已下架' : '已恢复')
    } catch {
      message.error('操作失败')
    }
  }

  if (loadingUser) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (error) return <Alert type="error" message={error} showIcon />
  if (!user) return null

  const displayName =
    user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username ?? user.email ?? '用户'

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        type="text"
        onClick={() => navigate('/users')}
        style={{ marginBottom: 16 }}
      >
        返回列表
      </Button>

      <Row gutter={24}>
        {/* ── 用户信息 ──────────────────────────────────────────────── */}
        <Col xs={24} md={8}>
          <Card>
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <Avatar
                size={80}
                src={user.avatar}
                icon={<UserOutlined />}
                style={{ background: token.colorPrimary, marginBottom: 12 }}
              />
              <Title level={5} style={{ margin: 0 }}>{displayName}</Title>
              <Text type="secondary">{user.email ?? '游客'}</Text>
              <div style={{ marginTop: 8 }}>
                <Tag color={roleColors[user.role]}>{user.role}</Tag>
                {user.is_active
                  ? <Tag color="success">正常</Tag>
                  : <Tag color="error">封禁</Tag>}
                {user.is_bot && <Tag color="purple">BOT</Tag>}
              </div>
              {!user.is_active && user.ban_reason && (
                <Alert
                  type="error"
                  showIcon
                  style={{ marginTop: 12, textAlign: 'left' }}
                  message="封禁原因"
                  description={user.ban_reason}
                />
              )}
              <div style={{ marginTop: 12 }}>
                {user.is_active ? (
                  <Button
                    danger
                    size="small"
                    icon={<StopOutlined />}
                    onClick={() => setBanModalOpen(true)}
                  >封禁用户</Button>
                ) : (
                  <Popconfirm title="确定解除封禁?" onConfirm={unban} okText="确定" cancelText="取消">
                    <Button type="primary" size="small" icon={<CheckCircleOutlined />}>
                      解除封禁
                    </Button>
                  </Popconfirm>
                )}
              </div>
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <Descriptions column={1} size="small" labelStyle={{ color: token.colorTextSecondary, width: 110 }}>
              <Descriptions.Item label="国家">{user.country}</Descriptions.Item>
              <Descriptions.Item label="用户名">{user.username ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {dayjs(user.created_at).format('YYYY-MM-DD')}
              </Descriptions.Item>
              <Descriptions.Item label="最后登录">
                {user.last_login ? dayjs(user.last_login).format('YYYY-MM-DD HH:mm') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="员工权限">{user.is_staff ? '是' : '否'}</Descriptions.Item>
            </Descriptions>

            {/* ── 特殊角色管理 ─────────────────────────────────────── */}
            <Divider style={{ margin: '12px 0' }} />
            <Text strong style={{ fontSize: 12, color: token.colorTextSecondary }}>特殊角色</Text>

            {/* 记者 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <Space>
                <span style={{ fontSize: 13 }}>记者</span>
                <Text type="secondary" style={{ fontSize: 11 }}>可发布新闻</Text>
              </Space>
              <Switch
                size="small"
                checked={localJournalist}
                onChange={setLocalJournalist}
              />
            </div>

            {/* 内容创作者 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <Space>
                <span style={{ fontSize: 13 }}>内容创作者</span>
                <Text type="secondary" style={{ fontSize: 11 }}>可上传超过60秒的视频</Text>
              </Space>
              <Switch
                size="small"
                checked={localContentCreator}
                onChange={setLocalContentCreator}
              />
            </div>

            {/* 机器人 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <Space>
                <span style={{ fontSize: 13 }}>机器人 (BOT)</span>
                <Text type="secondary" style={{ fontSize: 11 }}>论坛代发账号</Text>
              </Space>
              <Switch
                size="small"
                checked={localBot}
                onChange={setLocalBot}
              />
            </div>

            {/* 性别 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <Space>
                <span style={{ fontSize: 13 }}>性别</span>
              </Space>
              <Select
                size="small"
                value={localGender ?? ''}
                onChange={(v) => setLocalGender(v ? (v as Gender) : null)}
                style={{ width: 100 }}
                options={[
                  { value: '',       label: '未指定' },
                  { value: 'male',   label: '男' },
                  { value: 'female', label: '女' },
                ]}
              />
            </div>

            {/* 板主版块 */}
            <div style={{ marginTop: 14 }}>
              <Text style={{ fontSize: 13 }}>板主版块</Text>
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {ALL_CONTENT_TYPES.map(ct => (
                  <Checkbox
                    key={ct}
                    checked={localRoles.includes(ct)}
                    onChange={() => toggleModRole(ct)}
                    style={{ fontSize: 12, marginInlineStart: 0 }}
                  >
                    {MODERATOR_CONTENT_LABELS[ct]}
                  </Checkbox>
                ))}
              </div>
            </div>

            <Button
              type="primary"
              size="small"
              loading={savingRoles}
              onClick={saveRoles}
              style={{ marginTop: 14, width: '100%' }}
            >
              保存角色
            </Button>
          </Card>
        </Col>

        {/* ── 统计 & 图表 ──────────────────────────────────────────── */}
        <Col xs={24} md={16}>
          {/* KPI */}
          <Row gutter={12} style={{ marginBottom: 16 }}>
            {[
              { label: '总操作数', value: opStats?.total_events ?? 0, icon: <CalendarOutlined /> },
              { label: '浏览次数', value: opStats?.breakdown?.view ?? 0, icon: <EyeOutlined /> },
              { label: '电话点击', value: opStats?.breakdown?.phone_click ?? 0, icon: <PhoneOutlined /> },
              { label: '收藏数', value: opStats?.breakdown?.save ?? 0, icon: <HeartOutlined /> },
            ].map((s) => (
              <Col key={s.label} xs={12} sm={6}>
                <Card size="small" styles={{ body: { padding: '12px 14px' } }}>
                  <Statistic
                    title={<Text type="secondary" style={{ fontSize: 11 }}>{s.label}</Text>}
                    value={s.value}
                    prefix={s.icon}
                    valueStyle={{ fontSize: 20 }}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {/* 操作类型分布 */}
          {opStats?.breakdown && (
            <Card size="small" style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 12 }}>操作类型分布</Text>
              <Row gutter={8} style={{ marginTop: 8 }}>
                {Object.entries(opStats.breakdown).map(([k, v]) => (
                  <Col key={k} xs={8} sm={4}>
                    <div style={{ textAlign: 'center', padding: '4px 0' }}>
                      <div style={{ fontSize: 18, fontWeight: 600 }}>{v}</div>
                      <Text type="secondary" style={{ fontSize: 10 }}>{eventLabels[k] ?? k}</Text>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          )}

          {/* 图表 */}
          <Card styles={{ body: { padding: 16 } }}>
            {loadingStats ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : (
              <Tabs
                onChange={(k) => { if (k === 'content') loadContent(contentType) }}
                items={[
                  {
                    key: 'daily',
                    label: '近30天',
                    children: (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                          每日操作趋势
                        </Text>
                        <DailyChart
                          data={opStats?.daily ?? []}
                          label="操作数"
                          height={220}
                        />
                      </div>
                    ),
                  },
                  {
                    key: 'monthly',
                    label: '近12个月',
                    children: (
                      <div>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                          每月操作趋势
                        </Text>
                        <MonthlyChart
                          data={opStats?.monthly ?? []}
                          label="操作数"
                          height={220}
                        />
                      </div>
                    ),
                  },
                  {
                    key: 'content',
                    label: '他的发布',
                    children: (
                      <div>
                        <Space style={{ marginBottom: 12 }}>
                          <Select
                            size="small"
                            value={contentType}
                            style={{ width: 160 }}
                            onChange={(v) => { setContentType(v); loadContent(v) }}
                            options={[
                              { value: 'forum_post',    label: '论坛帖子' },
                              { value: 'forum_video',   label: '视频' },
                              { value: 'news',          label: '新闻' },
                              { value: 'job_post',      label: '招聘' },
                              { value: 'job_seek',      label: '求职' },
                              { value: 'market',        label: '买卖' },
                              { value: 'housing',       label: '房源' },
                              { value: 'local_service', label: '本地服务' },
                              { value: 'listing',       label: '商家' },
                            ]}
                          />
                          <Button size="small" onClick={() => loadContent(contentType)}>刷新</Button>
                        </Space>
                        {contentLoading ? (
                          <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
                        ) : contentItems.length === 0 ? (
                          <Empty description="暂无内容" />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {contentItems.map(item => (
                              <div
                                key={item.id}
                                style={{
                                  display: 'flex', alignItems: 'center', gap: 12,
                                  padding: 8, border: `1px solid ${token.colorBorderSecondary}`,
                                  borderRadius: 6, opacity: item.visible ? 1 : 0.55,
                                }}
                              >
                                {item.cover ? (
                                  <Image
                                    src={item.cover}
                                    width={56}
                                    height={56}
                                    style={{ objectFit: 'cover', borderRadius: 4 }}
                                    preview={false}
                                  />
                                ) : (
                                  <div style={{
                                    width: 56, height: 56, borderRadius: 4,
                                    background: token.colorFillTertiary,
                                  }} />
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.title || '(无标题)'}
                                  </div>
                                  <Space size={6} style={{ marginTop: 4 }}>
                                    <Text type="secondary" style={{ fontSize: 11 }}>
                                      {item.created_at ? dayjs(item.created_at).format('YYYY-MM-DD') : '—'}
                                    </Text>
                                    {!item.visible && <Tag color="default">已下架</Tag>}
                                    {item.status === 'rejected' && <Tag color="red">驳回</Tag>}
                                  </Space>
                                </div>
                                <Popconfirm
                                  title={item.visible ? '确定下架?' : '确定恢复?'}
                                  onConfirm={() => toggleHidden(item)}
                                  okText="确定" cancelText="取消"
                                >
                                  <Button danger={item.visible} size="small">
                                    {item.visible ? '下架' : '恢复'}
                                  </Button>
                                </Popconfirm>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        open={banModalOpen}
        title="封禁用户"
        okText="确认封禁"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: banSaving }}
        onOk={confirmBan}
        onCancel={() => { setBanModalOpen(false); setBanReason('') }}
      >
        <Alert
          type="warning"
          showIcon
          message="封禁后该用户的所有公开内容将立即对所有人隐藏。用户登录后会看到此原因，可提交申诉。"
          style={{ marginBottom: 12 }}
        />
        <Input.TextArea
          rows={4}
          maxLength={500}
          showCount
          placeholder="请填写封禁原因，将展示给该用户"
          value={banReason}
          onChange={(e) => setBanReason(e.target.value)}
        />
      </Modal>
    </div>
  )
}
