import { useEffect, useState, useCallback } from 'react'
import {
  Table, Tag, Typography, Card, Input, Select, Space,
  Button, Tooltip, Popconfirm, message, theme,
} from 'antd'
import {
  SearchOutlined, EyeOutlined, CheckOutlined,
  PlayCircleOutlined, HeartOutlined, MessageOutlined, DeleteOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { adminApi } from '../../api/admin'
import { RejectReasonModal } from '../../components/RejectReasonModal'
import type { ForumPost, ForumKind } from '../../types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Text, Title } = Typography

const statusColors: Record<string, string> = {
  pending: 'orange', approved: 'green', rejected: 'red',
}
const statusLabels: Record<string, string> = {
  pending: '待审核', approved: '已通过', rejected: '已拒绝',
}

const categoryLabels: Record<string, string> = {
  general: '全部', qa: '你问我答', nearby: '附近', gossip: '八卦',
}

interface Props {
  kind: ForumKind
}

export function ForumListPage({ kind }: Props) {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const [items, setItems] = useState<ForumPost[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string | undefined>()
  const [category, setCategory] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  // Status picked in the editable dropdown but not yet confirmed via the
  // checkmark button — keyed by item id, cleared once applied or cancelled.
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({})
  const clearPendingOverride = (id: string) => {
    setPendingStatus((prev) => {
      if (!(id in prev)) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getForumPosts({
        page, page_size: PAGE_SIZE,
        kind,
        search: search || undefined,
        status: status || undefined,
        category: category || undefined,
      })
      setItems(res.data.results)
      setTotal(res.data.count)
    } finally {
      setLoading(false)
    }
  }, [kind, page, search, status, category])

  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { setPage(1); setPendingStatus({}) }, [kind])

  const handleApprove = async (id: string) => {
    try {
      await adminApi.approveForumPost(id)
      message.success('已通过')
      clearPendingOverride(id)
      fetchItems()
    } catch { message.error('操作失败') }
  }

  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejecting, setRejecting] = useState(false)

  const handleReject = async (reason: string) => {
    if (!rejectId) return
    setRejecting(true)
    try {
      await adminApi.rejectForumPost(rejectId, reason)
      message.success('已不通过')
      clearPendingOverride(rejectId)
      setRejectId(null)
      fetchItems()
    } catch { message.error('操作失败') } finally { setRejecting(false) }
  }

  const handleSetPending = async (id: string) => {
    try {
      await adminApi.setForumPostPending(id)
      message.success('已重置为待审核')
      clearPendingOverride(id)
      fetchItems()
    } catch { message.error('操作失败') }
  }

  const handleConfirmStatus = (item: ForumPost) => {
    const target = pendingStatus[item.id]
    if (!target || target === item.status) return
    if (target === 'approved') handleApprove(item.id)
    else if (target === 'rejected') setRejectId(item.id)
    else if (target === 'pending') handleSetPending(item.id)
  }

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteForumPost(id)
      message.success('已删除')
      fetchItems()
    } catch { message.error('操作失败') }
  }

  const columns: ColumnsType<ForumPost> = [
    {
      title: '封面',
      key: 'cover',
      width: 64,
      render: (_, item) => {
        const src = item.cover_image
        if (!src && item.post_type === 'video') {
          return (
            <div style={{ width: 48, height: 48, borderRadius: 6, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlayCircleOutlined style={{ color: '#fff', fontSize: 20 }} />
            </div>
          )
        }
        return src ? (
          <div style={{ position: 'relative', width: 48, height: 48 }}>
            <img src={src} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, display: 'block' }} />
            {item.post_type === 'video' && (
              <PlayCircleOutlined style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#fff', fontSize: 18,
                textShadow: '0 0 4px rgba(0,0,0,0.6)',
              }} />
            )}
          </div>
        ) : (
          <div style={{ width: 48, height: 48, borderRadius: 6, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text type="secondary" style={{ fontSize: 10 }}>无图</Text>
          </div>
        )
      },
    },
    {
      title: '标题',
      key: 'title',
      render: (_, item) => (
        <div>
          <Text
            strong
            style={{ cursor: 'pointer', color: token.colorPrimary }}
            onClick={() => navigate(`/forum/posts/${item.id}`)}
          >
            {item.title}
          </Text>
          <div style={{ marginTop: 2 }}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {categoryLabels[item.category] ?? item.category} · {item.author_username || item.author_email || '—'}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 140,
      render: (_, item) => {
        if (item.is_active === false) return <Tag color="default">已删除</Tag>
        return (
          <Select
            size="small"
            variant="borderless"
            value={pendingStatus[item.id] ?? item.status}
            style={{ width: 112 }}
            onChange={(v) => setPendingStatus((prev) => ({ ...prev, [item.id]: v }))}
            options={Object.entries(statusLabels).map(([v, l]) => ({
              value: v,
              label: <Tag color={statusColors[v]} style={{ marginRight: 0 }}>{l}</Tag>,
            }))}
          />
        )
      },
    },
    {
      title: '国家',
      dataIndex: 'country',
      width: 60,
      render: (c: string) => <Text type="secondary">{c}</Text>,
    },
    {
      title: '互动',
      key: 'engagement',
      width: 160,
      render: (_, item) => (
        <Space size="small" wrap>
          <Text type="secondary" style={{ fontSize: 11 }}><EyeOutlined /> {item.view_count}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}><HeartOutlined /> {item.like_count}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}><MessageOutlined /> {item.comment_count}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>⭐ {item.saved_count}</Text>
        </Space>
      ),
    },
    {
      title: '曝光',
      dataIndex: 'impression_count',
      width: 80,
      render: (v: number) => <Text style={{ fontSize: 12 }}>{(v ?? 0).toLocaleString()}</Text>,
    },
    {
      title: '发布时间',
      dataIndex: 'created_at',
      width: 110,
      render: (d: string) => (
        <Tooltip title={dayjs(d).format('YYYY-MM-DD HH:mm')}>
          <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(d).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_, item) => (
        <Space size={4}>
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} onClick={() => navigate(`/forum/posts/${item.id}`)} />
          </Tooltip>
          {pendingStatus[item.id] && pendingStatus[item.id] !== item.status && (
            <Tooltip title="确认修改状态">
              <Button
                type="text"
                icon={<CheckOutlined style={{ color: token.colorSuccess }} />}
                onClick={() => handleConfirmStatus(item)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="确定删除此内容？"
            description="将直接删除，不通知发布者"
            onConfirm={() => handleDelete(item.id)}
            okText="删除" cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="删除">
              <Button type="text" icon={<DeleteOutlined style={{ color: token.colorError }} />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const title = kind === 'video' ? '论坛视频' : '论坛帖子'

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>{title}</Title>
      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索标题或作者..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 140 }}
            value={status}
            onChange={(v) => { setStatus(v); setPage(1) }}
            options={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))}
          />
          <Select
            placeholder="分类"
            allowClear
            style={{ width: 140 }}
            value={category}
            onChange={(v) => { setCategory(v); setPage(1) }}
            options={Object.entries(categoryLabels).map(([v, l]) => ({ value: v, label: l }))}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={items}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>

      <RejectReasonModal
        open={rejectId !== null}
        loading={rejecting}
        onCancel={() => { if (rejectId) clearPendingOverride(rejectId); setRejectId(null) }}
        onSubmit={handleReject}
      />
    </div>
  )
}
