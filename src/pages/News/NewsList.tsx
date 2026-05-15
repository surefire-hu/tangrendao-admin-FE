import { useEffect, useState, useCallback } from 'react'
import {
  Table, Tag, Typography, Card, Select, Space, Button, Input, message,
  Image, Popconfirm,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import type { AdminNewsArticle } from '../../types'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const PAGE_SIZE = 20

export function NewsListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<AdminNewsArticle[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all')
  const [page, setPage] = useState(1)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getNewsArticles({
        page,
        page_size: PAGE_SIZE,
        search: search || undefined,
        is_published: statusFilter === 'all' ? undefined : statusFilter === 'published',
      })
      setItems(res.data.results ?? [])
      setTotal(res.data.count ?? 0)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function deleteArticle(id: string) {
    try {
      await adminApi.deleteNewsArticle(id)
      message.success('已删除')
      fetchItems()
    } catch {
      message.error('删除失败')
    }
  }

  async function togglePublish(article: AdminNewsArticle) {
    try {
      await adminApi.updateNewsArticle(article.id, { is_published: !article.is_published })
      message.success(article.is_published ? '已下架' : '已发布')
      fetchItems()
    } catch {
      message.error('操作失败')
    }
  }

  const columns: ColumnsType<AdminNewsArticle> = [
    {
      title: '封面',
      dataIndex: 'cover_image',
      width: 90,
      render: (src: string) => src ? (
        <Image src={src} width={70} height={50}
               style={{ objectFit: 'cover', borderRadius: 4 }} preview={false} />
      ) : (
        <div style={{ width: 70, height: 50, background: '#f0f0f0', borderRadius: 4 }} />
      ),
    },
    {
      title: '标题',
      dataIndex: 'title',
      render: (t: string, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{t}</div>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {r.summary?.slice(0, 60) || '—'}
          </Text>
        </div>
      ),
    },
    {
      title: '作者',
      dataIndex: 'author',
      width: 120,
      render: (a: AdminNewsArticle['author']) => (
        <Text style={{ fontSize: 12 }}>{a?.username ?? '—'}</Text>
      ),
    },
    {
      title: '国家',
      dataIndex: 'country',
      width: 70,
      render: (c: string) => c || '全部',
    },
    {
      title: '原创',
      dataIndex: 'is_original',
      width: 60,
      render: (b: boolean) => b ? <Tag color="blue">原创</Tag> : <Tag>转载</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'is_published',
      width: 80,
      render: (b: boolean) => b ? <Tag color="green">已发布</Tag> : <Tag>草稿</Tag>,
    },
    {
      title: '阅读',
      dataIndex: 'view_count',
      width: 70,
      render: (v: number) => <Space size={4}><EyeOutlined /><Text style={{ fontSize: 12 }}>{v}</Text></Space>,
    },
    {
      title: '发布时间',
      dataIndex: 'published_at',
      width: 140,
      render: (t: string | null) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '—',
    },
    {
      title: '操作',
      width: 200,
      render: (_, r) => (
        <Space>
          <Button size="small" icon={<EditOutlined />}
                  onClick={() => navigate(`/news/${r.id}/edit`)}>编辑</Button>
          <Button size="small" type={r.is_published ? 'default' : 'primary'}
                  onClick={() => togglePublish(r)}>
            {r.is_published ? '下架' : '发布'}
          </Button>
          <Popconfirm title="确定删除?" onConfirm={() => deleteArticle(r.id)}
                      okText="确定" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>新闻管理</Title>
        <Space>
          <Input.Search
            allowClear
            placeholder="搜索标题"
            style={{ width: 220 }}
            onSearch={(v) => { setSearch(v); setPage(1) }}
          />
          <Select
            value={statusFilter}
            style={{ width: 120 }}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            options={[
              { value: 'all',       label: '全部' },
              { value: 'published', label: '已发布' },
              { value: 'draft',     label: '草稿' },
            ]}
          />
          <Button type="primary" icon={<PlusOutlined />}
                  onClick={() => navigate('/news/create')}>新建文章</Button>
        </Space>
      </div>

      <Card styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: setPage,
            showSizeChanger: false,
          }}
        />
      </Card>
    </div>
  )
}
