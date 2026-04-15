import { useEffect, useState } from 'react'
import {
  Table, Button, Space, Tag, Switch, Popconfirm, Typography,
  message, Image, Tooltip, theme,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import type { AdCard } from '../../types'

const { Title, Text } = Typography

export function AdCardListPage() {
  const { token } = theme.useToken()
  const navigate = useNavigate()
  const [items, setItems]     = useState<AdCard[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)

  async function load(p = page) {
    setLoading(true)
    try {
      const res = await adminApi.getAdCards({ page: p })
      setItems(res.data.results)
      setTotal(res.data.count)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function toggleActive(id: string, val: boolean) {
    await adminApi.updateAdCard(id, { is_active: val })
    setItems(prev => prev.map(a => a.id === id ? { ...a, is_active: val } : a))
  }

  async function deleteCard(id: string) {
    await adminApi.deleteAdCard(id)
    message.success('已删除')
    load()
  }

  const columns = [
    {
      title: '封面',
      dataIndex: 'thumbnail_url',
      width: 72,
      render: (url: string) => url
        ? <Image src={url} width={52} height={70} style={{ objectFit: 'cover', borderRadius: 8 }} preview={false} />
        : <div style={{ width: 52, height: 70, background: '#e8e8e8', borderRadius: 8 }} />,
    },
    {
      title: '标题 / 副标题',
      render: (_: unknown, r: AdCard) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontWeight: 600 }}>{r.title || '—'}</span>
          {r.subtitle && <span style={{ fontSize: 12, color: '#888' }}>{r.subtitle}</span>}
          {r.city && <span style={{ fontSize: 11, color: '#aaa' }}>📍 {r.city}</span>}
        </Space>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      render: (tags: string[]) => (
        <Space wrap size={4}>
          {(tags || []).map(t => <Tag key={t}>{t}</Tag>)}
        </Space>
      ),
    },
    {
      title: '关联内容',
      render: (_: unknown, r: AdCard) => r.linked_content_type
        ? <Tag color="blue">{r.linked_content_type} · {r.linked_content_id.slice(0, 8)}…</Tag>
        : <span style={{ color: '#aaa' }}>外部链接</span>,
    },
    {
      title: '国家',
      dataIndex: 'country',
      width: 72,
      render: (c: string) => <Tag>{c}</Tag>,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 72,
      sorter: (a: AdCard, b: AdCard) => b.priority - a.priority,
    },
    {
      title: '曝光量',
      dataIndex: 'impressions',
      width: 90,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: '点击量',
      dataIndex: 'clicks',
      width: 80,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: '点击率',
      key: 'ctr',
      width: 80,
      render: (_: unknown, r: AdCard) => {
        const ctr = r.impressions > 0 ? (r.clicks / r.impressions * 100).toFixed(1) : '0.0'
        return <Text style={{ color: parseFloat(ctr) > 2 ? token.colorSuccess : undefined }}>{ctr}%</Text>
      },
    },
    {
      title: '启用',
      dataIndex: 'is_active',
      width: 72,
      render: (val: boolean, r: AdCard) => (
        <Switch size="small" checked={val} onChange={v => toggleActive(r.id, v)} />
      ),
    },
    {
      title: '操作',
      width: 100,
      render: (_: unknown, r: AdCard) => (
        <Space>
          <Tooltip title="编辑">
            <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/adcards/${r.id}/edit`)} />
          </Tooltip>
          <Popconfirm title="确认删除？" onConfirm={() => deleteCard(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Title level={4} style={{ margin: 0 }}>广告卡片管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/adcards/create')}>
          新建广告卡片
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={{
          total,
          pageSize: 20,
          current: page,
          onChange: (p) => { setPage(p); load(p) },
          showTotal: (t) => `共 ${t} 条`,
        }}
        size="middle"
      />
    </div>
  )
}
