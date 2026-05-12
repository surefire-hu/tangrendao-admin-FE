import { useEffect, useState } from 'react'
import {
  Card, Button, Space, Table, Modal, Form, Input, InputNumber,
  Typography, Empty, Spin, Popconfirm, message, Tag, Collapse, Tooltip,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  FolderOpenOutlined, AppstoreOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { adminApi } from '../../api/admin'
import type {
  NavCategory, NavSection, NavItem,
  NavCategoryInput, NavSectionInput, NavItemInput,
} from '../../types'

const { Title, Text } = Typography

type EditTarget =
  | { kind: 'category'; mode: 'create' } | { kind: 'category'; mode: 'edit'; data: NavCategory }
  | { kind: 'section';  mode: 'create'; categoryId: number } | { kind: 'section'; mode: 'edit'; data: NavSection; categoryId: number }
  | { kind: 'item';     mode: 'create'; sectionId: number }  | { kind: 'item';    mode: 'edit'; data: NavItem;    sectionId: number }
  | null

export function NavigationPage() {
  const [data, setData] = useState<NavCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [target, setTarget] = useState<EditTarget>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getNavigation()
      setData(res.data)
    } catch (e) {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!target) return
    if (target.mode === 'edit') {
      form.setFieldsValue(target.data as any)
    } else {
      form.resetFields()
      form.setFieldsValue({ display_order: 0 })
    }
  }, [target, form])

  const openCreateCategory = () => setTarget({ kind: 'category', mode: 'create' })
  const openEditCategory = (data: NavCategory) => setTarget({ kind: 'category', mode: 'edit', data })
  const openCreateSection = (categoryId: number) => setTarget({ kind: 'section', mode: 'create', categoryId })
  const openEditSection = (data: NavSection, categoryId: number) => setTarget({ kind: 'section', mode: 'edit', data, categoryId })
  const openCreateItem = (sectionId: number) => setTarget({ kind: 'item', mode: 'create', sectionId })
  const openEditItem = (data: NavItem, sectionId: number) => setTarget({ kind: 'item', mode: 'edit', data, sectionId })

  const handleSubmit = async () => {
    if (!target) return
    let values: any
    try { values = await form.validateFields() } catch { return }
    setSaving(true)
    try {
      if (target.kind === 'category') {
        const payload: NavCategoryInput = {
          slug: values.slug, label: values.label, display_order: Number(values.display_order) || 0,
        }
        if (target.mode === 'create') await adminApi.createNavCategory(payload)
        else await adminApi.updateNavCategory(target.data.id, payload)
      } else if (target.kind === 'section') {
        if (target.mode === 'create') {
          const payload: NavSectionInput = {
            category: target.categoryId, title: values.title, display_order: Number(values.display_order) || 0,
          }
          await adminApi.createNavSection(payload)
        } else {
          await adminApi.updateNavSection(target.data.id, {
            title: values.title, display_order: Number(values.display_order) || 0,
          })
        }
      } else if (target.kind === 'item') {
        if (target.mode === 'create') {
          const payload: NavItemInput = {
            section: target.sectionId,
            slug: values.slug, label: values.label,
            icon_name: values.icon_name || '',
            display_order: Number(values.display_order) || 0,
          }
          await adminApi.createNavItem(payload)
        } else {
          await adminApi.updateNavItem(target.data.id, {
            slug: values.slug, label: values.label,
            icon_name: values.icon_name || '',
            display_order: Number(values.display_order) || 0,
          })
        }
      }
      message.success('保存成功')
      setTarget(null)
      load()
    } catch (e: any) {
      message.error(e?.response?.data?.error || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (kind: 'category' | 'section' | 'item', id: number) => {
    try {
      if (kind === 'category') await adminApi.deleteNavCategory(id)
      else if (kind === 'section') await adminApi.deleteNavSection(id)
      else await adminApi.deleteNavItem(id)
      message.success('已删除')
      load()
    } catch (e: any) {
      message.error(e?.response?.data?.error || '删除失败')
    }
  }

  const itemColumns = (section: NavSection): ColumnsType<NavItem> => [
    { title: '排序', dataIndex: 'display_order', width: 60 },
    { title: 'Slug', dataIndex: 'slug', width: 160, render: v => <Text code>{v}</Text> },
    { title: '名称', dataIndex: 'label', width: 160 },
    { title: '图标', dataIndex: 'icon_name', width: 160, render: v => v ? <Tag>{v}</Tag> : <Text type="secondary">—</Text> },
    {
      title: '操作', width: 140, fixed: 'right',
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditItem(row, section.id)}>编辑</Button>
          <Popconfirm title="删除该项？" onConfirm={() => handleDelete('item', row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Title level={3} style={{ margin: 0 }}>服务导航管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreateCategory}>新建分类</Button>
        </Space>
      </Space>
      <Text type="secondary">编辑 /api/services/navigation/ 的分类 / 分区 / 项。保存后会自动清除缓存。</Text>

      <Spin spinning={loading}>
        {data.length === 0 && !loading ? (
          <Empty style={{ marginTop: 48 }} description="暂无分类，点击右上方“新建分类”创建" />
        ) : (
          <Collapse style={{ marginTop: 16 }} defaultActiveKey={data.map(c => String(c.id))}>
            {data.map(cat => (
              <Collapse.Panel
                key={String(cat.id)}
                header={
                  <Space>
                    <FolderOpenOutlined />
                    <Text strong>{cat.label}</Text>
                    <Text code>{cat.slug}</Text>
                    <Tag>排序 {cat.display_order}</Tag>
                  </Space>
                }
                extra={
                  <Space onClick={e => e.stopPropagation()}>
                    <Tooltip title="新建分区">
                      <Button size="small" icon={<PlusOutlined />} onClick={() => openCreateSection(cat.id)}>分区</Button>
                    </Tooltip>
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEditCategory(cat)}>编辑</Button>
                    <Popconfirm title="删除该分类及其所有分区/项？" onConfirm={() => handleDelete('category', cat.id)}>
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                }
              >
                {cat.sections.length === 0 ? (
                  <Empty description="无分区" />
                ) : cat.sections.map(sec => (
                  <Card
                    key={sec.id}
                    size="small"
                    style={{ marginBottom: 12 }}
                    title={
                      <Space>
                        <AppstoreOutlined />
                        <Text strong>{sec.title}</Text>
                        <Tag>排序 {sec.display_order}</Tag>
                      </Space>
                    }
                    extra={
                      <Space>
                        <Button size="small" icon={<PlusOutlined />} onClick={() => openCreateItem(sec.id)}>新建项</Button>
                        <Button size="small" icon={<EditOutlined />} onClick={() => openEditSection(sec, cat.id)}>编辑</Button>
                        <Popconfirm title="删除该分区及其所有项？" onConfirm={() => handleDelete('section', sec.id)}>
                          <Button size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                      </Space>
                    }
                  >
                    <Table
                      rowKey="id"
                      size="small"
                      pagination={false}
                      dataSource={sec.items}
                      columns={itemColumns(sec)}
                      locale={{ emptyText: '无项' }}
                    />
                  </Card>
                ))}
              </Collapse.Panel>
            ))}
          </Collapse>
        )}
      </Spin>

      <Modal
        open={!!target}
        onCancel={() => setTarget(null)}
        onOk={handleSubmit}
        confirmLoading={saving}
        title={
          !target ? '' :
          target.kind === 'category' ? (target.mode === 'create' ? '新建分类' : '编辑分类') :
          target.kind === 'section'  ? (target.mode === 'create' ? '新建分区' : '编辑分区') :
                                       (target.mode === 'create' ? '新建项'   : '编辑项')
        }
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          {target?.kind === 'category' && (
            <>
              <Form.Item name="slug" label="Slug" rules={[{ required: true, max: 50 }]}>
                <Input placeholder="例如 local_service" />
              </Form.Item>
              <Form.Item name="label" label="名称" rules={[{ required: true, max: 50 }]}>
                <Input placeholder="例如 本地服务" />
              </Form.Item>
            </>
          )}
          {target?.kind === 'section' && (
            <Form.Item name="title" label="标题" rules={[{ required: true, max: 50 }]}>
              <Input placeholder="分区标题" />
            </Form.Item>
          )}
          {target?.kind === 'item' && (
            <>
              <Form.Item name="slug" label="Slug" rules={[{ required: true, max: 50 }]}>
                <Input placeholder="项 slug" />
              </Form.Item>
              <Form.Item name="label" label="名称" rules={[{ required: true, max: 50 }]}>
                <Input placeholder="显示名称" />
              </Form.Item>
              <Form.Item name="icon_name" label="图标名 (可选)" rules={[{ max: 60 }]}>
                <Input placeholder="例如 ShoppingOutlined" />
              </Form.Item>
            </>
          )}
          <Form.Item name="display_order" label="排序" initialValue={0}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
