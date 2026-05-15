import { useCallback, useEffect, useState } from 'react'
import {
  Tabs, Card, Table, Tag, Typography, Space, Button, Modal, Form, InputNumber,
  Input, Switch, Select, message, Popconfirm, Avatar, Tooltip, Divider,
  Drawer, Descriptions, Statistic, Row, Col, Empty, Rate, Spin,
} from 'antd'
import { ReloadOutlined, UserOutlined, SearchOutlined, MessageOutlined, FilePdfOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import {
  specialistsApi,
  type ServiceCategory,
  type SpecialistCategoryCode,
  type SpecialistPublic,
  type ServiceRequest,
  type ServiceRequestStatus,
} from '../../api/specialists'
import { adminApi } from '../../api/admin'
import type { AdminUser } from '../../types'

dayjs.extend(relativeTime)

const { Title, Text } = Typography

const CATEGORY_OPTIONS: { value: SpecialistCategoryCode; label: string }[] = [
  { value: 'accounting',  label: '会计服务' },
  { value: 'lawyer',      label: '律师服务' },
  { value: 'immigration', label: '移民服务' },
  { value: 'consultant',  label: '公司顾问' },
  { value: 'doctor',      label: '医生服务' },
]

const STATUS_LABEL: Record<ServiceRequestStatus, { color: string; text: string }> = {
  searching: { color: 'processing', text: '匹配中' },
  matched:   { color: 'cyan',       text: '已匹配' },
  confirmed: { color: 'blue',       text: '咨询中' },
  completed: { color: 'green',      text: '已完成' },
  cancelled: { color: 'default',    text: '已取消' },
}


// ── Categories tab ─────────────────────────────────────────────────────────────

function CategoriesTab() {
  const [rows, setRows]     = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<ServiceCategory | null>(null)
  const [form] = Form.useForm<Pick<ServiceCategory, 'price_candy' | 'name_zh' | 'icon' | 'description' | 'is_active' | 'display_order'>>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await specialistsApi.listCategories()
      setRows(res.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openEdit = (row: ServiceCategory) => {
    setEditing(row)
    form.setFieldsValue({
      price_candy:   row.price_candy,
      name_zh:       row.name_zh,
      icon:          row.icon,
      description:   row.description,
      is_active:     row.is_active,
      display_order: row.display_order,
    })
  }

  const submit = async () => {
    if (!editing) return
    try {
      const values = await form.validateFields()
      await specialistsApi.updateCategory(editing.code, values)
      message.success('已保存')
      setEditing(null)
      await load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      if (err?.response?.data?.detail) message.error(err.response.data.detail)
    }
  }

  const columns: ColumnsType<ServiceCategory> = [
    { title: '排序', dataIndex: 'display_order', width: 70 },
    { title: '图标', dataIndex: 'icon', width: 70, render: (v: string) => <span style={{ fontSize: 20 }}>{v || '—'}</span> },
    { title: '代码', dataIndex: 'code', width: 120, render: (v: string) => <Tag>{v}</Tag> },
    { title: '名称', dataIndex: 'name_zh', width: 130 },
    {
      title: '价格', dataIndex: 'price_candy', width: 110,
      render: (v: number) => <Tag color="gold">{v} 糖果</Tag>,
    },
    {
      title: '说明', dataIndex: 'description', ellipsis: true,
      render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v || '—'}</Text>,
    },
    {
      title: '状态', dataIndex: 'is_active', width: 80,
      render: (v: boolean) => v ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>,
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_, r) => <Button size="small" onClick={() => openEdit(r)}>编辑</Button>,
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card size="small">
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Text type="secondary">共 5 个固定分类，可调整价格、名称、说明、启用/停用</Text>
        </Space>
      </Card>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="code"
          columns={columns}
          dataSource={rows}
          loading={loading}
          size="small"
          pagination={false}
        />
      </Card>

      <Modal
        open={!!editing}
        title={editing ? `编辑 ${editing.name_zh}` : ''}
        okText="保存" cancelText="取消"
        onOk={submit} onCancel={() => setEditing(null)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name_zh" label="名称" rules={[{ required: true, max: 40 }]}>
            <Input maxLength={40} />
          </Form.Item>
          <Form.Item name="icon" label="图标 (emoji)">
            <Input maxLength={4} placeholder="图标" />
          </Form.Item>
          <Form.Item name="price_candy" label="价格 (糖果)" rules={[{ required: true, type: 'number', min: 0 }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="display_order" label="排序" rules={[{ type: 'number', min: 0 }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}


// ── Specialists tab ────────────────────────────────────────────────────────────

function SpecialistsTab() {
  const [rows, setRows]       = useState<SpecialistPublic[]>([])
  const [loading, setLoading] = useState(false)
  const [filterCat, setFilterCat] = useState<SpecialistCategoryCode | undefined>(undefined)
  const [showOnly, setShowOnly]   = useState(false)
  const [promoteOpen, setPromoteOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [form] = Form.useForm<{ user_id: string; category: SpecialistCategoryCode; bio?: string; years_exp?: number; city?: string }>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await specialistsApi.listSpecialists({
        category:  filterCat,
        is_online: showOnly || undefined,
      })
      setRows(res.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [filterCat, showOnly])

  useEffect(() => { load() }, [load])

  const handleUserSearch = async (q: string) => {
    if (!q.trim()) { setUsers([]); return }
    setSearching(true)
    try {
      const res = await adminApi.getUsers({ search: q.trim(), page_size: 10 })
      setUsers(res.data.results)
    } catch {
      message.error('搜索失败')
    } finally {
      setSearching(false)
    }
  }

  const submitPromote = async () => {
    try {
      const values = await form.validateFields()
      await specialistsApi.promoteUser(values)
      message.success('已设为专家')
      form.resetFields()
      setPromoteOpen(false)
      await load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      if (err?.response?.data?.detail) message.error(err.response.data.detail)
    }
  }

  const revoke = async (userId: string) => {
    try {
      await specialistsApi.revokeSpecialist(userId)
      message.success('已撤销专家身份')
      await load()
    } catch {
      message.error('操作失败')
    }
  }

  const columns: ColumnsType<SpecialistPublic> = [
    {
      title: '专家', key: 'user', width: 220,
      render: (_, r) => (
        <Space>
          <Avatar src={r.avatar_url || undefined} icon={<UserOutlined />} />
          <Space direction="vertical" size={0}>
            <Text strong>{r.full_name || r.username || '—'}</Text>
            <Text type="secondary" style={{ fontSize: 11 }}>ID: {r.id.slice(0, 8)}…</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: '分类', dataIndex: 'category', width: 110,
      render: (v: SpecialistCategoryCode | null) =>
        v ? <Tag color="blue">{CATEGORY_OPTIONS.find(o => o.value === v)?.label ?? v}</Tag> : '—',
    },
    { title: '城市', dataIndex: 'city', width: 100 },
    { title: '经验', dataIndex: 'years_exp', width: 80, render: (v: number | null) => v ? `${v} 年` : '—' },
    {
      title: '评分', dataIndex: 'rating', width: 90,
      render: (v: string | number) => <Tag color="gold">⭐ {v}</Tag>,
    },
    { title: '接单数', dataIndex: 'total_orders', width: 90 },
    {
      title: '在线', dataIndex: 'is_online', width: 80,
      render: (v: boolean) => v ? <Tag color="green">在线</Tag> : <Tag>离线</Tag>,
    },
    {
      title: '操作', key: 'action', width: 180,
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => setDetailUserId(r.id)}>详情</Button>
          <Popconfirm title="确定撤销该专家身份？" okText="撤销" cancelText="取消" okButtonProps={{ danger: true }}
            onConfirm={() => revoke(r.id)}>
            <Button size="small" danger>撤销</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const [detailUserId, setDetailUserId] = useState<string | null>(null)

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card size="small">
        <Space wrap>
          <Select
            allowClear placeholder="全部分类"
            style={{ width: 160 }}
            value={filterCat}
            options={CATEGORY_OPTIONS}
            onChange={(v) => setFilterCat(v as SpecialistCategoryCode | undefined)}
          />
          <Space>
            <Text>仅在线</Text>
            <Switch checked={showOnly} onChange={setShowOnly} />
          </Space>
          <Button type="primary" onClick={() => setPromoteOpen(true)}>+ 设为专家</Button>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        </Space>
      </Card>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          size="small"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        open={promoteOpen}
        title="设为专家"
        okText="确认" cancelText="取消"
        onOk={submitPromote} onCancel={() => setPromoteOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="user_id" label="用户" rules={[{ required: true }]}>
            <Select
              showSearch
              filterOption={false}
              placeholder="搜索邮箱或用户名..."
              onSearch={handleUserSearch}
              notFoundContent={searching ? '搜索中...' : '请输入关键字'}
              suffixIcon={<SearchOutlined />}
              options={users.map((u) => ({
                value: u.id,
                label: <span>{u.email ?? u.username} <Text type="secondary" style={{ fontSize: 11 }}>({u.id.slice(0, 8)}…)</Text></span>,
              }))}
            />
          </Form.Item>
          <Form.Item name="category" label="分类" rules={[{ required: true }]}>
            <Select options={CATEGORY_OPTIONS} />
          </Form.Item>
          <Form.Item name="city" label="所在城市">
            <Input maxLength={100} placeholder="Milano" />
          </Form.Item>
          <Form.Item name="years_exp" label="从业年数">
            <InputNumber min={0} max={80} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="bio" label="简介">
            <Input.TextArea rows={3} maxLength={2000} />
          </Form.Item>
        </Form>
      </Modal>

      <SpecialistDetailDrawer
        userId={detailUserId}
        onClose={() => setDetailUserId(null)}
      />
    </Space>
  )
}


// ── Specialist detail drawer ──────────────────────────────────────────────────

function SpecialistDetailDrawer({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof specialistsApi.getSpecialistDetail>>['data'] | null>(null)
  const [reviews, setReviews] = useState<Awaited<ReturnType<typeof specialistsApi.getSpecialistReviews>>['data']>([])
  const [chatRequestId, setChatRequestId] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) { setDetail(null); setReviews([]); return }
    let cancelled = false
    setLoading(true)
    Promise.all([
      specialistsApi.getSpecialistDetail(userId),
      specialistsApi.getSpecialistReviews(userId),
    ]).then(([d, r]) => {
      if (cancelled) return
      setDetail(d.data)
      setReviews(r.data)
    }).catch(() => {
      if (!cancelled) message.error('加载失败')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [userId])

  const reqColumns: ColumnsType<ServiceRequest> = [
    {
      title: 'ID', dataIndex: 'id', width: 100,
      render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v.slice(0, 8)}…</Text>,
    },
    {
      title: '分类', dataIndex: 'category', width: 110,
      render: (c: ServiceCategory) => <Tag color="blue">{c.name_zh}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: ServiceRequestStatus) => <Tag color={STATUS_LABEL[v].color}>{STATUS_LABEL[v].text}</Tag>,
    },
    {
      title: '糖果', dataIndex: 'candy_spent', width: 80,
      render: (v: number) => <Tag color="gold">{v} 糖果</Tag>,
    },
    {
      title: '评分', dataIndex: 'rating', width: 80,
      render: (v: number | null) => v ? <Tag color="gold">⭐ {v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: '创建', dataIndex: 'created_at', width: 130,
      render: (v: string) => (
        <Tooltip title={dayjs(v).format('YYYY-MM-DD HH:mm:ss')}>
          <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(v).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: '操作', key: 'action', width: 90,
      render: (_, r) => (
        <Button size="small" icon={<MessageOutlined />} onClick={() => setChatRequestId(r.id)}>聊天</Button>
      ),
    },
  ]

  return (
    <Drawer
      open={!!userId}
      title={detail?.profile.full_name || detail?.profile.username || '专家详情'}
      onClose={onClose}
      width={Math.min(960, typeof window !== 'undefined' ? window.innerWidth - 80 : 960)}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
      ) : !detail ? (
        <Empty />
      ) : (
        <Tabs
          defaultActiveKey="stats"
          items={[
            {
              key: 'stats',
              label: '统计',
              children: (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  <Row gutter={[16, 16]}>
                    <Col xs={12} md={6}><Card size="small"><Statistic title="总咨询" value={detail.stats.total} /></Card></Col>
                    <Col xs={12} md={6}><Card size="small"><Statistic title="已完成" value={detail.stats.completed} valueStyle={{ color: '#52c41a' }} /></Card></Col>
                    <Col xs={12} md={6}><Card size="small"><Statistic title="已取消" value={detail.stats.cancelled} valueStyle={{ color: '#999' }} /></Card></Col>
                    <Col xs={12} md={6}><Card size="small"><Statistic title="完成率" value={detail.stats.completion_rate} suffix="%" /></Card></Col>
                    <Col xs={12} md={6}><Card size="small"><Statistic title="平均评分" value={detail.stats.avg_rating ?? '—'} prefix="⭐" /></Card></Col>
                    <Col xs={12} md={6}><Card size="small"><Statistic title="评价数" value={detail.stats.rated_count} /></Card></Col>
                    <Col xs={12} md={6}><Card size="small"><Statistic title="糖果收入" value={detail.stats.candy_revenue} suffix="糖果" /></Card></Col>
                    <Col xs={12} md={6}><Card size="small"><Statistic title="进行中" value={detail.stats.confirmed} valueStyle={{ color: '#1890ff' }} /></Card></Col>
                  </Row>

                  <Card size="small" title="资料">
                    <Descriptions column={2} size="small">
                      <Descriptions.Item label="分类">{detail.profile.category}</Descriptions.Item>
                      <Descriptions.Item label="城市">{detail.profile.city || '—'}</Descriptions.Item>
                      <Descriptions.Item label="经验">{detail.profile.years_exp ? `${detail.profile.years_exp} 年` : '—'}</Descriptions.Item>
                      <Descriptions.Item label="在线">{detail.profile.is_online ? '在线' : '离线'}</Descriptions.Item>
                      <Descriptions.Item label="简介" span={2}>{detail.profile.bio || '—'}</Descriptions.Item>
                    </Descriptions>
                  </Card>

                  <Card size="small" title={`最近咨询 (${detail.recent_requests.length})`} styles={{ body: { padding: 0 } }}>
                    <Table
                      rowKey="id"
                      columns={reqColumns}
                      dataSource={detail.recent_requests}
                      size="small"
                      pagination={{ pageSize: 10 }}
                    />
                  </Card>
                </Space>
              ),
            },
            {
              key: 'reviews',
              label: `评价 (${reviews.length})`,
              children: reviews.length === 0
                ? <Empty description="暂无评价" />
                : (
                  <Space direction="vertical" size={12} style={{ width: '100%' }}>
                    {reviews.map(rv => (
                      <Card key={rv.request_id} size="small">
                        <Space direction="vertical" size={6} style={{ width: '100%' }}>
                          <Space>
                            <Rate disabled value={rv.rating} />
                            <Tag color="blue">{rv.category.name_zh}</Tag>
                            <Tooltip title={dayjs(rv.completed_at || rv.created_at).format('YYYY-MM-DD HH:mm')}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {dayjs(rv.completed_at || rv.created_at).fromNow()}
                              </Text>
                            </Tooltip>
                          </Space>
                          <Text>{rv.comment || <Text type="secondary">（未留言）</Text>}</Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            评价人: {rv.user.full_name || rv.user.username || rv.user.email}
                          </Text>
                          <Button size="small" icon={<MessageOutlined />}
                            onClick={() => setChatRequestId(rv.request_id)}>查看聊天</Button>
                        </Space>
                      </Card>
                    ))}
                  </Space>
                ),
            },
          ]}
        />
      )}

      <RequestChatDrawer requestId={chatRequestId} onClose={() => setChatRequestId(null)} />
    </Drawer>
  )
}


// ── Request chat drawer (admin read-only) ────────────────────────────────────

function RequestChatDrawer({ requestId, onClose }: { requestId: string | null; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Awaited<ReturnType<typeof specialistsApi.getRequestMessages>>['data'] | null>(null)

  useEffect(() => {
    if (!requestId) { setData(null); return }
    let cancelled = false
    setLoading(true)
    specialistsApi.getRequestMessages(requestId).then(r => {
      if (!cancelled) setData(r.data)
    }).catch(() => {
      if (!cancelled) message.error('加载失败')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [requestId])

  return (
    <Drawer
      open={!!requestId}
      title="聊天记录"
      onClose={onClose}
      width={Math.min(560, typeof window !== 'undefined' ? window.innerWidth - 60 : 560)}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
      ) : !data ? (
        <Empty />
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card size="small">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="状态"><Tag color={STATUS_LABEL[data.request.status].color}>{STATUS_LABEL[data.request.status].text}</Tag></Descriptions.Item>
              <Descriptions.Item label="分类">{data.request.category.name_zh}</Descriptions.Item>
              <Descriptions.Item label="糖果">{data.request.candy_spent} 糖果 {data.request.refunded ? <Tag color="green">已退</Tag> : null}</Descriptions.Item>
              <Descriptions.Item label="评分">{data.request.rating ? `⭐ ${data.request.rating}` : '—'}</Descriptions.Item>
            </Descriptions>
          </Card>

          {data.messages.length === 0
            ? <Empty description="暂无消息" />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.messages.map(m => (
                  <div key={m.id} style={{
                    alignSelf: m.sender_kind === 'system' ? 'center' : (m.sender_kind === 'user' ? 'flex-end' : 'flex-start'),
                    maxWidth: '80%',
                  }}>
                    <div style={{ fontSize: 10, color: '#999', marginBottom: 2, textAlign: m.sender_kind === 'user' ? 'right' : 'left' }}>
                      {m.sender_kind === 'system' ? '系统' : m.sender_kind === 'user' ? '用户' : '专家'}
                      {' · '}
                      {dayjs(m.created_at).format('MM-DD HH:mm')}
                    </div>
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: 12,
                      background: m.sender_kind === 'system'
                        ? '#f0f0f0'
                        : m.sender_kind === 'user' ? '#a5e89e' : '#fff',
                      border: m.sender_kind === 'system' ? 'none' : '1px solid #e6e6e6',
                      color: m.sender_kind === 'system' ? '#666' : '#000',
                      fontSize: m.sender_kind === 'system' ? 12 : 14,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {m.text || ''}
                      {m.attachment_url && m.attachment_kind === 'image' && (
                        <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 6 }}>
                          <img src={m.attachment_url} alt="" style={{ maxWidth: 220, maxHeight: 220, borderRadius: 6, display: 'block' }} />
                        </a>
                      )}
                      {m.attachment_url && m.attachment_kind === 'pdf' && (
                        <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, color: '#1890ff' }}>
                          <FilePdfOutlined /> {m.attachment_name || 'PDF'}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </Space>
      )}
    </Drawer>
  )
}


// ── Requests monitor tab ───────────────────────────────────────────────────────

function RequestsTab() {
  const [rows, setRows]       = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ServiceRequestStatus | undefined>()
  const [catFilter,    setCatFilter]    = useState<SpecialistCategoryCode | undefined>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await specialistsApi.listRequests({
        status:   statusFilter,
        category: catFilter,
      })
      setRows(res.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, catFilter])

  useEffect(() => { load() }, [load])

  const columns: ColumnsType<ServiceRequest> = [
    {
      title: 'ID', dataIndex: 'id', width: 100,
      render: (v: string) => <Text type="secondary" style={{ fontSize: 11 }}>{v.slice(0, 8)}…</Text>,
    },
    {
      title: '用户', dataIndex: 'user', width: 120,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{v.slice(0, 8)}…</Text>,
    },
    {
      title: '分类', dataIndex: 'category', width: 110,
      render: (c: ServiceCategory) => <Tag color="blue">{c.name_zh}</Tag>,
    },
    {
      title: '专家', dataIndex: 'specialist', width: 180,
      render: (s: SpecialistPublic | null) =>
        s ? <Text>{s.full_name || s.username}</Text> : <Text type="secondary">未匹配</Text>,
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      render: (v: ServiceRequestStatus) => <Tag color={STATUS_LABEL[v].color}>{STATUS_LABEL[v].text}</Tag>,
    },
    {
      title: '糖果', dataIndex: 'candy_spent', width: 90,
      render: (v: number, r) => (
        <Space size={4}>
          <Tag color="gold">{v} 糖果</Tag>
          {r.refunded && <Tag color="green">已退</Tag>}
        </Space>
      ),
    },
    {
      title: '换专家', dataIndex: 'swaps_count', width: 80,
      render: (v: number) => v > 0 ? <Tag>{v} 次</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: '评分', dataIndex: 'rating', width: 80,
      render: (v: number | null) => v ? <Tag color="gold">⭐ {v}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: '创建', dataIndex: 'created_at', width: 140,
      render: (v: string) => (
        <Tooltip title={dayjs(v).format('YYYY-MM-DD HH:mm:ss')}>
          <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(v).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: '操作', key: 'action', width: 100,
      render: (_, r) => (
        <Button size="small" icon={<MessageOutlined />} onClick={() => setChatRequestId(r.id)}>聊天</Button>
      ),
    },
  ]

  const [chatRequestId, setChatRequestId] = useState<string | null>(null)

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card size="small">
        <Space wrap>
          <Select
            allowClear placeholder="全部状态"
            style={{ width: 140 }}
            value={statusFilter}
            options={[
              { value: 'searching', label: '匹配中' },
              { value: 'matched',   label: '已匹配' },
              { value: 'confirmed', label: '咨询中' },
              { value: 'completed', label: '已完成' },
              { value: 'cancelled', label: '已取消' },
            ]}
            onChange={(v) => setStatusFilter(v as ServiceRequestStatus | undefined)}
          />
          <Select
            allowClear placeholder="全部分类"
            style={{ width: 160 }}
            value={catFilter}
            options={CATEGORY_OPTIONS}
            onChange={(v) => setCatFilter(v as SpecialistCategoryCode | undefined)}
          />
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        </Space>
      </Card>

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={rows}
          loading={loading}
          size="small"
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <RequestChatDrawer requestId={chatRequestId} onClose={() => setChatRequestId(null)} />
    </Space>
  )
}


// ── Page root ──────────────────────────────────────────────────────────────────

export function SpecialistsPage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>专家咨询管理</Title>
      <Tabs
        defaultActiveKey="categories"
        items={[
          { key: 'categories',  label: '分类与价格', children: <CategoriesTab /> },
          { key: 'specialists', label: '专家列表',   children: <SpecialistsTab /> },
          { key: 'requests',    label: '咨询记录',   children: <RequestsTab /> },
        ]}
      />
      <Divider style={{ margin: '0 0 0 0' }} />
    </div>
  )
}
