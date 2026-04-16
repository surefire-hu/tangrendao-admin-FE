import { useState, useEffect, useCallback } from 'react'
import {
  Table, Tag, Select, Button, Modal, Image, Typography, Space, Badge,
} from 'antd'
import { CheckCircleOutlined, EyeOutlined } from '@ant-design/icons'
import { apiClient } from '../../api/client'

const { Text, Paragraph } = Typography

interface Feedback {
  id: string
  user_email: string | null
  description: string
  image_url: string | null
  status: 'new' | 'read' | 'resolved'
  platform: string
  created_at: string
}

interface FeedbackListResponse {
  count: number
  results: Feedback[]
}

const STATUS_LABELS: Record<string, string> = {
  new:      '新',
  read:     '已读',
  resolved: '已解决',
}

const STATUS_COLORS: Record<string, string> = {
  new:      'red',
  read:     'blue',
  resolved: 'green',
}

const STATUS_OPTIONS = [
  { value: '',         label: '全部' },
  { value: 'new',      label: '新' },
  { value: 'read',     label: '已读' },
  { value: 'resolved', label: '已解决' },
]

export function FeedbackPage() {
  const [items, setItems]         = useState<Feedback[]>([])
  const [total, setTotal]         = useState(0)
  const [loading, setLoading]     = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]           = useState(1)
  const [selected, setSelected]   = useState<Feedback | null>(null)
  const [updating, setUpdating]   = useState(false)

  const load = useCallback(async (p = page, s = statusFilter) => {
    setLoading(true)
    try {
      const params: Record<string, string | number> = { page: p, page_size: 20 }
      if (s) params.status = s
      const res = await apiClient.get<FeedbackListResponse>('/admin/feedback/', { params })
      setItems(res.data.results)
      setTotal(res.data.count)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => { load() }, [load])

  async function updateStatus(id: string, newStatus: Feedback['status']) {
    setUpdating(true)
    try {
      const res = await apiClient.patch<Feedback>(`/admin/feedback/${id}/`, { status: newStatus })
      setItems(prev => prev.map(f => f.id === id ? res.data : f))
      if (selected?.id === id) setSelected(res.data)
    } finally {
      setUpdating(false)
    }
  }

  const columns = [
    {
      title: '用户',
      dataIndex: 'user_email',
      render: (v: string | null) => <Text type="secondary">{v ?? '匿名'}</Text>,
      width: 180,
    },
    {
      title: '描述',
      dataIndex: 'description',
      render: (v: string) => (
        <Text style={{ maxWidth: 300, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {v}
        </Text>
      ),
    },
    {
      title: '截图',
      dataIndex: 'image_url',
      render: (v: string | null) =>
        v ? <Image src={v} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 6 }} /> : '—',
      width: 70,
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (v: string) => <Tag color={STATUS_COLORS[v]}>{STATUS_LABELS[v]}</Tag>,
      width: 80,
    },
    {
      title: '时间',
      dataIndex: 'created_at',
      render: (v: string) => new Date(v).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' }),
      width: 130,
    },
    {
      title: '操作',
      render: (_: unknown, record: Feedback) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => {
          setSelected(record)
          if (record.status === 'new') updateStatus(record.id, 'read')
        }}>
          查看
        </Button>
      ),
      width: 80,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text strong style={{ fontSize: 18 }}>问题反馈</Text>
        <Select
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={v => { setStatusFilter(v); setPage(1); load(1, v); }}
          style={{ width: 120 }}
        />
      </div>

      <Table
        dataSource={items}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: p => { setPage(p); load(p); },
          showTotal: t => `共 ${t} 条`,
        }}
        size="small"
        rowClassName={(r) => r.status === 'new' ? 'feedback-row-new' : ''}
      />

      <Modal
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={null}
        title="反馈详情"
        width={520}
      >
        {selected && (
          <Space direction="vertical" style={{ width: '100%' }} size={16}>
            <div>
              <Text type="secondary">用户：</Text>
              <Text>{selected.user_email ?? '匿名'}</Text>
            </div>
            <div>
              <Text type="secondary">状态：</Text>
              <Tag color={STATUS_COLORS[selected.status]}>{STATUS_LABELS[selected.status]}</Tag>
            </div>
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>描述：</Text>
              <Paragraph style={{ background: '#f5f5f5', padding: '10px 14px', borderRadius: 8, margin: 0 }}>
                {selected.description}
              </Paragraph>
            </div>
            {selected.image_url && (
              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: 6 }}>截图：</Text>
                <Image src={selected.image_url} style={{ maxWidth: '100%', borderRadius: 8 }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {selected.status !== 'resolved' && (
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={updating}
                  onClick={() => updateStatus(selected.id, 'resolved')}
                >
                  标为已解决
                </Button>
              )}
              {selected.status === 'resolved' && (
                <Button onClick={() => updateStatus(selected.id, 'new')} loading={updating}>
                  重新打开
                </Button>
              )}
            </div>
          </Space>
        )}
      </Modal>

      <style>{`.feedback-row-new td { font-weight: 600; }`}</style>
    </div>
  )
}
