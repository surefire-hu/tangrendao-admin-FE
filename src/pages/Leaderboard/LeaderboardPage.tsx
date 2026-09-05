import { useEffect, useState, useCallback } from 'react'
import { Table, Tag, Typography, Card, Input, Space, Tabs, Tooltip, theme } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { adminApi } from '../../api/admin'
import type { LeaderboardContentType, LeaderboardItem } from '../../types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Text, Title } = Typography

const statusColors: Record<string, string> = {
  pending: 'orange', approved: 'green', rejected: 'red', suspended: 'default', deleted: 'default',
}
const statusLabels: Record<string, string> = {
  pending: '待审核', approved: '已通过', rejected: '已拒绝', suspended: '已暂停', deleted: '已删除',
}

const TABS: { key: LeaderboardContentType; label: string }[] = [
  { key: 'forum', label: '论坛' },
  { key: 'listing', label: '商家列表' },
  { key: 'job_post', label: '招聘' },
  { key: 'job_seek', label: '求职' },
  { key: 'housing', label: '房屋租售' },
  { key: 'market', label: '买卖市场' },
  { key: 'local_service', label: '本地服务' },
]

// Signal breakdown differs per content type — forum/listing have a real
// organic-engagement component, job/classifieds only have paid_boost + raw
// view_count (see AdminLeaderboardView docstring on the backend).
function breakdown(item: LeaderboardItem): string {
  const parts: string[] = []
  if (item.social_score !== undefined) parts.push(`社交分 ${item.social_score.toFixed(1)}`)
  if (item.social_boost !== undefined) parts.push(`社交加成 ${item.social_boost.toFixed(1)}`)
  if (item.recommendation_score !== undefined) parts.push(`推荐分 ${item.recommendation_score.toFixed(1)}`)
  if (item.view_count !== undefined) parts.push(`浏览 ${item.view_count}`)
  if (item.paid_boost !== undefined) parts.push(`推广加成 ${item.paid_boost.toFixed(1)}`)
  return parts.join(' + ')
}

export function LeaderboardPage() {
  const { token } = theme.useToken()
  const [activeTab, setActiveTab] = useState<LeaderboardContentType>('forum')
  const [items, setItems] = useState<LeaderboardItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getLeaderboard({
        content_type: activeTab,
        search: search || undefined,
        page,
        page_size: PAGE_SIZE,
      })
      setItems(res.data.results)
      setTotal(res.data.count)
    } finally {
      setLoading(false)
    }
  }, [activeTab, page, search])

  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { setPage(1) }, [activeTab])

  const columns: ColumnsType<LeaderboardItem> = [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 70,
      render: (r: number) => <Text strong={r <= 3} style={r <= 3 ? { color: token.colorPrimary } : undefined}>#{r}</Text>,
    },
    {
      title: '标题',
      key: 'title',
      render: (_, item) => <Text strong>{item.title}</Text>,
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_, item) => <Tag color={statusColors[item.status]}>{statusLabels[item.status] ?? item.status}</Tag>,
    },
    {
      title: '积分',
      dataIndex: 'score',
      width: 220,
      sorter: false,
      render: (score: number, item) => (
        <Tooltip title={breakdown(item)}>
          <Text strong style={{ fontSize: 15 }}>{score.toLocaleString()}</Text>
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>{breakdown(item)}</Text>
        </Tooltip>
      ),
    },
    {
      title: '发布时间',
      dataIndex: 'created_at',
      width: 120,
      render: (d: string) => (
        <Tooltip title={dayjs(d).format('YYYY-MM-DD HH:mm')}>
          <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(d).fromNow()}</Text>
        </Tooltip>
      ),
    },
  ]

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>内容排行榜</Title>

      <Tabs
        activeKey={activeTab}
        onChange={(k) => setActiveTab(k as LeaderboardContentType)}
        items={TABS.map((t) => ({ key: t.key, label: t.label }))}
      />

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索标题..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            style={{ width: 260 }}
            allowClear
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
