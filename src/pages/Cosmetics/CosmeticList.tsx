import { useEffect, useState, useCallback } from 'react'
import {
  Table, Button, Image, Space, Typography, Card, Switch,
  Tooltip, Popconfirm, message, Select, Tag, theme,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { adminApi } from '../../api/admin'
import type { Cosmetic } from '../../types'

const { Text, Title } = Typography

const KIND_LABEL: Record<string, string> = { frame: '头像框', background: '聊天背景' }
const ACQUIRE_LABEL: Record<string, string> = {
  coin: '金币购买', candy: '糖果购买', rent_coin: '金币租用', rent_candy: '糖果租用', event: '活动获得',
}
const ACQUIRE_COLOR: Record<string, string> = {
  coin: 'gold', candy: 'magenta', rent_coin: 'blue', rent_candy: 'purple', event: 'green',
}

export function CosmeticListPage() {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const [items, setItems] = useState<Cosmetic[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [kindFilter, setKindFilter] = useState<string | undefined>()
  const PAGE_SIZE = 20

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getCosmetics({ page, kind: kindFilter })
      setItems(res.data.results)
      setTotal(res.data.count)
    } finally {
      setLoading(false)
    }
  }, [page, kindFilter])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteCosmetic(id)
      message.success('装扮已删除')
      fetchItems()
    } catch {
      message.error('删除失败')
    }
  }

  const handleToggleActive = async (item: Cosmetic) => {
    try {
      await adminApi.updateCosmetic(item.id, { is_active: !item.is_active })
      message.success(item.is_active ? '已下架' : '已上架')
      fetchItems()
    } catch {
      message.error('状态更新失败')
    }
  }

  const columns: ColumnsType<Cosmetic> = [
    {
      title: '图片',
      dataIndex: 'image_url',
      width: 70,
      render: (url: string | null) =>
        url ? (
          <Image src={url} width={48} height={48} style={{ objectFit: 'contain', borderRadius: 4, background: token.colorFillTertiary }} />
        ) : (
          <div style={{
            width: 48, height: 48, background: token.colorFillSecondary,
            borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PictureOutlined style={{ color: token.colorTextDisabled }} />
          </div>
        ),
    },
    { title: '名称', dataIndex: 'name', width: 160 },
    {
      title: '类型',
      dataIndex: 'kind',
      width: 100,
      render: (k: string) => <Tag>{KIND_LABEL[k] ?? k}</Tag>,
    },
    {
      title: '获取方式',
      dataIndex: 'acquire_type',
      width: 130,
      render: (t: string) => <Tag color={ACQUIRE_COLOR[t]}>{ACQUIRE_LABEL[t] ?? t}</Tag>,
    },
    {
      title: '价格',
      key: 'price',
      width: 120,
      render: (_, item) => {
        if (item.acquire_type === 'event') return <Text type="secondary">—</Text>
        const unit = item.acquire_type.includes('candy') ? '糖果' : '金币'
        const rental = item.acquire_type.startsWith('rent_')
        return <Text>{item.price} {unit}{rental ? ` / ${item.rent_days ?? '?'} 天` : ''}</Text>
      },
    },
    { title: '拥有人数', dataIndex: 'owner_count', width: 90 },
    { title: '排序', dataIndex: 'sort_order', width: 70 },
    {
      title: '上架',
      dataIndex: 'is_active',
      width: 70,
      render: (active: boolean, item) => <Switch size="small" checked={active} onChange={() => handleToggleActive(item)} />,
    },
    {
      title: '',
      key: 'actions',
      width: 80,
      render: (_, item) => (
        <Space size={4}>
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} onClick={() => navigate(`/cosmetics/${item.id}/edit`)} />
          </Tooltip>
          <Popconfirm title="确定删除此装扮？" onConfirm={() => handleDelete(item.id)} okText="确定" cancelText="取消">
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
        <Title level={4} style={{ margin: 0 }}>头像框 / 聊天背景</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/cosmetics/create')}>
          新建装扮
        </Button>
      </div>

      <Card>
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="类型"
            allowClear
            style={{ width: 140 }}
            value={kindFilter}
            onChange={(v) => { setKindFilter(v); setPage(1) }}
            options={[{ value: 'frame', label: '头像框' }, { value: 'background', label: '聊天背景' }]}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={items}
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
