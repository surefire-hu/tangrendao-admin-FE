import { useEffect, useState, useCallback } from 'react'
import {
  Table, Button, Image, Space, Typography, Card, Switch,
  Tooltip, Popconfirm, message, Select, Badge, theme, InputNumber,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, SaveOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { adminApi } from '../../api/admin'
import type { SplashAd } from '../../types'
import dayjs from 'dayjs'

const { Text, Title } = Typography

export function SplashListPage() {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const [ads, setAds] = useState<SplashAd[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [filterActive, setFilterActive] = useState<boolean | undefined>()
  const PAGE_SIZE = 20

  // Frequency-per-day config for the whole 开屏广告 type
  const [freq, setFreq] = useState<number>(1)
  const [freqDirty, setFreqDirty] = useState(false)
  const [savingFreq, setSavingFreq] = useState(false)

  const fetchAds = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getSplashAds({ page, is_active: filterActive })
      setAds(res.data.results)
      setTotal(res.data.count)
    } finally {
      setLoading(false)
    }
  }, [page, filterActive])

  useEffect(() => { fetchAds() }, [fetchAds])

  useEffect(() => {
    adminApi.getSplashConfig().then((r) => setFreq(r.data.frequency_per_day)).catch(() => {})
  }, [])

  const saveFreq = async () => {
    setSavingFreq(true)
    try {
      await adminApi.updateSplashConfig({ frequency_per_day: freq })
      message.success('展示频率已保存')
      setFreqDirty(false)
    } catch {
      message.error('保存失败')
    } finally {
      setSavingFreq(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteSplashAd(id)
      message.success('开屏广告已删除')
      fetchAds()
    } catch {
      message.error('删除失败')
    }
  }

  const handleToggleActive = async (ad: SplashAd) => {
    try {
      await adminApi.updateSplashAd(ad.id, { is_active: !ad.is_active })
      message.success(ad.is_active ? '已停用' : '已启用')
      fetchAds()
    } catch {
      message.error('状态更新失败')
    }
  }

  const columns: ColumnsType<SplashAd> = [
    {
      title: '图片',
      dataIndex: 'image_url',
      width: 70,
      render: (url: string | null) =>
        url ? (
          <Image src={url} width={44} height={64} style={{ objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <div style={{
            width: 44, height: 64, background: token.colorFillSecondary,
            borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <EyeOutlined style={{ color: token.colorTextDisabled }} />
          </div>
        ),
    },
    { title: '按钮文字', dataIndex: 'cta_label', width: 110, render: (v: string) => <Text>{v || '—'}</Text> },
    { title: '国家', dataIndex: 'country', width: 70 },
    { title: '优先级', dataIndex: 'priority', width: 80, sorter: true },
    { title: '展示概率', dataIndex: 'display_probability', width: 80, render: (v: number) => `${v}%` },
    { title: '曝光量', dataIndex: 'impressions', width: 90, render: (v: number) => v.toLocaleString() },
    { title: '点击量', dataIndex: 'clicks', width: 80, render: (v: number) => v.toLocaleString() },
    {
      title: '点击率',
      key: 'ctr',
      width: 80,
      render: (_, ad) => {
        const ctr = ad.impressions > 0 ? (ad.clicks / ad.impressions * 100).toFixed(1) : '0.0'
        return <Text style={{ color: parseFloat(ctr) > 2 ? token.colorSuccess : undefined }}>{ctr}%</Text>
      },
    },
    {
      title: '到期时间',
      dataIndex: 'end_date',
      width: 110,
      render: (d: string | null) => {
        if (!d) return <Text type="secondary">—</Text>
        const isExpired = dayjs(d).isBefore(dayjs())
        return <Badge status={isExpired ? 'error' : 'success'} text={<Text style={{ fontSize: 12 }}>{dayjs(d).format('YY-MM-DD')}</Text>} />
      },
    },
    {
      title: '启用',
      dataIndex: 'is_active',
      width: 70,
      render: (active: boolean, ad) => <Switch size="small" checked={active} onChange={() => handleToggleActive(ad)} />,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, ad) => (
        <Space size={4}>
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} onClick={() => navigate(`/splash/${ad.id}/edit`)} />
          </Tooltip>
          <Popconfirm title="确定删除此开屏广告？" onConfirm={() => handleDelete(ad.id)} okText="确定" cancelText="取消">
            <Tooltip title="删除">
              <Button type="text" danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Title level={4} style={{ margin: 0 }}>开屏广告</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/splash/create')}>
          新建开屏广告
        </Button>
      </div>

      <Card style={{ marginBottom: 16 }} size="small">
        <Space align="center" wrap>
          <Text strong>每位用户每天最多展示</Text>
          <InputNumber
            min={0}
            max={50}
            value={freq}
            onChange={(v) => { setFreq(Number(v ?? 0)); setFreqDirty(true) }}
            style={{ width: 90 }}
          />
          <Text type="secondary">次（0 = 关闭开屏广告，1 = 每天一次）</Text>
          <Button type="primary" icon={<SaveOutlined />} disabled={!freqDirty} loading={savingFreq} onClick={saveFreq}>
            保存频率
          </Button>
        </Space>
      </Card>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            value={filterActive !== undefined ? String(filterActive) : undefined}
            onChange={(v) => { setFilterActive(v === undefined ? undefined : v === 'true'); setPage(1) }}
            options={[{ value: 'true', label: '已启用' }, { value: 'false', label: '已停用' }]}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={ads}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: setPage,
            showSizeChanger: false,
            showTotal: (t) => `共 ${t} 条`,
          }}
        />
      </Card>
    </div>
  )
}
