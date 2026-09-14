import { useEffect, useState, useCallback } from 'react'
import { Table, Tag, Typography, Card, Select, Space, Button, Modal, Input, message, Tooltip } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { adminApi } from '../../api/admin'
import type { XindongCircleRequest, XindongCircleRequestStatus } from '../../types'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const statusColors: Record<XindongCircleRequestStatus, string> = {
  pending: 'orange', approved: 'green', rejected: 'red',
}
const statusLabels: Record<XindongCircleRequestStatus, string> = {
  pending: '待审核', approved: '已通过', rejected: '已拒绝',
}

export function CircleRequestListPage() {
  const [items, setItems] = useState<XindongCircleRequest[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<XindongCircleRequestStatus | 'all'>('pending')

  const [actionTarget, setActionTarget] = useState<XindongCircleRequest | null>(null)
  const [adminResponse, setAdminResponse] = useState('')
  const [actionSaving, setActionSaving] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getXindongCircleRequests(statusFilter === 'all' ? undefined : statusFilter)
      setItems(res.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchItems() }, [fetchItems])

  async function approve(req: XindongCircleRequest) {
    try {
      await adminApi.approveXindongCircleRequest(req.id)
      message.success('已通过，圈子已创建')
      fetchItems()
    } catch {
      message.error('操作失败')
    }
  }

  function openReject(req: XindongCircleRequest) {
    setActionTarget(req)
    setAdminResponse('')
  }

  async function submitReject() {
    if (!actionTarget) return
    if (!adminResponse.trim()) {
      message.warning('请填写拒绝理由')
      return
    }
    setActionSaving(true)
    try {
      await adminApi.rejectXindongCircleRequest(actionTarget.id, adminResponse.trim())
      message.success('已拒绝')
      setActionTarget(null)
      fetchItems()
    } catch {
      message.error('操作失败')
    } finally {
      setActionSaving(false)
    }
  }

  const columns: ColumnsType<XindongCircleRequest> = [
    { title: '申请人', dataIndex: 'profile_numeric_id', width: 120, render: (v: string) => <Text code>#{v}</Text> },
    { title: '圈子名称', dataIndex: 'requested_name' },
    {
      title: '描述', dataIndex: 'requested_description',
      render: (d: string) => <Paragraph style={{ marginBottom: 0, maxWidth: 320 }} ellipsis={{ rows: 2 }}>{d || '—'}</Paragraph>,
    },
    { title: '提交时间', dataIndex: 'created_at', width: 140, render: (t: string) => dayjs(t).format('YYYY-MM-DD HH:mm') },
    { title: '状态', dataIndex: 'status', width: 90, render: (s: XindongCircleRequestStatus) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag> },
    {
      title: '操作', width: 160,
      render: (_, r) => r.status === 'pending' ? (
        <Space>
          <Button type="primary" size="small" onClick={() => approve(r)}>通过</Button>
          <Button danger size="small" onClick={() => openReject(r)}>拒绝</Button>
        </Space>
      ) : (
        <Tooltip title={r.admin_response || '—'}><Text type="secondary" style={{ fontSize: 12 }}>已处理</Text></Tooltip>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>圈子创建申请</Title>
        <Space>
          <Select
            value={statusFilter}
            style={{ width: 130 }}
            onChange={setStatusFilter}
            options={[
              { value: 'pending', label: '待审核' },
              { value: 'approved', label: '已通过' },
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
        open={!!actionTarget}
        title="拒绝圈子创建申请"
        okText="拒绝"
        okButtonProps={{ danger: true, loading: actionSaving }}
        cancelText="取消"
        onOk={submitReject}
        onCancel={() => setActionTarget(null)}
      >
        <TextArea
          rows={4}
          maxLength={500}
          showCount
          placeholder="必填 — 拒绝理由"
          value={adminResponse}
          onChange={(e) => setAdminResponse(e.target.value)}
        />
      </Modal>
    </div>
  )
}
