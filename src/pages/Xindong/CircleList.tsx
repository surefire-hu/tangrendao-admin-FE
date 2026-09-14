import { useEffect, useState } from 'react'
import {
  Table, Button, Space, Switch, Popconfirm, Typography, message, Tooltip, Tag,
  Modal, Form, Input,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { adminApi } from '../../api/admin'
import type { XindongCircle, XindongCircleInput } from '../../types'

const { Title } = Typography

const ICON_PRESETS = [
  '💓', '🇮🇹', '💪', '🎬', '🍜', '🚗', '🐾', '✈️',
  '📷', '🎵', '☕', '📚', '⚽', '🎨', '🎮', '🍷',
]

type EditTarget = { mode: 'create' } | { mode: 'edit'; data: XindongCircle } | null

export function CircleListPage() {
  const [items, setItems] = useState<XindongCircle[]>([])
  const [loading, setLoading] = useState(true)

  const [target, setTarget] = useState<EditTarget>(null)
  const [form] = Form.useForm()
  const [icon, setIcon] = useState('💓')
  const [saving, setSaving] = useState(false)

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

  function openCreate() {
    form.resetFields()
    setIcon('💓')
    setTarget({ mode: 'create' })
  }

  function openEdit(c: XindongCircle) {
    form.setFieldsValue({ name: c.name, description: c.description, is_default: c.is_default, is_active: c.is_active })
    setIcon(c.icon || '💓')
    setTarget({ mode: 'edit', data: c })
  }

  async function handleSubmit() {
    const values = await form.validateFields()
    const payload: XindongCircleInput = { ...values, icon }
    setSaving(true)
    try {
      if (target?.mode === 'edit') {
        await adminApi.updateXindongCircle(target.data.id, payload)
        message.success('圈子已更新')
      } else {
        await adminApi.createXindongCircle(payload)
        message.success('圈子已创建')
      }
      setTarget(null)
      load()
    } catch {
      message.error('保存失败，请检查所有字段')
    } finally {
      setSaving(false)
    }
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
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
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
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
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

      <Modal
        open={!!target}
        onCancel={() => setTarget(null)}
        onOk={handleSubmit}
        confirmLoading={saving}
        title={target?.mode === 'edit' ? '编辑圈子' : '新建圈子'}
        destroyOnClose
      >
        <Space direction="vertical" size={12} style={{ width: '100%', marginBottom: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18, background: '#F3DEDA',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
          }}>
            {icon}
          </div>
          <Input value={icon} onChange={e => setIcon(e.target.value)} maxLength={8} style={{ width: 120 }} placeholder="输入 emoji" />
          <Space wrap size={8}>
            {ICON_PRESETS.map(p => (
              <Button
                key={p}
                shape="circle"
                size="large"
                onClick={() => setIcon(p)}
                style={{ fontSize: 18, borderColor: icon === p ? '#B84C6B' : undefined, borderWidth: icon === p ? 2 : 1 }}
              >{p}</Button>
            ))}
          </Space>
        </Space>

        <Form form={form} layout="vertical" initialValues={{ is_default: false, is_active: true }}>
          <Form.Item name="name" label="圈子名称" rules={[{ required: true, message: '请填写圈子名称' }]}>
            <Input placeholder="如：旅行搭子" maxLength={40} />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="简单介绍一下这个圈子" maxLength={200} rows={3} />
          </Form.Item>
          <Form.Item name="is_default" label="默认圈子" valuePropName="checked" extra="默认圈子会在首页优先展示">
            <Switch />
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
