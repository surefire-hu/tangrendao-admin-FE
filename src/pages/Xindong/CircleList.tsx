import { useEffect, useState } from 'react'
import { Table, Button, Space, Switch, Popconfirm, Typography, message, Tooltip, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import type { XindongCircle } from '../../types'

const { Title } = Typography

export function CircleListPage() {
  const navigate = useNavigate()
  const [items, setItems] = useState<XindongCircle[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await adminApi.getXindongCircles()
      setItems(res.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function toggleField(id: number, field: 'is_active' | 'is_default', val: boolean) {
    await adminApi.updateXindongCircle(id, { [field]: val })
    setItems(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c))
  }

  async function deleteCircle(id: number) {
    await adminApi.deleteXindongCircle(id)
    message.success('已删除')
    load()
  }

  const columns = [
    {
      title: '图标',
      dataIndex: 'icon',
      width: 64,
      render: (icon: string) => (
        <div style={{
          width: 44, height: 44, borderRadius: 12, background: '#F3DEDA',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
        }}>{icon}</div>
      ),
    },
    {
      title: '名称 / 描述',
      render: (_: unknown, r: XindongCircle) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontWeight: 600 }}>{r.name}</span>
          {r.description && <span style={{ fontSize: 12, color: '#888' }}>{r.description}</span>}
        </Space>
      ),
    },
    {
      title: '成员数',
      dataIndex: 'member_count',
      width: 90,
      sorter: (a: XindongCircle, b: XindongCircle) => b.member_count - a.member_count,
    },
    {
      title: '默认圈子',
      dataIndex: 'is_default',
      width: 90,
      render: (val: boolean, r: XindongCircle) => (
        <Switch size="small" checked={val} onChange={v => toggleField(r.id, 'is_default', v)} />
      ),
    },
    {
      title: '启用',
      dataIndex: 'is_active',
      width: 72,
      render: (val: boolean, r: XindongCircle) => (
        <Switch size="small" checked={val} onChange={v => toggleField(r.id, 'is_active', v)} />
      ),
    },
    {
      title: '操作',
      width: 100,
      render: (_: unknown, r: XindongCircle) => (
        <Space>
          <Tooltip title="编辑">
            <Button size="small" icon={<EditOutlined />} onClick={() => navigate(`/xindong/circles/${r.id}/edit`)} />
          </Tooltip>
          <Popconfirm title="确认删除？" onConfirm={() => deleteCircle(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Title level={4} style={{ margin: 0 }}>圈子管理</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/xindong/circles/create')}>
          新建圈子
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={items}
        loading={loading}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }}
        size="middle"
      />

      {items.length === 0 && !loading && (
        <Tag style={{ marginTop: 8 }}>还没有圈子 — 点击右上角新建一个默认圈子</Tag>
      )}
    </div>
  )
}
