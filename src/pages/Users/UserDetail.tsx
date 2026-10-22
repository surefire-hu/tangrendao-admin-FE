import { useEffect, useState, useCallback } from 'react'
import {
  Card, Row, Col, Avatar, Badge, Tag, Typography, Spin, Button,
  Descriptions, Space, Tabs, Alert, Divider, theme,
  Switch, Checkbox, message, Select, Modal, Input, Empty, Image, Popconfirm, Tooltip,
} from 'antd'
import {
  UserOutlined, ArrowLeftOutlined,
  StopOutlined, CheckCircleOutlined, QuestionCircleOutlined,
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
import { formatDuration } from '../../utils/duration'

const { Title, Text } = Typography

const roleColors: Record<string, string> = {
  admin: 'red', moderator: 'orange', merchant: 'blue', user: 'default',
}

// Every action UserEvent records, in display order: Chinese name + what it
// counts (shown on hover of the ?). Unknown future types still show, by key.
const EVENT_INFO: { key: string; label: string; help: string }[] = [
  { key: 'impression', label: '曝光', help: '内容卡片（商家、招聘、房屋、帖子等）在列表里出现在屏幕上超过 0.3 秒的次数，没有点开也算。' },
  { key: 'view', label: '浏览', help: '打开内容详情页的次数。' },
  { key: 'dwell', label: '平均停留', help: '每次打开详情页（商家、招聘、房屋、帖子等）平均停留多久。只算停留 3 秒以上的浏览，每次最多按 30 分钟计（防止手机一直开着同一页）。' },
  { key: 'search', label: '搜索', help: '在 App 里搜索的次数。' },
  { key: 'phone_click', label: '拨打电话', help: '在详情页点「打电话」联系商家或发布者的次数。' },
  { key: 'save', label: '收藏', help: '收藏内容的次数。' },
  { key: 'unsave', label: '取消收藏', help: '取消收藏的次数。' },
  { key: 'create', label: '发布', help: '发布帖子、招聘、求职、房屋、二手等内容的次数。' },
  { key: 'ai_message', label: 'AI 对话', help: '给 AI 助手发送消息的次数。' },
  { key: 'ai_rating', label: 'AI 评价', help: '对 AI 的回答点赞或点踩的次数。' },
]

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { token } = theme.useToken()

  const [user, setUser] = useState<AdminUser | null>(null)
  const [savingStaff, setSavingStaff] = useState(false)
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
  const [localXindongTester, setLocalXindongTester] = useState(false)
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
        setLocalXindongTester(r.data.is_xindong_tester ?? false)
        setLocalBot(r.data.is_bot ?? false)
        setLocalGender((r.data.gender ?? null) as Gender | null)
      }),
      adminApi.getUserStats(id).then((r) => setOpStats(r.data)),
    ])
      .catch(() => setError('无法加载用户数据。'))
      .finally(() => { setLoadingUser(false); setLoadingStats(false) })
  }, [id])

  async function toggleStaff() {
    if (!id || !user) return
    setSavingStaff(true)
    try {
      setUser((await adminApi.updateUser(id, { is_staff: !user.is_staff })).data)
      message.success(user.is_staff ? '已取消员工权限' : '已设为员工，可以登录后台')
    } catch {
      message.error('保存失败')
    } finally {
      setSavingStaff(false)
    }
  }

  async function saveRoles() {
    if (!id) return
    setSavingRoles(true)
    try {
      const res = await adminApi.updateUser(id, {
        is_journalist: localJournalist,
        is_content_creator: localContentCreator,
        is_xindong_tester: localXindongTester,
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
              <Badge dot status={user.is_online ? 'success' : 'default'} offset={[-8, 72]}>
                <Avatar
                  size={80}
                  src={user.avatar}
                  icon={<UserOutlined />}
                  style={{ background: token.colorPrimary, marginBottom: 12 }}
                />
              </Badge>
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
              <Descriptions.Item label="在线状态">
                {user.is_online
                  ? <Tag color="success">在线</Tag>
                  : (
                    <Text type="secondary">
                      离线{user.last_active_at ? ` · ${dayjs(user.last_active_at).format('YYYY-MM-DD HH:mm')}` : ''}
                    </Text>
                  )}
              </Descriptions.Item>
              <Descriptions.Item label="员工权限">
                {/* Staff = can log in to this admin (and sees 内测 小程序 in the app). */}
                <Popconfirm
                  title={user.is_staff ? '取消员工权限？' : '设为员工？'}
                  description={user.is_staff ? '取消后将无法登录后台' : '设为员工后可以登录后台，并能看到内测中的小程序'}
                  onConfirm={toggleStaff}
                  okText="确定" cancelText="取消"
                >
                  <Switch size="small" checked={user.is_staff} loading={savingStaff} checkedChildren="是" unCheckedChildren="否" />
                </Popconfirm>
              </Descriptions.Item>
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

            {/* 心动信号测试员 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
              <Space>
                <span style={{ fontSize: 13 }}>心动信号测试员</span>
                <Text type="secondary" style={{ fontSize: 11 }}>即使功能未全局开放，也可试用</Text>
              </Space>
              <Switch
                size="small"
                checked={localXindongTester}
                onChange={setLocalXindongTester}
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
          {/* 操作统计: total first, then every action type (Chinese name, ? explains it) */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={[8, 12]}>
              <Col xs={8} sm={6} md={4}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{opStats?.total_events ?? 0}</div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    总操作数{' '}
                    <Tooltip title="下面所有类型的操作加起来的总数。">
                      <QuestionCircleOutlined style={{ cursor: 'help' }} />
                    </Tooltip>
                  </Text>
                </div>
              </Col>
              {[
                ...EVENT_INFO,
                ...Object.keys(opStats?.breakdown ?? {})
                  .filter(k => !EVENT_INFO.some(e => e.key === k))
                  .map(k => ({ key: k, label: k, help: '其他类型的操作。' })),
              ].map(e => (
                <Col key={e.key} xs={8} sm={6} md={4}>
                  <div style={{ textAlign: 'center' }}>
                    {e.key === 'dwell' ? (
                      <div style={{ fontSize: 20, fontWeight: 600 }}>{formatDuration(opStats?.dwell?.avg_seconds)}</div>
                    ) : (
                      <div style={{ fontSize: 20, fontWeight: 600 }}>{opStats?.breakdown?.[e.key] ?? 0}</div>
                    )}
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {e.label}{' '}
                      <Tooltip title={e.help}>
                        <QuestionCircleOutlined style={{ cursor: 'help' }} />
                      </Tooltip>
                    </Text>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>

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
