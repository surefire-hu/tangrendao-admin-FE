import { useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { Modal, Table, Select, Space, Avatar, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  UserOutlined, WechatOutlined, AlipayCircleOutlined, AppleOutlined, MobileOutlined, GlobalOutlined,
} from '@ant-design/icons'
import { adminApi } from '../api/admin'
import { mediaUrl } from '../api/client'
import type { RevenueTransaction, DashboardPeriod } from '../types'

const { Text } = Typography

const PROVIDER_INFO: Record<string, { label: string; icon: ReactNode }> = {
  wechat: { label: '微信支付', icon: <WechatOutlined /> },
  alipay: { label: '支付宝', icon: <AlipayCircleOutlined /> },
  apple:  { label: 'Apple Pay', icon: <AppleOutlined /> },
}

// Platform lives only here (not as its own dashboard card) since it's really
// a footnote on the payment method — Apple Pay orders are ~always iOS, so a
// separate iOS-vs-Android/web breakdown next to the 3 provider cards was
// mostly restating the same split under a different name.
const PLATFORM_INFO: Record<string, { label: string; icon: ReactNode }> = {
  ios:     { label: 'iOS', icon: <MobileOutlined /> },
  default: { label: '安卓 / 网页', icon: <GlobalOutlined /> },
}

const PROVIDER_OPTIONS = [
  { value: '', label: '全部支付方式' },
  { value: 'wechat', label: '微信支付' },
  { value: 'alipay', label: '支付宝' },
  { value: 'apple', label: 'Apple Pay' },
]

interface Props {
  open: boolean
  period: DashboardPeriod
  /** Currencies known to have orders in this period (from RevenueStats.by_currency) — filter options. */
  currencies: string[]
  onClose: () => void
}

/** Per-order drill-down behind the dashboard's "真实收入" card — every paid
 * order in its own native currency (the card itself only shows the EUR
 * total), filterable by currency/payment method, with which user paid. */
export function RevenueTransactionsModal({ open, period, currencies, onClose }: Props) {
  const [items, setItems]     = useState<RevenueTransaction[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage]       = useState(1)
  const [currency, setCurrency] = useState('')
  const [provider, setProvider] = useState('')

  const load = useCallback((p: number, c: string, pr: string) => {
    setLoading(true)
    adminApi.getRevenueTransactions({
      period,
      currency: c || undefined,
      provider: (pr || undefined) as 'wechat' | 'alipay' | 'apple' | undefined,
      page: p,
      page_size: 20,
    })
      .then((res) => { setItems(res.data.results); setTotal(res.data.count) })
      .finally(() => setLoading(false))
  }, [period])

  useEffect(() => {
    if (!open) return
    setPage(1)
    setCurrency('')
    setProvider('')
    load(1, '', '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, period])

  const columns: ColumnsType<RevenueTransaction> = [
    {
      title: '用户',
      key: 'user',
      render: (_, t) => (
        <Space>
          <Avatar src={mediaUrl(t.user.avatar)} icon={<UserOutlined />} size={32} />
          <div>
            <div><Text strong style={{ fontSize: 12 }}>{t.user.display}</Text></div>
            {t.user.tangren_id && (
              <Text type="secondary" style={{ fontSize: 11 }}>唐人号：{t.user.tangren_id}</Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: '金额',
      key: 'amount',
      render: (_, t) => <Text strong>{t.amount} {t.currency}</Text>,
      width: 110,
    },
    { title: '糖果', dataIndex: 'candy_amount', width: 70 },
    {
      title: '支付方式',
      dataIndex: 'provider',
      render: (v: string) => (
        <Space size={4}>{PROVIDER_INFO[v]?.icon}<Text>{PROVIDER_INFO[v]?.label ?? v}</Text></Space>
      ),
      width: 120,
    },
    {
      title: '平台',
      dataIndex: 'platform',
      render: (v: string) => (
        <Space size={4}>{PLATFORM_INFO[v]?.icon}<Text>{PLATFORM_INFO[v]?.label ?? v}</Text></Space>
      ),
      width: 110,
    },
    {
      title: '时间',
      dataIndex: 'paid_at',
      render: (v: string | null) => v ? new Date(v).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' }) : '—',
      width: 130,
    },
  ]

  const currencyOptions = [
    { value: '', label: '全部币种' },
    ...currencies.map((c) => ({ value: c, label: c })),
  ]

  return (
    <Modal open={open} onCancel={onClose} footer={null} title="交易明细" width={860}>
      <Space style={{ marginBottom: 12 }}>
        <Select
          value={currency}
          style={{ width: 140 }}
          options={currencyOptions}
          onChange={(v) => { setCurrency(v); setPage(1); load(1, v, provider) }}
        />
        <Select
          value={provider}
          style={{ width: 150 }}
          options={PROVIDER_OPTIONS}
          onChange={(v) => { setProvider(v); setPage(1); load(1, currency, v) }}
        />
      </Space>
      <Table
        dataSource={items}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: (p) => { setPage(p); load(p, currency, provider) },
          showTotal: (t) => `共 ${t} 笔`,
        }}
      />
    </Modal>
  )
}
