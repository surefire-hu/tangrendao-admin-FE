import { useEffect, useState } from 'react'
import {
  Card, Button, Space, Table, Modal, Form, Input, InputNumber, Switch,
  Typography, Empty, Spin, Popconfirm, message, Tag, Collapse, Tabs,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { adminApi } from '../../api/admin'
import type {
  ClassifiedSubcategory, ClassifiedSubType,
  ClassifiedSubcategoryInput, ClassifiedSubTypeInput,
  ClassifiedCategoryRoot,
} from '../../types'

const { Title } = Typography

const CATEGORY_TABS: { key: ClassifiedCategoryRoot; label: string }[] = [
  { key: 'housing',       label: '房源信息' },
  { key: 'market',        label: '买卖市场' },
  { key: 'local_service', label: '本地服务' },
]

type EditTarget =
  | { kind: 'subcategory'; mode: 'create'; category: ClassifiedCategoryRoot }
  | { kind: 'subcategory'; mode: 'edit'; data: ClassifiedSubcategory }
  | { kind: 'subtype';     mode: 'create'; subcategoryId: number }
  | { kind: 'subtype';     mode: 'edit'; data: ClassifiedSubType; subcategoryId: number }
  | null

export function ClassifiedsTaxonomyPage() {
  const [tab, setTab] = useState<ClassifiedCategoryRoot>('housing')
  const [data, setData] = useState<ClassifiedSubcategory[]>([])
  const [loading, setLoading] = useState(false)
  const [target, setTarget] = useState<EditTarget>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getClassifiedSubcategories({ category: tab })
      setData(res.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tab])

  useEffect(() => {
    if (!target) return
    if (target.mode === 'edit') {
      form.setFieldsValue(target.data as any)
    } else {
      form.resetFields()
      form.setFieldsValue({ sort_order: 0, is_active: true })
    }
  }, [target, form])

  const onSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (!target) return
      if (target.kind === 'subcategory') {
        if (target.mode === 'create') {
          const payload: ClassifiedSubcategoryInput = {
            category:   target.category,
            name:       String(values.name).trim(),
            sort_order: Number(values.sort_order ?? 0),
            is_active:  values.is_active ?? true,
          }
          await adminApi.createClassifiedSubcategory(payload)
          message.success('子分类已创建')
        } else {
          await adminApi.updateClassifiedSubcategory(target.data.id, {
            name:       String(values.name).trim(),
            sort_order: Number(values.sort_order ?? 0),
            is_active:  values.is_active ?? true,
          })
          message.success('子分类已更新')
        }
      } else {
        if (target.mode === 'create') {
          const payload: ClassifiedSubTypeInput = {
            subcategory: target.subcategoryId,
            name:        String(values.name).trim(),
            sort_order:  Number(values.sort_order ?? 0),
            is_active:   values.is_active ?? true,
          }
          await adminApi.createClassifiedSubType(payload)
          message.success('子类型已创建')
        } else {
          await adminApi.updateClassifiedSubType(target.data.id, {
            name:       String(values.name).trim(),
            sort_order: Number(values.sort_order ?? 0),
            is_active:  values.is_active ?? true,
          })
          message.success('子类型已更新')
        }
      }
      setTarget(null)
      await load()
    } catch (e: any) {
      message.error(e?.response?.data?.error ?? '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const onDeleteSub = async (sub: ClassifiedSubcategory) => {
    try {
      await adminApi.deleteClassifiedSubcategory(sub.id)
      message.success('已删除')
      await load()
    } catch (e: any) {
      message.error(e?.response?.data?.error ?? '删除失败')
    }
  }

  const onDeleteType = async (t: ClassifiedSubType) => {
    try {
      await adminApi.deleteClassifiedSubType(t.id)
      message.success('已删除')
      await load()
    } catch (e: any) {
      message.error(e?.response?.data?.error ?? '删除失败')
    }
  }

  const typeColumns: ColumnsType<ClassifiedSubType> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
    {
      title: '状态', dataIndex: 'is_active', key: 'is_active', width: 80,
      render: v => (v ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>),
    },
    {
      title: '操作', key: 'ops', width: 160,
      render: (_, t) => (
        <Space>
          <Button size="small" icon={<EditOutlined />}
                  onClick={() => setTarget({ kind: 'subtype', mode: 'edit', data: t, subcategoryId: t.subcategory_id })}>
            编辑
          </Button>
          <Popconfirm title="删除子类型？" onConfirm={() => onDeleteType(t)}>
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Title level={3} style={{ margin: 0 }}>分类管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />}
                  onClick={() => setTarget({ kind: 'subcategory', mode: 'create', category: tab })}>
            新增子分类
          </Button>
        </Space>
      </Space>

      <Tabs
        activeKey={tab}
        onChange={k => setTab(k as ClassifiedCategoryRoot)}
        items={CATEGORY_TABS.map(c => ({ key: c.key, label: c.label }))}
      />

      {loading ? (
        <Spin />
      ) : data.length === 0 ? (
        <Empty description="暂无子分类" />
      ) : (
        <Collapse accordion>
          {data.map(sub => (
            <Collapse.Panel
              key={sub.id}
              header={
                <Space>
                  <AppstoreOutlined />
                  <strong>{sub.name}</strong>
                  {!sub.is_active && <Tag>禁用</Tag>}
                  <span style={{ color: '#999' }}>({sub.sub_types.length} 子类型)</span>
                </Space>
              }
              extra={
                <Space onClick={e => e.stopPropagation()}>
                  <Button size="small" icon={<EditOutlined />}
                          onClick={() => setTarget({ kind: 'subcategory', mode: 'edit', data: sub })}>
                    编辑
                  </Button>
                  <Popconfirm title="删除该子分类及其所有子类型？" onConfirm={() => onDeleteSub(sub)}>
                    <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                </Space>
              }
            >
              <Card size="small" extra={
                <Button size="small" type="primary" icon={<PlusOutlined />}
                        onClick={() => setTarget({ kind: 'subtype', mode: 'create', subcategoryId: sub.id })}>
                  新增子类型
                </Button>
              }>
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={typeColumns}
                  dataSource={sub.sub_types}
                />
              </Card>
            </Collapse.Panel>
          ))}
        </Collapse>
      )}

      <Modal
        open={!!target}
        title={
          !target ? '' :
          target.kind === 'subcategory'
            ? (target.mode === 'create' ? '新增子分类' : '编辑子分类')
            : (target.mode === 'create' ? '新增子类型' : '编辑子类型')
        }
        onCancel={() => setTarget(null)}
        onOk={onSave}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input maxLength={50} />
          </Form.Item>
          <Form.Item name="sort_order" label="排序" initialValue={0}>
            <InputNumber min={0} max={9999} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
