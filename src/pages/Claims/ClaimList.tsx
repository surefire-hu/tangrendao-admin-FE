import { useEffect, useState, useCallback } from 'react'
import {
  Table, Tag, Typography, Card, Select, Space, Button, Avatar, Image, Modal, Input,
  message, Popconfirm, Tooltip, theme,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ShopOutlined, UserOutlined, PhoneOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import type { ListingClaim, ListingClaimStatus } from '../../types'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const { Title, Text } = Typography
const { TextArea } = Input

const statusColors: Record<ListingClaimStatus, string> = {
  pending:  'orange',
  matched:  'green',
  rejected: 'red',
}
const statusLabels: Record<ListingClaimStatus, string> = {
  pending:  '待审核',
  matched:  '已匹配',
  rejected: '已拒绝',
}

const PAGE_SIZE = 20

export function ClaimListPage() {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const [items, setItems] = useState<ListingClaim[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<ListingClaimStatus | undefined>('pending')
  const [page, setPage] = useState(1)

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<ListingClaim | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectLoading, setRejectLoading] = useState(false)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getListingClaims({
        page,
        page_size: PAGE_SIZE,
        status: statusFilter,
      })
      setItems(res.data.results)
      setTotal(res.data.count)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleMatch = async (claim: ListingClaim) => {
    try {
      await adminApi.matchListingClaim(claim.id)
      message.success(`已将「${claim.listing.name}」分配给 ${claim.requester.display}`)
      fetchItems()
    } catch (e: any) {
      message.error(e?.response?.data?.error || '匹配失败')
    }
  }

  const openReject = (claim: ListingClaim) => {
    setRejectTarget(claim)
    setRejectReason('')
    setRejectOpen(true)
  }

  const submitReject = async () => {
    if (!rejectTarget) return
    setRejectLoading(true)
    try {
      await adminApi.rejectListingClaim(rejectTarget.id, rejectReason.trim())
      message.success('已拒绝该申请')
      setRejectOpen(false)
      setRejectTarget(null)
      fetchItems()
    } catch (e: any) {
      message.error(e?.response?.data?.error || '拒绝失败')
    } finally {
      setRejectLoading(false)
    }
  }

  const columns: ColumnsType<ListingClaim> = [
    {
      title: '商家',
      key: 'listing',
      width: 260,
      render: (_, row) => (
        <Space>
          {row.listing.cover ? (
            <Image
              src={row.listing.cover}
              width={48}
              height={48}
              style={{ borderRadius: 6, objectFit: 'cover' }}
              preview={false}
            />
          ) : (
            <Avatar shape="square" size={48} icon={<ShopOutlined />} />
          )}
          <div>
            <a onClick={() => navigate(`/publications/listing/${row.listing.id}`)}>
              <Text strong>{row.listing.name}</Text>
            </a>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>{row.listing.city || '—'}</Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '申请人',
      key: 'requester',
      width: 220,
      render: (_, row) => (
        <Space>
          {row.requester.avatar ? (
            <Avatar src={row.requester.avatar} />
          ) : (
            <Avatar icon={<UserOutlined />} />
          )}
          <div>
            <a onClick={() => navigate(`/users/${row.requester.id}`)}>{row.requester.display}</a>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>@{row.requester.username}</Text>
            </div>
          </div>
        </Space>
      ),
    },
    {
      title: '认领电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      render: (v: string) => (
        <Space>
          <PhoneOutlined style={{ color: token.colorPrimary }} />
          <Text copyable>{v}</Text>
        </Space>
      ),
    },
    {
      title: '备注',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
      render: (v: string) => v
        ? <Tooltip title={v}><span>{v}</span></Tooltip>
        : <Text type="secondary">—</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: ListingClaimStatus, row) => (
        <Tooltip title={s === 'rejected' && row.rejection_reason ? row.rejection_reason : undefined}>
          <Tag color={statusColors[s]}>{statusLabels[s]}</Tag>
        </Tooltip>
      ),
    },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (v: string) => (
        <Tooltip title={dayjs(v).format('YYYY-MM-DD HH:mm')}>
          <Text>{dayjs(v).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_, row) => {
        if (row.status !== 'pending') {
          return <Text type="secondary">已处理</Text>
        }
        return (
          <Space>
            <Popconfirm
              title="确认匹配?"
              description={`将「${row.listing.name}」分配给 ${row.requester.display}`}
              okText="确认"
              cancelText="取消"
              onConfirm={() => handleMatch(row)}
            >
              <Button type="primary" size="small">匹配</Button>
            </Popconfirm>
            <Button size="small" danger onClick={() => openReject(row)}>拒绝</Button>
          </Space>
        )
      },
    },
  ]

  return (
    <Card>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>商家认领</Title>
        <Space>
          <Select
            allowClear
            placeholder="全部状态"
            value={statusFilter}
            style={{ width: 140 }}
            onChange={(v) => { setStatusFilter(v); setPage(1) }}
            options={[
              { value: 'pending',  label: '待审核' },
              { value: 'matched',  label: '已匹配' },
              { value: 'rejected', label: '已拒绝' },
            ]}
          />
          <Button onClick={() => fetchItems()}>刷新</Button>
        </Space>
      </div>

      <Table<ListingClaim>
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        scroll={{ x: 1100 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />

      <Modal
        title="拒绝认领申请"
        open={rejectOpen}
        onCancel={() => setRejectOpen(false)}
        onOk={submitReject}
        okText="确认拒绝"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: rejectLoading }}
      >
        <Text>申请人：<strong>{rejectTarget?.requester.display}</strong></Text>
        <br />
        <Text>商家：<strong>{rejectTarget?.listing.name}</strong></Text>
        <div style={{ marginTop: 12 }}>
          <Text>拒绝原因（可选，将记录在申请记录中）:</Text>
          <TextArea
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="例如：电话核实未通过 / 无法证明身份"
            style={{ marginTop: 6 }}
          />
        </div>
      </Modal>
    </Card>
  )
}
