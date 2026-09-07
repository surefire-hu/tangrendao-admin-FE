import { useEffect, useRef, useState, useCallback } from 'react'
import {
  Table, Tag, Typography, Card, Select, Space, Button, Avatar, Image, Modal, Input,
  message, Popconfirm, Tooltip, theme, Spin,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { ShopOutlined, UserOutlined, PhoneOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import type { ListingClaim, ListingClaimStatus, Listing, AdminUser } from '../../types'
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

  // ── Direct owner assign/transfer — admin-side 认领, no claim request
  //    needed. Also the only way to move an already-claimed listing to a
  //    different owner (the request-based flow above only ever matches a
  //    bot-owned listing to its own requester).
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignListingId, setAssignListingId] = useState<string | undefined>()
  const [assignUserId, setAssignUserId] = useState<string | undefined>()
  const [listingOptions, setListingOptions] = useState<Listing[]>([])
  const [listingSearching, setListingSearching] = useState(false)
  const [userOptions, setUserOptions] = useState<AdminUser[]>([])
  const [userSearching, setUserSearching] = useState(false)
  const listingSearchTimer = useRef<ReturnType<typeof setTimeout>>()
  const userSearchTimer = useRef<ReturnType<typeof setTimeout>>()

  const openAssign = () => {
    setAssignListingId(undefined)
    setAssignUserId(undefined)
    setListingOptions([])
    setUserOptions([])
    setAssignOpen(true)
  }

  function searchListings(q: string) {
    clearTimeout(listingSearchTimer.current)
    listingSearchTimer.current = setTimeout(async () => {
      setListingSearching(true)
      try {
        const res = await adminApi.getListings({ search: q, page_size: 20 })
        setListingOptions(res.data.results)
      } catch {
        /* silent */
      } finally {
        setListingSearching(false)
      }
    }, 350)
  }

  function searchUsers(q: string) {
    clearTimeout(userSearchTimer.current)
    userSearchTimer.current = setTimeout(async () => {
      setUserSearching(true)
      try {
        const res = await adminApi.getUsers({ search: q, page_size: 20 })
        setUserOptions(res.data.results)
      } catch {
        /* silent */
      } finally {
        setUserSearching(false)
      }
    }, 350)
  }

  const submitAssign = async () => {
    if (!assignListingId || !assignUserId) return
    setAssignLoading(true)
    try {
      const res = await adminApi.assignListingOwner(assignListingId, assignUserId)
      const listingName = listingOptions.find(l => l.id === assignListingId)?.name || '该商家'
      message.success(`已将「${listingName}」分配给 ${res.data.owner_name}`)
      setAssignOpen(false)
      fetchItems()
    } catch (e: any) {
      message.error(e?.response?.data?.error || '分配失败')
    } finally {
      setAssignLoading(false)
    }
  }

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
          <Button type="primary" onClick={openAssign}>直接分配所有者</Button>
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

      <Modal
        title="直接分配所有者"
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={submitAssign}
        okText="确认分配"
        cancelText="取消"
        okButtonProps={{ loading: assignLoading, disabled: !assignListingId || !assignUserId }}
      >
        <Text type="secondary">
          无需等待用户提交认领申请，直接把某个商家分配给任意用户——也是唯一能把一个
          <strong>已经</strong>认领过的商家转让给另一个用户的方式。
        </Text>

        <div style={{ marginTop: 16 }}>
          <Text>商家：</Text>
          <Select
            showSearch
            filterOption={false}
            style={{ width: '100%', marginTop: 6 }}
            placeholder="搜索商家名称…"
            value={assignListingId}
            onSearch={searchListings}
            onChange={setAssignListingId}
            loading={listingSearching}
            notFoundContent={listingSearching ? <Spin size="small" /> : '请输入关键词搜索'}
            options={listingOptions.map(l => ({
              value: l.id,
              label: (
                <Space>
                  {(l.cover_url || l.thumbnail_url) ? (
                    <Image
                      src={l.cover_url || l.thumbnail_url || ''}
                      width={24} height={24}
                      style={{ borderRadius: 4, objectFit: 'cover' }}
                      preview={false}
                    />
                  ) : (
                    <Avatar shape="square" size={24} icon={<ShopOutlined />} />
                  )}
                  <span>{l.name}</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>{l.city}</Text>
                </Space>
              ),
            }))}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <Text>新所有者：</Text>
          <Select
            showSearch
            filterOption={false}
            style={{ width: '100%', marginTop: 6 }}
            placeholder="搜索用户邮箱/用户名/唐人ID…"
            value={assignUserId}
            onSearch={searchUsers}
            onChange={setAssignUserId}
            loading={userSearching}
            notFoundContent={userSearching ? <Spin size="small" /> : '请输入关键词搜索'}
            options={userOptions.map(u => ({
              value: u.id,
              label: (
                <Space>
                  {u.avatar ? <Avatar src={u.avatar} size={24} /> : <Avatar icon={<UserOutlined />} size={24} />}
                  <span>{u.first_name || u.username || u.email || u.id}</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>{u.email}</Text>
                </Space>
              ),
            }))}
          />
        </div>
      </Modal>
    </Card>
  )
}
