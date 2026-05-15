import { useEffect, useState, useCallback } from 'react'
import {
  Table, Tag, Typography, Card, Select, Space, Button, Avatar, Modal,
  Input, message, Tooltip, Alert,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { UserOutlined, MailOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import type { UnbanRequest, UnbanRequestStatus } from '../../types'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const statusColors: Record<UnbanRequestStatus, string> = {
  pending:  'orange',
  approved: 'green',
  rejected: 'red',
}
const statusLabels: Record<UnbanRequestStatus, string> = {
  pending:  '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}

const PAGE_SIZE = 20

export function UnbanRequestListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<UnbanRequest[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<UnbanRequestStatus | 'all'>('pending')
  const [page, setPage] = useState(1)

  const [actionTarget, setActionTarget] = useState<UnbanRequest | null>(null)
  const [actionKind, setActionKind] = useState<'approve' | 'reject'>('approve')
  const [adminResponse, setAdminResponse] = useState('')
  const [actionSaving, setActionSaving] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getUnbanRequests({
        status: statusFilter,
        page,
        page_size: PAGE_SIZE,
      })
      setItems(res.data.results ?? [])
      setTotal(res.data.count ?? 0)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => { fetchItems() }, [fetchItems])

  function openAction(req: UnbanRequest, kind: 'approve' | 'reject') {
    setActionTarget(req)
    setActionKind(kind)
    setAdminResponse('')
  }

  async function submitAction() {
    if (!actionTarget) return
    if (actionKind === 'reject' && !adminResponse.trim()) {
      message.warning('请填写拒绝理由,将通过邮件通知用户')
      return
    }
    setActionSaving(true)
    try {
      await adminApi.resolveUnbanRequest(actionTarget.id, actionKind, adminResponse.trim())
      message.success(actionKind === 'approve' ? '已通过申诉' : '已拒绝申诉')
      setActionTarget(null)
      fetchItems()
    } catch {
      message.error('操作失败')
    } finally {
      setActionSaving(false)
    }
  }

  const columns: ColumnsType<UnbanRequest> = [
    {
      title: '用户',
      dataIndex: 'user',
      width: 220,
      render: (_, r) => (
        <Space>
          <Avatar src={r.user.avatar} icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 500, cursor: 'pointer' }}
                 onClick={() => navigate(`/users/${r.user.id}`)}>
              {r.user.username || r.user.email || r.user.id.slice(0, 8)}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>{r.user.email || '—'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '封禁原因',
      dataIndex: 'user',
      render: (_, r) => (
        <Tooltip title={r.user.ban_reason}>
          <Paragraph style={{ marginBottom: 0, maxWidth: 240 }} ellipsis={{ rows: 2 }}>
            {r.user.ban_reason || '—'}
          </Paragraph>
        </Tooltip>
      ),
    },
    {
      title: '申诉理由',
      dataIndex: 'message',
      render: (msg: string) => (
        <Paragraph style={{ marginBottom: 0, maxWidth: 320 }} ellipsis={{ rows: 3, expandable: true }}>
          {msg}
        </Paragraph>
      ),
    },
    {
      title: '联系邮箱',
      dataIndex: 'contact_email',
      width: 200,
      render: (e: string) => (
        <Space size={4}><MailOutlined /><Text copyable style={{ fontSize: 12 }}>{e}</Text></Space>
      ),
    },
    {
      title: '提交时间',
      dataIndex: 'created_at',
      width: 130,
      render: (t: string) => <Text style={{ fontSize: 12 }}>{dayjs(t).format('YYYY-MM-DD HH:mm')}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: UnbanRequestStatus) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag>,
    },
    {
      title: '操作',
      width: 160,
      render: (_, r) => r.status === 'pending' ? (
        <Space>
          <Button type="primary" size="small" onClick={() => openAction(r, 'approve')}>通过</Button>
          <Button danger size="small" onClick={() => openAction(r, 'reject')}>拒绝</Button>
        </Space>
      ) : (
        <Tooltip title={r.admin_response || '—'}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {r.reviewed_by?.username ?? '—'}
          </Text>
        </Tooltip>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>解封申诉</Title>
        <Space>
          <Select
            value={statusFilter}
            style={{ width: 130 }}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            options={[
              { value: 'pending',  label: '待审核' },
              { value: 'approved', label: '已通过' },
              { value: 'rejected', label: '已拒绝' },
              { value: 'all',      label: '全部' },
            ]}
          />
          <Button onClick={fetchItems}>刷新</Button>
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

      <Modal
        open={!!actionTarget}
        title={actionKind === 'approve' ? '通过申诉' : '拒绝申诉'}
        okText={actionKind === 'approve' ? '通过并解封' : '拒绝'}
        cancelText="取消"
        okButtonProps={{
          danger: actionKind === 'reject',
          loading: actionSaving,
        }}
        onOk={submitAction}
        onCancel={() => setActionTarget(null)}
      >
        {actionTarget && (
          <>
            <Alert
              type={actionKind === 'approve' ? 'success' : 'warning'}
              showIcon
              message={
                actionKind === 'approve'
                  ? `将解除 ${actionTarget.user.username || actionTarget.user.email} 的封禁,并发送通知邮件至 ${actionTarget.contact_email}`
                  : `将拒绝该申诉,并将以下回复发送邮件至 ${actionTarget.contact_email}`
              }
              style={{ marginBottom: 12 }}
            />
            <TextArea
              rows={4}
              maxLength={1000}
              showCount
              placeholder={actionKind === 'approve' ? '可选 — 给用户的额外说明' : '必填 — 拒绝理由'}
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
            />
          </>
        )}
      </Modal>
    </div>
  )
}
