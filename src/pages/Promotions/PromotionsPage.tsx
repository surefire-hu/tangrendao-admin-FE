import { useCallback, useEffect, useState } from 'react'
import {
  Table, Tag, Select, Typography, Avatar, Button, Space, Image, Tooltip, Empty,
} from 'antd'
import {
  UserOutlined, FireOutlined, GiftOutlined, EyeOutlined, CheckOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { apiClient } from '../../api/client'

const { Text } = Typography

interface AdminPromotion {
  id: string
  content_type: string
  content_id: string
  content_name: string
  content: {
    id: string
    title: string
    thumbnail: string | null
    city: string
  } | null
  area: 'local' | 'national'
  candy_spent: number
  starts_at: string | null
  ends_at: string | null
  status: 'active' | 'completed' | 'cancelled'
  is_admin_read: boolean
  days_remaining: number
  impressions_target_min: number
  impressions_target_max: number
  created_at: string
  user: {
    id: string
    email: string | null
    username: string | null
    avatar: string | null
  } | null
}

interface PromoListResponse {
  count: number
  results: AdminPromotion[]
}

const STATUS_LABELS: Record<string, string> = {
  active:    '进行中',
  completed: '已完成',
  cancelled: '已取消',
}
const STATUS_COLORS: Record<string, string> = {
  active:    'green',
  completed: 'blue',
  cancelled: 'default',
}
const CONTENT_TYPE_LABELS: Record<string, string> = {
  listing:       '商家/餐厅',
  job_post:      '招聘帖子',
  job_seek:      '求职帖子',
  housing:       '房源',
  market:        '买卖信息',
  local_service: '本地服务',
  forum_post:    '论坛帖子',
}
const AREA_LABELS: Record<string, string> = {
  local:    '同城',
  national: '不限区域',
}
const STATUS_OPTIONS = [
  { value: '',          label: '全部状态' },
  { value: 'active',    label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
]
const UNREAD_OPTIONS = [
  { value: 'all',    label: '全部' },
  { value: 'unread', label: '仅未读' },
]

function contentLinkFor(p: AdminPromotion): string | null {
  if (!p.content) return null
  if (p.content_type === 'forum_post') return `/forum/posts/${p.content_id}`
  return `/publications/${p.content_type}/${p.content_id}`
}

export function PromotionsPage() {
  const navigate = useNavigate()
  const [items, setItems]               = useState<AdminPromotion[]>([])
  const [total, setTotal]               = useState(0)
  const [loading, setLoading]           = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [readFilter, setReadFilter]     = useState<'all' | 'unread'>('all')
  const [page, setPage]                 = useState(1)

  const load = useCallback(async (p = page, s = statusFilter, r = readFilter) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page: p, page_size: 20 }
      if (s) params.status = s
      if (r === 'unread') params.unread = 'true'
      const res = await apiClient.get<PromoListResponse>('/admin/promotions/', { params })
      setItems(res.data.results)
      setTotal(res.data.count)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, readFilter])

  useEffect(() => { load() }, [load])

  async function markRead(p: AdminPromotion) {
    if (p.is_admin_read) return
    try {
      await apiClient.patch(`/admin/promotions/${p.id}/`, { is_admin_read: true })
      setItems(prev => prev.map(x => x.id === p.id ? { ...x, is_admin_read: true } : x))
    } catch { /* silent */ }
  }

  const columns = [
    {
      title: '谁',
      dataIndex: 'user',
      width: 200,
      render: (u: AdminPromotion['user']) => !u ? <Text type="secondary">—</Text> : (
        <Space>
          <Avatar src={u.avatar ?? undefined} icon={<UserOutlined />} size={32} />
          <Button type="link" style={{ padding: 0 }} onClick={() => navigate(`/users/${u.id}`)}>
            {u.username || u.email || u.id.slice(0, 8)}
          </Button>
        </Space>
      ),
    },
    {
      title: '推广内容',
      width: 340,
      render: (_: unknown, p: AdminPromotion) => {
        const link = contentLinkFor(p)
        const title = p.content?.title || p.content_name || '(内容已删除)'
        const thumb = p.content?.thumbnail
        const typeLabel = CONTENT_TYPE_LABELS[p.content_type] ?? p.content_type
        return (
          <Space align="start">
            {thumb ? (
              <Image
                src={thumb}
                width={48}
                height={48}
                style={{ objectFit: 'cover', borderRadius: 6 }}
                preview={false}
              />
            ) : (
              <div style={{
                width: 48, height: 48, borderRadius: 6,
                background: '#f0f0f0', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <FireOutlined style={{ color: '#bbb' }} />
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <Tag color="geekblue" style={{ marginBottom: 2 }}>{typeLabel}</Tag>
              <div style={{ fontWeight: 500, maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {link
                  ? <Button type="link" style={{ padding: 0 }} onClick={() => navigate(link)}>{title}</Button>
                  : <Text>{title}</Text>}
              </div>
              {p.content?.city && <Text type="secondary" style={{ fontSize: 12 }}>{p.content.city}</Text>}
            </div>
          </Space>
        )
      },
    },
    {
      title: '区域',
      dataIndex: 'area',
      width: 90,
      render: (v: string) => <Tag>{AREA_LABELS[v] ?? v}</Tag>,
    },
    {
      title: '糖果',
      dataIndex: 'candy_spent',
      width: 100,
      render: (v: number) => (
        <Space size={4}>
          <GiftOutlined style={{ color: '#faad14' }} />
          <Text strong>{v}</Text>
        </Space>
      ),
    },
    {
      title: '期间',
      width: 180,
      render: (_: unknown, p: AdminPromotion) => {
        if (!p.starts_at || !p.ends_at) return '—'
        const s = new Date(p.starts_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
        const e = new Date(p.ends_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
        return (
          <div>
            <div>{s} → {e}</div>
            {p.status === 'active' && (
              <Text type="secondary" style={{ fontSize: 12 }}>剩 {p.days_remaining} 天</Text>
            )}
          </div>
        )
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (v: string) => <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v] ?? v}</Tag>,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      width: 140,
      render: (v: string) => new Date(v).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' }),
    },
    {
      title: '操作',
      width: 140,
      render: (_: unknown, p: AdminPromotion) => (
        <Space>
          {contentLinkFor(p) && (
            <Tooltip title="查看推广内容">
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => {
                  markRead(p)
                  navigate(contentLinkFor(p)!)
                }}
              />
            </Tooltip>
          )}
          {!p.is_admin_read && (
            <Tooltip title="标为已读">
              <Button size="small" icon={<CheckOutlined />} onClick={() => markRead(p)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <Text strong style={{ fontSize: 18 }}>推广记录</Text>
        <Space>
          <Select
            value={readFilter}
            options={UNREAD_OPTIONS}
            onChange={v => { setReadFilter(v); setPage(1); load(1, statusFilter, v) }}
            style={{ width: 120 }}
          />
          <Select
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={v => { setStatusFilter(v); setPage(1); load(1, v, readFilter) }}
            style={{ width: 140 }}
          />
        </Space>
      </div>

      <Table
        dataSource={items}
        columns={columns}
        rowKey="id"
        loading={loading}
        locale={{ emptyText: <Empty description="暂无推广记录" /> }}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: p => { setPage(p); load(p) },
          showTotal: t => `共 ${t} 条`,
        }}
        size="small"
        rowClassName={(r) => r.is_admin_read ? '' : 'promo-row-new'}
      />

      <style>{`.promo-row-new td { background: #fffbe6; font-weight: 600; }`}</style>
    </div>
  )
}
