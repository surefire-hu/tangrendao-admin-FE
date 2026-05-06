import { useCallback, useEffect, useState } from 'react'
import {
  Alert, Button, Card, Form, Input, InputNumber, Modal, Popconfirm,
  Select, Space, Switch, Table, Tag, Typography, message,
} from 'antd'
import { EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { forumApi, type ForumHotKeyword, type ForumHotKeywordPayload } from '../../api/forum'
import { geographyApi, type AdminCountry } from '../../api/geography'

const { Title, Text } = Typography

const EMPTY_FORM: ForumHotKeywordPayload = {
  term: '',
  country: 'IT',
  display_order: 0,
  is_active: true,
}

export function HotKeywordsPage() {
  const [rows, setRows] = useState<ForumHotKeyword[]>([])
  const [countries, setCountries] = useState<AdminCountry[]>([])
  const [filterCountry, setFilterCountry] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<ForumHotKeyword | null>(null)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm<ForumHotKeywordPayload>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await forumApi.listHotKeywords(filterCountry)
      setRows(r.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [filterCountry])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    geographyApi.list().then(r => setCountries(r.data)).catch(() => {})
  }, [])

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ ...EMPTY_FORM, country: filterCountry ?? 'IT' })
    setCreating(true)
  }

  const openEdit = (row: ForumHotKeyword) => {
    form.resetFields()
    form.setFieldsValue({
      term: row.term,
      country: row.country,
      display_order: row.display_order,
      is_active: row.is_active,
    })
    setEditing(row)
  }

  const closeModal = () => {
    setEditing(null)
    setCreating(false)
  }

  const submit = async () => {
    try {
      const values = await form.validateFields()
      const payload: ForumHotKeywordPayload = {
        ...values,
        country: values.country.trim().toUpperCase(),
        term: values.term.trim(),
      }
      if (creating) {
        await forumApi.createHotKeyword(payload)
        message.success('已添加')
      } else if (editing) {
        await forumApi.updateHotKeyword(editing.id, payload)
        message.success('已更新')
      }
      closeModal()
      await load()
    } catch (e: unknown) {
      const err = e as { response?: { data?: Record<string, unknown> } }
      const data = err?.response?.data
      if (data) {
        const msg = Object.entries(data)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`)
          .join(' · ')
        message.error(msg || '保存失败')
      }
    }
  }

  const remove = async (row: ForumHotKeyword) => {
    try {
      await forumApi.removeHotKeyword(row.id)
      message.success('已删除')
      await load()
    } catch {
      message.error('删除失败')
    }
  }

  const columns: ColumnsType<ForumHotKeyword> = [
    { title: '国家', dataIndex: 'country', width: 80, render: (v: string) => <Tag>{v}</Tag> },
    { title: '关键词', dataIndex: 'term', render: (v: string) => <Text strong>{v}</Text> },
    {
      title: '排序', dataIndex: 'display_order', width: 80,
      sorter: (a, b) => a.display_order - b.display_order,
    },
    {
      title: '启用', dataIndex: 'is_active', width: 80,
      render: (v: boolean, row) => (
        <Switch
          size="small"
          checked={v}
          onChange={async (checked) => {
            try {
              await forumApi.updateHotKeyword(row.id, { is_active: checked })
              await load()
            } catch {
              message.error('修改失败')
            }
          }}
        />
      ),
    },
    {
      title: '操作', key: 'actions', width: 200, fixed: 'right' as const,
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>编辑</Button>
          <Popconfirm
            title="删除该关键词？"
            okText="删除" cancelText="取消" okButtonProps={{ danger: true }}
            onConfirm={() => remove(row)}
          >
            <Button size="small" danger>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={4} style={{ margin: 0 }}>买热搜</Title>
        <Space>
          <Select
            allowClear
            placeholder="按国家筛选"
            style={{ width: 200 }}
            value={filterCountry}
            onChange={setFilterCountry}
            options={countries.map(c => ({
              label: `${c.code} · ${c.name_zh}`,
              value: c.code,
            }))}
          />
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加关键词</Button>
        </Space>
      </div>

      <Alert
        type="info"
        showIcon
        message="买热搜：客户端论坛搜索页空闲态会展示这些关键词，独立于自然搜索热度。排序数字越小越靠前。"
      />

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns}
          pagination={false}
          size="small"
          scroll={{ x: 800 }}
        />
      </Card>

      <Modal
        title={creating ? '添加买热搜关键词' : '编辑买热搜关键词'}
        open={creating || !!editing}
        onOk={submit}
        onCancel={closeModal}
        width={520}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="国家"
            name="country"
            rules={[{ required: true, message: '请选择国家' }]}
          >
            <Select
              placeholder="选择国家"
              options={countries.map(c => ({
                label: `${c.code} · ${c.name_zh}`,
                value: c.code,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="关键词"
            name="term"
            rules={[{ required: true, message: '请输入关键词' }]}
          >
            <Input maxLength={200} placeholder="例如 招聘" />
          </Form.Item>
          <Form.Item
            label="排序 (越小越靠前)"
            name="display_order"
          >
            <InputNumber min={0} max={9999} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="启用" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  )
}
