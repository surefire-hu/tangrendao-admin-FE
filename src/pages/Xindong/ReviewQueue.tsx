import { useEffect, useState, useCallback } from 'react'
import { Tabs, Table, Tag, Typography, Card, Select, Space, Button, Modal, Input, message, Image } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { adminApi } from '../../api/admin'
import type { XindongPhoto, XindongPhotoStatus, XindongReport } from '../../types'

const { Title, Text } = Typography
const { TextArea } = Input

const photoStatusColors: Record<XindongPhotoStatus, string> = {
  pending: 'orange', approved: 'green', rejected: 'red',
}
const photoStatusLabels: Record<XindongPhotoStatus, string> = {
  pending: '待审核', approved: '已批准', rejected: '已拒绝',
}

function PhotoReviewTab() {
  const [items, setItems] = useState<XindongPhoto[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<XindongPhotoStatus | 'all'>('pending')
  const [rejectTarget, setRejectTarget] = useState<XindongPhoto | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getXindongPhotos(statusFilter)
      setItems(res.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function approve(p: XindongPhoto) {
    try {
      await adminApi.approveXindongPhoto(p.id)
      message.success('已批准')
      fetchItems()
    } catch {
      message.error('操作失败')
    }
  }

  async function submitReject() {
    if (!rejectTarget) return
    if (!rejectReason.trim()) { message.warning('请填写拒绝原因'); return }
    setSaving(true)
    try {
      await adminApi.rejectXindongPhoto(rejectTarget.id, rejectReason.trim())
      message.success('已拒绝')
      setRejectTarget(null)
      fetchItems()
    } catch {
      message.error('操作失败')
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnsType<XindongPhoto> = [
    {
      title: '预览', width: 90,
      render: (_, r) => (
        <div style={{ position: 'relative', width: 64, height: 64 }}>
          <Image src={r.image_url} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} />
          {r.media_type === 'video' && (
            <Button
              size="small" type="link" href={r.video_url ?? undefined} target="_blank"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', color: '#fff', fontSize: 22, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
            >
              ▶
            </Button>
          )}
        </div>
      ),
    },
    { title: '用户', dataIndex: 'profile_numeric_id', width: 120, render: (v: string) => <Text code>#{v}</Text> },
    { title: '提交时间', dataIndex: 'created_at', width: 140, render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm') },
    { title: '状态', dataIndex: 'status', width: 90, render: (s: XindongPhotoStatus) => <Tag color={photoStatusColors[s]}>{photoStatusLabels[s]}</Tag> },
    {
      title: '操作', width: 160,
      render: (_, r) => r.status === 'pending' ? (
        <Space>
          <Button type="primary" size="small" onClick={() => approve(r)}>批准</Button>
          <Button danger size="small" onClick={() => { setRejectTarget(r); setRejectReason('') }}>拒绝</Button>
        </Space>
      ) : (
        <Text type="secondary" style={{ fontSize: 12 }}>{r.rejection_reason || '—'}</Text>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Space>
          <Select
            value={statusFilter}
            style={{ width: 130 }}
            onChange={setStatusFilter}
            options={[
              { value: 'pending', label: '待审核' },
              { value: 'approved', label: '已批准' },
              { value: 'rejected', label: '已拒绝' },
              { value: 'all', label: '全部' },
            ]}
          />
          <Button onClick={fetchItems}>刷新</Button>
        </Space>
      </div>
      <Card styles={{ body: { padding: 0 } }}>
        <Table rowKey="id" loading={loading} dataSource={items} columns={columns} pagination={{ pageSize: 20 }} />
      </Card>

      <Modal
        open={!!rejectTarget}
        title="拒绝照片"
        okText="拒绝"
        okButtonProps={{ danger: true, loading: saving }}
        cancelText="取消"
        onOk={submitReject}
        onCancel={() => setRejectTarget(null)}
      >
        <TextArea rows={3} maxLength={200} showCount placeholder="必填 — 拒绝原因" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
      </Modal>
    </div>
  )
}

function ReportsTab() {
  const [items, setItems] = useState<XindongReport[]>([])
  const [loading, setLoading] = useState(false)
  const [resolvedFilter, setResolvedFilter] = useState<'unresolved' | 'resolved' | 'all'>('unresolved')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getXindongReports(
        resolvedFilter === 'all' ? undefined : resolvedFilter === 'resolved',
      )
      setItems(res.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [resolvedFilter])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function resolve(r: XindongReport) {
    try {
      await adminApi.resolveXindongReport(r.id)
      message.success('已标记为已处理')
      fetchItems()
    } catch {
      message.error('操作失败')
    }
  }

  const columns: ColumnsType<XindongReport> = [
    { title: '举报人', dataIndex: 'reporter_username', width: 140, render: (v: string | null) => v || '—' },
    { title: '原因', dataIndex: 'reason_display', width: 140, render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '详情', dataIndex: 'detail', render: (d: string) => d || '—' },
    { title: '提交时间', dataIndex: 'created_at', width: 140, render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm') },
    { title: '状态', dataIndex: 'resolved', width: 90, render: (r: boolean) => <Tag color={r ? 'green' : 'orange'}>{r ? '已处理' : '待处理'}</Tag> },
    {
      title: '操作', width: 100,
      render: (_, r) => !r.resolved && <Button size="small" onClick={() => resolve(r)}>标记已处理</Button>,
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Space>
          <Select
            value={resolvedFilter}
            style={{ width: 130 }}
            onChange={setResolvedFilter}
            options={[
              { value: 'unresolved', label: '待处理' },
              { value: 'resolved', label: '已处理' },
              { value: 'all', label: '全部' },
            ]}
          />
          <Button onClick={fetchItems}>刷新</Button>
        </Space>
      </div>
      <Card styles={{ body: { padding: 0 } }}>
        <Table rowKey="id" loading={loading} dataSource={items} columns={columns} pagination={{ pageSize: 20 }} />
      </Card>
    </div>
  )
}

export function ReviewQueuePage() {
  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>心动信号审核</Title>
      <Tabs
        items={[
          { key: 'photos', label: '照片审核', children: <PhotoReviewTab /> },
          { key: 'reports', label: '举报', children: <ReportsTab /> },
        ]}
      />
    </div>
  )
}
