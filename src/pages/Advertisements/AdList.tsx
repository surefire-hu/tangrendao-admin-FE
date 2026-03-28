import { useEffect, useState, useCallback } from 'react'
import {
  Table, Button, Tag, Image, Space, Typography, Card, Switch,
  Tooltip, Popconfirm, message, Select, Badge, theme,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { adminApi } from '../../api/admin'
import type { BannerAd } from '../../types'
import dayjs from 'dayjs'

const { Text, Title } = Typography

const positionLabels: Record<string, string> = {
  any: '通用',
  services: '服务页',
  job_detail: '招聘详情',
  restaurant_detail: 'Listing 详情',
  exchange: '汇率',
  permesso: '居留证',
  forum: '论坛',
  forum_detail: '帖子详情',
  passport: '护照',
  local_service_detail: '本地服务详情',
  housing_detail: '房屋详情',
  market_detail: '市场详情',
}

export function AdListPage() {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const [ads, setAds] = useState<BannerAd[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [filterActive, setFilterActive] = useState<boolean | undefined>()
  const [filterPosition, setFilterPosition] = useState<string | undefined>()
  const PAGE_SIZE = 20

  const fetchAds = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getAds({
        page,
        is_active: filterActive,
        position: filterPosition,
      })
      setAds(res.data.results)
      setTotal(res.data.count)
    } finally {
      setLoading(false)
    }
  }, [page, filterActive, filterPosition])

  useEffect(() => { fetchAds() }, [fetchAds])

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteAd(id)
      message.success('横幅已删除')
      fetchAds()
    } catch {
      message.error('删除失败')
    }
  }

  const handleToggleActive = async (ad: BannerAd) => {
    try {
      await adminApi.updateAd(ad.id, { is_active: !ad.is_active })
      message.success(ad.is_active ? '横幅已停用' : '横幅已启用')
      fetchAds()
    } catch {
      message.error('状态更新失败')
    }
  }

  const columns: ColumnsType<BannerAd> = [
    {
      title: '图片',
      dataIndex: 'image_url',
      width: 80,
      render: (url: string | null) =>
        url ? (
          <Image src={url} width={60} height={40} style={{ objectFit: 'cover', borderRadius: 4 }} />
        ) : (
          <div
            style={{
              width: 60, height: 40, background: token.colorFillSecondary,
              borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <EyeOutlined style={{ color: token.colorTextDisabled }} />
          </div>
        ),
    },
    {
      title: '位置',
      dataIndex: 'position',
      render: (p: string) => <Tag>{positionLabels[p] ?? p}</Tag>,
    },
    {
      title: '国家',
      dataIndex: 'country',
      width: 70,
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 80,
      sorter: true,
    },
    {
      title: '展示概率',
      dataIndex: 'display_probability',
      width: 80,
      render: (v: number) => `${v}%`,
    },
    {
      title: '曝光量',
      dataIndex: 'impressions',
      width: 100,
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
        return (
          <Badge
            status={isExpired ? 'error' : 'success'}
            text={<Text style={{ fontSize: 12 }}>{dayjs(d).format('YY-MM-DD')}</Text>}
          />
        )
      },
    },
    {
      title: '启用',
      dataIndex: 'is_active',
      width: 80,
      render: (active: boolean, ad) => (
        <Switch
          size="small"
          checked={active}
          onChange={() => handleToggleActive(ad)}
        />
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, ad) => (
        <Space size={4}>
          <Tooltip title="编辑">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigate(`/advertisements/${ad.id}/edit`)}
            />
          </Tooltip>
          <Popconfirm
            title="确定删除此横幅？"
            onConfirm={() => handleDelete(ad.id)}
            okText="确定"
            cancelText="取消"
          >
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
        <Title level={4} style={{ margin: 0 }}>广告管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/advertisements/create')}>
          新建横幅
        </Button>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="展示位置"
            allowClear
            style={{ width: 180 }}
            value={filterPosition}
            onChange={(v) => { setFilterPosition(v); setPage(1) }}
            options={Object.entries(positionLabels).map(([v, l]) => ({ value: v, label: l }))}
          />
          <Select
            placeholder="状态"
            allowClear
            style={{ width: 120 }}
            value={filterActive !== undefined ? String(filterActive) : undefined}
            onChange={(v) => { setFilterActive(v === undefined ? undefined : v === 'true'); setPage(1) }}
            options={[
              { value: 'true', label: '已启用' },
              { value: 'false', label: '已停用' },
            ]}
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
            showTotal: (t) => `共 ${t} 条横幅`,
          }}
        />
      </Card>
    </div>
  )
}
