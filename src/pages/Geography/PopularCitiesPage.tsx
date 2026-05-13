import { useEffect, useState } from 'react'
import {
  Card, Button, Space, Table, Modal, Form, Input, InputNumber, Switch,
  Select, Typography, Empty, Spin, Popconfirm, message, Tag,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  EnvironmentOutlined, FireOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  geographyApi,
  type PopularCity, type PopularCityInput, type AdminCountry,
} from '../../api/geography'

const { Title, Text } = Typography

export function PopularCitiesPage() {
  const [countries, setCountries] = useState<AdminCountry[]>([])
  const [country, setCountry] = useState<string | undefined>(undefined)
  const [rows, setRows] = useState<PopularCity[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<PopularCity | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await geographyApi.listPopularCities(country)
      setRows(res.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    geographyApi.list().then(r => setCountries(r.data)).catch(() => {})
  }, [])

  useEffect(() => { load() }, [country])

  useEffect(() => {
    if (editing) form.setFieldsValue(editing)
    else if (showCreate) form.resetFields()
  }, [editing, showCreate])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({
      country: country ?? 'IT',
      click_count: 0,
      display_order: 0,
      is_active: true,
    })
    setShowCreate(true)
  }

  const handleSubmit = async () => {
    let values: PopularCityInput
    try { values = await form.validateFields() as PopularCityInput } catch { return }
    setSaving(true)
    try {
      if (editing) {
        await geographyApi.updatePopularCity(editing.id, values)
      } else {
        await geographyApi.createPopularCity(values)
      }
      message.success('已保存')
      setEditing(null)
      setShowCreate(false)
      load()
    } catch (e: any) {
      message.error(e?.response?.data?.error || e?.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await geographyApi.deletePopularCity(id)
      message.success('已删除')
      load()
    } catch {
      message.error('删除失败')
    }
  }

  const columns: ColumnsType<PopularCity> = [
    { title: '国家', dataIndex: 'country', width: 80, render: v => <Tag>{v}</Tag> },
    {
      title: '城市',
      dataIndex: 'name',
      render: (v, _r, i) => (
        <Space>
          {i === 0 ? <FireOutlined style={{ color: '#ff3b30' }} /> :
           i === 1 ? <FireOutlined style={{ color: '#ff6b00' }} /> :
           i === 2 ? <FireOutlined style={{ color: '#f5a623' }} /> :
           <EnvironmentOutlined style={{ color: '#999' }} />}
          <Text strong>{v}</Text>
        </Space>
      ),
    },
    { title: '点击数', dataIndex: 'click_count', width: 100, sorter: (a, b) => a.click_count - b.click_count },
    { title: '排序', dataIndex: 'display_order', width: 80 },
    {
      title: '状态', dataIndex: 'is_active', width: 80,
      render: v => v ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>,
    },
    {
      title: '操作', width: 160, fixed: 'right',
      render: (_, row) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => { setEditing(row); setShowCreate(true) }}>编辑</Button>
          <Popconfirm title="删除该城市？" onConfirm={() => handleDelete(row.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div style={{ padding: 24 }}>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Title level={3} style={{ margin: 0 }}>热门城市</Title>
        <Space>
          <Select
            placeholder="选择国家筛选"
            allowClear
            style={{ width: 180 }}
            value={country}
            onChange={setCountry}
            options={countries.map(c => ({ label: `${c.flag_emoji} ${c.name_zh} (${c.code})`, value: c.code }))}
          />
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建</Button>
        </Space>
      </Space>
      <Text type="secondary">
        前三名按点击数排名显示彩色条（红/橙/黄）。点击数会在用户每次点击城市时自动 +1，
        可手动设置初始值。
      </Text>

      <Spin spinning={loading}>
        {rows.length === 0 && !loading ? (
          <Empty style={{ marginTop: 48 }} description="暂无城市，点击右上方新建" />
        ) : (
          <Card style={{ marginTop: 16 }} bodyStyle={{ padding: 0 }}>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              dataSource={rows}
              columns={columns}
            />
          </Card>
        )}
      </Spin>

      <Modal
        open={showCreate}
        onCancel={() => { setShowCreate(false); setEditing(null) }}
        onOk={handleSubmit}
        confirmLoading={saving}
        title={editing ? '编辑城市' : '新建城市'}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="country" label="国家" rules={[{ required: true }]}>
            <Select
              options={countries.map(c => ({ label: `${c.flag_emoji} ${c.name_zh} (${c.code})`, value: c.code }))}
              showSearch
              optionFilterProp="label"
            />
          </Form.Item>
          <Form.Item name="name" label="城市名" rules={[{ required: true, max: 120 }]}>
            <Input placeholder="例如 罗马 / Roma / Milano" />
          </Form.Item>
          <Form.Item name="click_count" label="初始点击数" tooltip="决定排名顺序（越高越靠前）">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="display_order" label="同点击数时排序" tooltip="点击数相同时的次序，小在前">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
