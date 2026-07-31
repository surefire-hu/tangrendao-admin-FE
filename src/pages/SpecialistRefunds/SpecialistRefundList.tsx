import { useEffect, useState, useCallback } from 'react'
import {
  Table, Tag, Typography, Card, Select, Space, Button, Avatar, Modal,
  Input, message, Tooltip, Alert,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { UserOutlined, MessageOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { specialistsApi, type SpecialistRefundRequest, type SpecialistRefundStatus } from '../../api/specialists'
import { RequestChatDrawer } from '../../components/specialists/RequestChatDrawer'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const statusColors: Record<SpecialistRefundStatus, string> = {
  pending:  'orange',
  approved: 'green',
  rejected: 'red',
}
const statusLabels: Record<SpecialistRefundStatus, string> = {
  pending:  '待审核',
  approved: '已通过',
  rejected: '已拒绝',
}

const PAGE_SIZE = 20

export function SpecialistRefundListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<SpecialistRefundRequest[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<SpecialistRefundStatus | 'all'>('pending')
  const [page, setPage] = useState(1)

  const [actionTarget, setActionTarget] = useState<SpecialistRefundRequest | null>(null)
  const [actionKind, setActionKind] = useState<'approve' | 'reject'>('approve')
  const [adminNote, setAdminNote] = useState('')
  const [actionSaving, setActionSaving] = useState(false)

  const [chatRequestId, setChatRequestId] = useState<string | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await specialistsApi.listRefundRequests({
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

  function openAction(req: SpecialistRefundRequest, kind: 'approve' | 'reject') {
    setActionTarget(req)
    setActionKind(kind)
    setAdminNote('')
  }

  async function submitAction() {
    if (!actionTarget) return
    if (actionKind === 'reject' && !adminNote.trim()) {
      message.warning('请填写拒绝理由，将通过通知发送给用户')
      return
    }
    setActionSaving(true)
    try {
      await specialistsApi.resolveRefundRequest(actionTarget.id, actionKind, adminNote.trim())
      message.success(actionKind === 'approve' ? '已通过退款申请' : '已拒绝退款申请')
      setActionTarget(null)
      fetchItems()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '操作失败')
    } finally {
      setActionSaving(false)
    }
  }

  const columns: ColumnsType<SpecialistRefundRequest> = [
    {
      title: '用户',
      width: 200,
      render: (_, r) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 500, cursor: 'pointer' }}
                 onClick={() => navigate(`/users/${r.user}`)}>
              {r.user_username || r.user_email || r.user.slice(0, 8)}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>{r.user_email || '—'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: '专家',
      width: 140,
      render: (_, r) => r.request.specialist?.full_name || r.request.specialist?.username || '—',
    },
    {
      title: '分类',
      width: 100,
      render: (_, r) => <Tag>{r.request.category.name_zh}</Tag>,
    },
    {
      title: '申请理由',
      dataIndex: 'reason',
      render: (msg: string) => (
        <Paragraph style={{ marginBottom: 0, maxWidth: 300 }} ellipsis={{ rows: 3, expandable: true }}>
          {msg}
        </Paragraph>
      ),
    },
    {
      title: '评分',
      width: 90,
      render: (_, r) => r.request.rating ? `⭐ ${r.request.rating}` : '—',
    },
    {
      title: '金额',
      width: 170,
      render: (_, r) => (
        <div style={{ fontSize: 12 }}>
          <div>退用户：{r.refund_amount === 0 && r.request.is_free_trial ? '0（免费首单）' : `${r.refund_amount} 🍬`}</div>
          <div>扣专家：{r.specialist_deduction} 🍬</div>
        </div>
      ),
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      width: 130,
      render: (t: string) => <Text style={{ fontSize: 12 }}>{dayjs(t).format('YYYY-MM-DD HH:mm')}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: SpecialistRefundStatus) => <Tag color={statusColors[s]}>{statusLabels[s]}</Tag>,
    },
    {
      title: '操作',
      width: 190,
      render: (_, r) => (
        <Space direction="vertical" size={4}>
          <Button size="small" icon={<MessageOutlined />} onClick={() => setChatRequestId(r.request.id)}>
            查看聊天
          </Button>
          {r.status === 'pending' ? (
            <Space size={4}>
              <Button type="primary" size="small" onClick={() => openAction(r, 'approve')}>通过</Button>
              <Button danger size="small" onClick={() => openAction(r, 'reject')}>拒绝</Button>
            </Space>
          ) : (
            <Tooltip title={r.admin_note || '—'}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {r.reviewed_by_username ?? '—'}
              </Text>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>专家咨询退款申请</Title>
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
        title={actionKind === 'approve' ? '通过退款申请' : '拒绝退款申请'}
        okText={actionKind === 'approve' ? '通过并退款' : '拒绝'}
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
                  ? (actionTarget.request.is_free_trial
                      ? `此次咨询为免费首单，用户未付费，通过后仅从专家账户扣除已发放的 ${actionTarget.specialist_deduction} 🍬。`
                      : `将退还 ${actionTarget.refund_amount} 🍬 给用户，并从专家账户扣除 ${actionTarget.specialist_deduction} 🍬（专家实际收到的部分），并发送通知。`)
                  : '将拒绝该申请，并发送以下回复通知给用户。'
              }
              style={{ marginBottom: 12 }}
            />
            <TextArea
              rows={4}
              maxLength={500}
              showCount
              placeholder={actionKind === 'approve' ? '可选 — 给用户的额外说明' : '必填 — 拒绝理由'}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
            />
          </>
        )}
      </Modal>

      <RequestChatDrawer requestId={chatRequestId} onClose={() => setChatRequestId(null)} />
    </div>
  )
}
