import { useEffect, useState, useCallback } from 'react'
import {
  Table, Button, Image, Space, Typography, Card, Switch,
  Tooltip, Popconfirm, message, Tag, theme,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { ColumnsType } from 'antd/es/table'
import { adminApi } from '../../api/admin'
import type { AdminEvent } from '../../types'

const { Text, Title } = Typography

export function EventListPage() {
  const navigate = useNavigate()
  const { token } = theme.useToken()
  const [items, setItems] = useState<AdminEvent[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminApi.getEvents({ page })
      setItems(res.data.results)
      setTotal(res.data.count)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteEvent(id)
      message.success('活动已删除')
      fetchItems()
    } catch {
      message.error('删除失败')
    }
  }

  const handleToggleActive = async (item: AdminEvent) => {
    try {
      await adminApi.updateEvent(item.id, { is_active: !item.is_active })
      message.success(item.is_active ? '已停用' : '已启用')
      fetchItems()
    } catch {
      message.error('状态更新失败')
    }
  }

  const columns: ColumnsType<AdminEvent> = [
    {
      title: '龙形图标',
      dataIndex: 'dragon_image_url',
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
    { title: '名称', dataIndex: 'name', width: 180 },
    {
      title: '关联商户',
      dataIndex: 'listing_name',
      width: 160,
      render: (name: string | null) => name || <Text type="secondary">未关联</Text>,
    },
    {
      title: '时间',
      key: 'time',
      width: 260,
      render: (_, item) => (
        <Text style={{ fontSize: 12 }}>
          {item.start_at ? new Date(item.start_at).toLocaleString() : '—'}
          {' ~ '}
          {item.end_at ? new Date(item.end_at).toLocaleString() : '—'}
        </Text>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 90,
      render: (_, item) => item.is_live
        ? <Tag color="green">进行中</Tag>
        : item.is_active
          ? <Tag color="default">未开始/已结束</Tag>
          : <Tag color="red">已停用</Tag>,
    },
    { title: '参与人数', dataIndex: 'participant_count', width: 90 },
    {
      title: '启用',
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
            <Button type="text" icon={<EditOutlined />} onClick={() => navigate(`/events/${item.id}/edit`)} />
          </Tooltip>
          <Popconfirm title="确定删除此活动？" onConfirm={() => handleDelete(item.id)} okText="确定" cancelText="取消">
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
        <Title level={4} style={{ margin: 0 }}>活动 / 抽奖</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/events/create')}>
          新建活动
        </Button>
      </div>

      <Card>
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
