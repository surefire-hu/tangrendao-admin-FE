import { useEffect, useState, useCallback } from 'react'
import {
  Table, Tag, Typography, Card, Input, Select, Space,
  Button, Tooltip, Popconfirm, message, theme,
} from 'antd'
import {
  SearchOutlined, EyeOutlined, CheckOutlined, CloseOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { adminApi } from '../../api/admin'
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
  useEffect(() => { setPage(1) }, [kind])

  const handleApprove = async (id: string) => {
    try {
      await adminApi.approveForumPost(id)
      message.success('已通过')
      fetchItems()
    } catch { message.error('操作失败') }
  }

  const handleReject = async (id: string) => {
    try {
      await adminApi.rejectForumPost(id)
      message.success('已拒绝')
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
      dataIndex: 'status',
      width: 100,
      render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s] ?? s}</Tag>,
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
          <Text type="secondary" style={{ fontSize: 11 }}>👁 {item.view_count}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>❤ {item.like_count}</Text>
          <Text type="secondary" style={{ fontSize: 11 }}>💬 {item.comment_count}</Text>
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
          {item.status === 'pending' && (
            <>
              <Tooltip title="通过">
                <Button
                  type="text"
                  icon={<CheckOutlined style={{ color: token.colorSuccess }} />}
                  onClick={() => handleApprove(item.id)}
                />
              </Tooltip>
              <Popconfirm
                title="确定拒绝此内容？"
                onConfirm={() => handleReject(item.id)}
                okText="确定" cancelText="取消"
              >
                <Tooltip title="拒绝">
                  <Button type="text" icon={<CloseOutlined style={{ color: token.colorError }} />} />
                </Tooltip>
              </Popconfirm>
            </>
          )}
        </Space>
      ),
    },
  ]

  const title = kind === 'video' ? '🎬 论坛视频' : '💬 论坛帖子'

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
    </div>
  )
}
