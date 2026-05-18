import { useEffect, useState } from 'react'
import {
  Card, Button, Space, Table, Modal, Form, Input, InputNumber, Switch,
  Typography, Empty, Spin, Popconfirm, message, Tag, Collapse,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { adminApi } from '../../api/admin'
import type {
  JobIndustryAdmin, JobTypeAdmin, JobIndustryInput, JobTypeInput,
} from '../../types'

const { Title } = Typography

type EditTarget =
  | { kind: 'industry'; mode: 'create' }
  | { kind: 'industry'; mode: 'edit'; data: JobIndustryAdmin }
  | { kind: 'type';     mode: 'create'; industryId: string }
  | { kind: 'type';     mode: 'edit'; data: JobTypeAdmin; industryId: string }
  | null

export function JobsTaxonomyPage() {
  const [data, setData] = useState<JobIndustryAdmin[]>([])
  const [loading, setLoading] = useState(false)
  const [target, setTarget] = useState<EditTarget>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getJobIndustries()
      setData(res.data)
    } catch {
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
      form.setFieldsValue({ sort_order: 0, is_active: true })
    }
  }, [target, form])

  const onSave = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      if (!target) return
      if (target.kind === 'industry') {
        const payload: JobIndustryInput = {
          name: String(values.name).trim(),
          icon: values.icon ?? '',
          sort_order: Number(values.sort_order ?? 0),
          is_active: values.is_active ?? true,
        }
        if (target.mode === 'create') {
          await adminApi.createJobIndustry(payload)
          message.success('行业已创建')
        } else {
          await adminApi.updateJobIndustry(target.data.id, payload)
          message.success('行业已更新')
        }
      } else {
        const payload: JobTypeInput = {
          industry: target.industryId,
          name: String(values.name).trim(),
          sort_order: Number(values.sort_order ?? 0),
          is_active: values.is_active ?? true,
        }
        if (target.mode === 'create') {
          await adminApi.createJobType(payload)
          message.success('工种已创建')
        } else {
          await adminApi.updateJobType(target.data.id, {
            name: payload.name,
            sort_order: payload.sort_order,
            is_active: payload.is_active,
          })
          message.success('工种已更新')
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

  const onDeleteIndustry = async (ind: JobIndustryAdmin) => {
    try {
      await adminApi.deleteJobIndustry(ind.id)
      message.success('已删除')
      await load()
    } catch (e: any) {
      message.error(e?.response?.data?.error ?? '删除失败')
    }
  }

  const onDeleteType = async (jt: JobTypeAdmin) => {
    try {
      await adminApi.deleteJobType(jt.id)
      message.success('已删除')
      await load()
    } catch (e: any) {
      message.error(e?.response?.data?.error ?? '删除失败')
    }
  }

  const typeColumns: ColumnsType<JobTypeAdmin> = [
    { title: '名称', dataIndex: 'name', key: 'name' },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 80 },
    {
      title: '状态', dataIndex: 'is_active', key: 'is_active', width: 80,
      render: v => (v ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>),
    },
    {
      title: '操作', key: 'ops', width: 160,
      render: (_, jt) => {
        const industryId = jt.industry_id
        return (
          <Space>
            <Button size="small" icon={<EditOutlined />}
                    onClick={() => setTarget({ kind: 'type', mode: 'edit', data: jt, industryId })}>编辑</Button>
            <Popconfirm title="删除工种？" onConfirm={() => onDeleteType(jt)}>
              <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16, justifyContent: 'space-between', width: '100%' }}>
        <Title level={3} style={{ margin: 0 }}>招聘分类管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />}
                  onClick={() => setTarget({ kind: 'industry', mode: 'create' })}>新增行业</Button>
        </Space>
      </Space>

      {loading ? (
        <Spin />
      ) : data.length === 0 ? (
        <Empty description="暂无行业" />
      ) : (
        <Collapse accordion>
          {data.map(ind => (
            <Collapse.Panel
              key={ind.id}
              header={
                <Space>
                  <AppstoreOutlined />
                  <strong>{ind.icon} {ind.name}</strong>
                  {!ind.is_active && <Tag>禁用</Tag>}
                  <span style={{ color: '#999' }}>({ind.job_types.length} 工种)</span>
                </Space>
              }
              extra={
                <Space onClick={e => e.stopPropagation()}>
                  <Button size="small" icon={<EditOutlined />}
                          onClick={() => setTarget({ kind: 'industry', mode: 'edit', data: ind })}>编辑</Button>
                  <Popconfirm title="删除该行业及其所有工种？" onConfirm={() => onDeleteIndustry(ind)}>
                    <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                  </Popconfirm>
                </Space>
              }
            >
              <Card size="small" extra={
                <Button size="small" type="primary" icon={<PlusOutlined />}
                        onClick={() => setTarget({ kind: 'type', mode: 'create', industryId: ind.id })}>
                  新增工种
                </Button>
              }>
                <Table
                  rowKey="id"
                  size="small"
                  pagination={false}
                  columns={typeColumns}
                  dataSource={ind.job_types}
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
          target.kind === 'industry'
            ? (target.mode === 'create' ? '新增行业' : '编辑行业')
            : (target.mode === 'create' ? '新增工种' : '编辑工种')
        }
        onCancel={() => setTarget(null)}
        onOk={onSave}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input maxLength={100} />
          </Form.Item>
          {target?.kind === 'industry' && (
            <Form.Item name="icon" label="图标 (emoji)">
              <Input maxLength={10} />
            </Form.Item>
          )}
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
