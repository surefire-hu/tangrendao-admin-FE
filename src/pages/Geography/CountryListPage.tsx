import { useCallback, useEffect, useState } from 'react'
import {
  Alert, Button, Card, Form, Input, Modal, Popconfirm,
  Space, Switch, Table, Tag, Tooltip, Typography, message,
} from 'antd'
import {
  CloudDownloadOutlined, EditOutlined, PlusOutlined, ReloadOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import { geographyApi, type AdminCountry, type CountryPayload, type ImportResult } from '../../api/geography'

const { Title, Text } = Typography

const EMPTY_FORM: CountryPayload = {
  code: '', name: '', name_zh: '', phone_prefix: '',
  postal_regex: '', postal_example: '', currency: 'EUR',
  flag_emoji: '', is_active: true, is_hot: false,
}

export function CountryListPage() {
  const [rows, setRows]       = useState<AdminCountry[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<AdminCountry | null>(null)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [importLog, setImportLog] = useState<{ code: string; result: ImportResult } | null>(null)
  const [form] = Form.useForm<CountryPayload>()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await geographyApi.list()
      setRows(r.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue(EMPTY_FORM)
    setCreating(true)
  }

  const openEdit = (row: AdminCountry) => {
    form.resetFields()
    form.setFieldsValue(row)
    setEditing(row)
  }

  const closeModal = () => {
    setEditing(null)
    setCreating(false)
  }

  const submit = async () => {
    try {
      const values = await form.validateFields()
      const payload: CountryPayload = {
        ...values,
        code: values.code.trim().toUpperCase(),
      }
      if (creating) {
        await geographyApi.create(payload)
        message.success(`已添加 ${payload.code}`)
      } else if (editing) {
        await geographyApi.update(editing.code, payload)
        message.success(`已更新 ${editing.code}`)
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
      } else {
        // validateFields rejects with a non-axios error
      }
    }
  }

  const remove = async (row: AdminCountry) => {
    try {
      await geographyApi.remove(row.code)
      message.success(`已删除 ${row.code}`)
      await load()
    } catch {
      message.error('删除失败')
    }
  }

  const runImport = async (row: AdminCountry) => {
    setImporting(row.code)
    try {
      const r = await geographyApi.importGeoNames([row.code])
      const result = r.data.results[row.code]
      setImportLog({ code: row.code, result })
      if (result.ok) {
        message.success(`${row.code}: 已导入 ${result.inserted} 条邮编`)
      } else {
        message.error(`${row.code}: ${result.error ?? '导入失败'}`)
      }
      await load()
    } catch {
      message.error('导入失败 — 请检查后台日志')
    } finally {
      setImporting(null)
    }
  }

  const columns: ColumnsType<AdminCountry> = [
    {
      title: '国家',
      key: 'country',
      render: (_, row) => (
        <Space>
          <span
            className={`fi fi-${row.code.toLowerCase()}`}
            style={{
              width: 24, height: 18, borderRadius: 2,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
            }}
          />
          <Text strong>{row.code}</Text>
          <Text type="secondary">{row.name_zh}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>· {row.name}</Text>
        </Space>
      ),
    },
    { title: '区号', dataIndex: 'phone_prefix', width: 90 },
    { title: '货币', dataIndex: 'currency',     width: 80 },
    {
      title: 'CAP 示例', key: 'postal',
      render: (_, row) => (
        <Space size={4} direction="vertical" style={{ lineHeight: 1.2 }}>
          <Text>{row.postal_example || '—'}</Text>
          {row.postal_regex && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              <code>{row.postal_regex}</code>
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '邮编数据', dataIndex: 'postal_count', width: 110,
      render: (n: number) =>
        n > 0
          ? <Tag color="blue">{n.toLocaleString()}</Tag>
          : <Tag color="default">未导入</Tag>,
      sorter: (a, b) => a.postal_count - b.postal_count,
    },
    {
      title: '启用', dataIndex: 'is_active', width: 80,
      render: (v: boolean, row) => (
        <Switch
          size="small"
          checked={v}
          onChange={async (checked) => {
            try {
              await geographyApi.update(row.code, { is_active: checked })
              await load()
            } catch {
              message.error('修改失败')
            }
          }}
        />
      ),
    },
    {
      title: '爆火', dataIndex: 'is_hot', width: 80,
      render: (v: boolean, row) => (
        <Switch
          size="small"
          checked={v}
          onChange={async (checked) => {
            try {
              await geographyApi.update(row.code, { is_hot: checked })
              await load()
            } catch {
              message.error('修改失败')
            }
          }}
        />
      ),
    },
    {
      title: '操作', key: 'actions', width: 280, fixed: 'right' as const,
      render: (_, row) => (
        <Space>
          <Tooltip title="从 GeoNames 下载并替换该国全部邮编">
            <Button
              size="small"
              icon={<CloudDownloadOutlined />}
              loading={importing === row.code}
              onClick={() => runImport(row)}
            >
              导入邮编
            </Button>
          </Tooltip>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>编辑</Button>
          <Popconfirm
            title="删除该国？"
            description={`将一并删除 ${row.postal_count} 条邮编数据。`}
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
        <Title level={4} style={{ margin: 0 }}>国家与邮政编码</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加国家</Button>
        </Space>
      </div>

      <Alert
        type="info"
        showIcon
        message="添加新国家无需重新发布 App — 客户端通过 /api/geo/countries/ 动态读取此列表。"
        description="添加后请点击「导入邮编」从 GeoNames 下载该国 CAP 数据（约 10–60 秒，取决于国家大小）。"
      />

      <Card size="small" styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="code"
          loading={loading}
          dataSource={rows}
          columns={columns}
          pagination={false}
          size="small"
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        title={creating ? '添加国家' : `编辑 ${editing?.code}`}
        open={creating || !!editing}
        onOk={submit}
        onCancel={closeModal}
        width={600}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="ISO 代码 (2 字母)"
            name="code"
            rules={[
              { required: true, message: '请输入 2 字母 ISO 代码' },
              { pattern: /^[A-Za-z]{2}$/, message: '必须为 2 个字母' },
            ]}
          >
            <Input placeholder="IT, FR, DE, …" maxLength={2}
                   disabled={!!editing} style={{ textTransform: 'uppercase' }} />
          </Form.Item>

          <Form.Item label="英文/本地名" name="name" rules={[{ required: true }]}>
            <Input placeholder="Italia, France, …" />
          </Form.Item>

          <Form.Item label="中文名" name="name_zh" rules={[{ required: true }]}>
            <Input placeholder="意大利, 法国, …" />
          </Form.Item>

          <Space style={{ width: '100%' }} size="middle">
            <Form.Item label="电话区号" name="phone_prefix" style={{ flex: 1 }}>
              <Input placeholder="+39" />
            </Form.Item>
            <Form.Item label="货币" name="currency" style={{ flex: 1 }}>
              <Input placeholder="EUR" />
            </Form.Item>
            <Form.Item label="国旗 Emoji" name="flag_emoji" style={{ flex: 1 }}>
              <Input placeholder="🇮🇹" />
            </Form.Item>
          </Space>

          <Form.Item
            label="CAP 正则"
            name="postal_regex"
            tooltip="客户端用此正则校验输入。例如意大利: ^\d{5}$"
          >
            <Input placeholder={String.raw`^\d{5}$`} />
          </Form.Item>

          <Form.Item label="CAP 示例" name="postal_example">
            <Input placeholder="20121" />
          </Form.Item>

          <Space style={{ width: '100%' }} size="middle">
            <Form.Item label="启用" name="is_active" valuePropName="checked" style={{ flex: 1 }}>
              <Switch />
            </Form.Item>
            <Form.Item label="爆火" name="is_hot" valuePropName="checked" style={{ flex: 1 }}>
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={`导入日志 — ${importLog?.code}`}
        open={!!importLog}
        onCancel={() => setImportLog(null)}
        footer={<Button onClick={() => setImportLog(null)}>关闭</Button>}
        width={600}
      >
        {importLog && (
          <>
            {importLog.result.ok ? (
              <Alert type="success" showIcon
                     message={`已导入 ${importLog.result.inserted} 条 (替换 ${importLog.result.deleted} 条旧数据)`} />
            ) : (
              <Alert type="error" showIcon message={importLog.result.error ?? '失败'} />
            )}
            {importLog.result.log && (
              <pre style={{ marginTop: 12, padding: 12, background: '#f5f5f5',
                            borderRadius: 4, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                {importLog.result.log}
              </pre>
            )}
          </>
        )}
      </Modal>
    </Space>
  )
}
