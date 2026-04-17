import { useEffect, useState, useCallback } from 'react'
import {
  Table, Tag, Typography, Card, Input, Select, Space,
  Button, Tooltip, Popconfirm, message, Tabs, theme,
} from 'antd'
import {
  SearchOutlined, EyeOutlined, CheckOutlined, CloseOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { adminApi } from '../../api/admin'
import type { ClassifiedItem, JobPost, JobSeek, PublicationType } from '../../types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Text, Title } = Typography

type AnyItem = ClassifiedItem | JobPost | JobSeek

const statusColors: Record<string, string> = {
  pending: 'orange',
  approved: 'green',
  rejected: 'red',
}

const statusLabels: Record<string, string> = {
  pending: '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}

interface Props {
  type: PublicationType
}

const typeConfig: Record<
  PublicationType,
  { title: string; tabs?: { key: string; label: string; subtype: PublicationType }[] }
> = {
  market: { title: '🛒 买卖市场' },
  local_service: { title: '🔧 本地服务' },
  housing: { title: '🏠 房屋租售' },
  job_post: {
    title: '💼 招聘求职',
    tabs: [
      { key: 'job_post', label: '招聘信息', subtype: 'job_post' },
      { key: 'job_seek', label: '求职信息', subtype: 'job_seek' },
    ],
  },
  job_seek: { title: '💼 求职信息' },
  listing: { title: '🏢 Listing' },
}

export function PublicationList({ type }: { type: PublicationType; items: AnyItem[]; total: number; loading: boolean; page: number; onPageChange: (p: number) => void; onApprove: (id: string) => void; onReject: (id: string) => void; onView: (id: string) => void }) {
  return null // stub — see below
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _unused() { return <PublicationList type="market" items={[]} total={0} loading={false} page={1} onPageChange={() => {}} onApprove={() => {}} onReject={() => {}} onView={() => {}} /> }

export function PublicationListPage({ type }: Props) {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const [activeTab, setActiveTab] = useState<PublicationType>(type)
  const [items, setItems] = useState<AnyItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string | undefined>()
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: PAGE_SIZE, search: search || undefined, status: status || undefined, ordering: '-created_at' }
      let data: { results: AnyItem[]; count: number }

      if (activeTab === 'job_post') {
        const res = await adminApi.getJobPosts(params)
        data = res.data
      } else if (activeTab === 'job_seek') {
        const res = await adminApi.getJobSeeks(params)
        data = res.data
      } else if (activeTab === 'listing') {
        const res = await adminApi.getListings(params)
        data = { results: res.data.results as unknown as AnyItem[], count: res.data.count }
      } else {
        const category = activeTab === 'market' ? 'market' : activeTab === 'local_service' ? 'local_service' : 'housing'
        const res = await adminApi.getClassifieds({ ...params, category })
        data = res.data
      }

      setItems(data.results)
      setTotal(data.count)
    } finally {
      setLoading(false)
    }
  }, [activeTab, page, search, status])

  useEffect(() => { fetchItems() }, [fetchItems])
  useEffect(() => { setActiveTab(type); setPage(1) }, [type])

  const handleApprove = async (id: string) => {
    try {
      await adminApi.approvePublication(activeTab, id)
      message.success('已通过')
      fetchItems()
    } catch { message.error('操作失败') }
  }

  const handleReject = async (id: string) => {
    try {
      await adminApi.rejectPublication(activeTab, id)
      message.success('已拒绝')
      fetchItems()
    } catch { message.error('操作失败') }
  }

  const getTitle = (item: AnyItem): string => {
    if ('title' in item) return item.title
    if ('name' in item) return (item as unknown as { name: string }).name
    return '—'
  }

  const getCover = (item: AnyItem): string | null => {
    if ('cover_image' in item && item.cover_image) return item.cover_image as string
    if ('cover_url' in item && (item as any).cover_url) return (item as any).cover_url
    if ('thumbnail_url' in item && (item as any).thumbnail_url) return (item as any).thumbnail_url
    if ('images' in item && Array.isArray((item as any).images) && (item as any).images.length > 0) return (item as any).images[0]
    return null
  }

  const columns: ColumnsType<AnyItem> = [
    {
      title: '封面',
      key: 'cover',
      width: 64,
      render: (_, item) => {
        const src = getCover(item)
        return src ? (
          <img
            src={src}
            alt=""
            style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, display: 'block' }}
          />
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
        <Text
          strong
          style={{ cursor: 'pointer', color: token.colorPrimary }}
          onClick={() => navigate(`/publications/${activeTab}/${item.id}`)}
        >
          {getTitle(item)}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (s: string) => <Tag color={statusColors[s]}>{statusLabels[s] ?? s}</Tag>,
    },
    {
      title: '国家',
      dataIndex: 'country',
      width: 70,
      render: (c: string) => <Text type="secondary">{c}</Text>,
    },
    {
      title: '城市',
      dataIndex: 'city',
      width: 120,
      render: (c: string) => <Text type="secondary">{c || '—'}</Text>,
    },
    {
      title: '曝光量',
      key: 'impression_count',
      width: 90,
      render: (_: unknown, item: AnyItem) => {
        const v = (item as { impression_count?: number }).impression_count ?? 0
        return <Text style={{ fontSize: 12 }}>{v.toLocaleString()}</Text>
      },
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
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_, item) => (
        <Space size={4}>
          <Tooltip title="查看统计">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/publications/${activeTab}/${item.id}`)}
            />
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
                okText="确定"
                cancelText="取消"
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

  const config = typeConfig[type]
  const hasTabs = !!config.tabs

  const tableContent = (
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
        <Select
          placeholder="状态"
          allowClear
          style={{ width: 140 }}
          value={status}
          onChange={(v) => { setStatus(v); setPage(1) }}
          options={Object.entries(statusLabels).map(([v, l]) => ({ value: v, label: l }))}
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
  )

  return (
    <div>
      <Title level={4} style={{ marginBottom: 20 }}>{config.title}</Title>

      {hasTabs ? (
        <Tabs
          activeKey={activeTab}
          onChange={(k) => { setActiveTab(k as PublicationType); setPage(1) }}
          items={config.tabs!.map((t) => ({ key: t.key, label: t.label, children: tableContent }))}
        />
      ) : tableContent}
    </div>
  )
}
