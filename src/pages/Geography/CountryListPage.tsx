import { useCallback, useEffect, useState } from 'react'
import {
  Alert, AutoComplete, Button, Card, Form, Input, Modal, Popconfirm,
  Select, Space, Switch, Table, Tag, Tooltip, Typography, message,
} from 'antd'
import {
  EditOutlined, EnvironmentOutlined,
  PlusOutlined, ReloadOutlined, RobotOutlined, ThunderboltOutlined,
  TranslationOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'

import {
  geographyApi, type AdminCountry, type CountryPayload,
  type ImportResult, type ProvinceOption, type TranslateResponse,
} from '../../api/geography'

const { Title, Text } = Typography

const EMPTY_FORM: CountryPayload = {
  code: '', name: '', name_zh: '', phone_prefix: '',
  postal_regex: '', postal_example: '', currency: 'EUR',
  flag_emoji: '', is_active: true, is_hot: false,
  default_provinces: [], province_admin_level: 2,
}

const ADMIN_LEVEL_OPTIONS = [
  { value: 1, label: 'admin1 — 一级（大区/州/省）例: NL Provincie, CH Kanton' },
  { value: 2, label: 'admin2 — 二级（省/县）例: IT Provincia, FR Département (默认)' },
  { value: 3, label: 'admin3 — 三级（地区/Kreis）例: DE Kreis' },
]

export function CountryListPage() {
  const [rows, setRows]       = useState<AdminCountry[]>([])
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<AdminCountry | null>(null)
  const [creating, setCreating] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [importLog, setImportLog] = useState<{ code: string; result: ImportResult } | null>(null)
  const [translating, setTranslating] = useState<string | null>(null)
  const [translateLog, setTranslateLog] = useState<{ code: string; result: TranslateResponse } | null>(null)
  const [provinceTarget, setProvinceTarget] = useState<AdminCountry | null>(null)
  const [provinceDraft, setProvinceDraft] = useState<string[]>([])
  const [provinceInput, setProvinceInput] = useState('')
  const [provinceSaving, setProvinceSaving] = useState(false)
  const [provinceCatalog, setProvinceCatalog] = useState<ProvinceOption[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
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

  const openProvinces = async (row: AdminCountry) => {
    setProvinceTarget(row)
    setProvinceDraft([...(row.default_provinces ?? [])])
    setProvinceInput('')
    setCatalogLoading(true)
    try {
      const r = await geographyApi.searchProvinces(row.code, '')
      setProvinceCatalog(r.data)
    } catch {
      setProvinceCatalog([])
      message.warning('无法加载省份列表 — 请先导入邮编')
    } finally {
      setCatalogLoading(false)
    }
  }

  const closeProvinces = () => {
    setProvinceTarget(null)
    setProvinceDraft([])
    setProvinceInput('')
    setProvinceCatalog([])
  }

  const provinceLatinToZh = useCallback((name: string): string => {
    const hit = provinceCatalog.find(p => p.name === name)
    return hit?.name_zh || ''
  }, [provinceCatalog])

  const autocompleteOptions = (() => {
    const q = provinceInput.trim().toLowerCase()
    const taken = new Set(provinceDraft)
    const pool = provinceCatalog.filter(p => !taken.has(p.name))
    const matches = q
      ? pool.filter(p =>
          p.name.toLowerCase().includes(q) ||
          (p.name_zh ?? '').toLowerCase().includes(q),
        )
      : pool
    return matches.slice(0, 50).map(p => ({
      value: p.name,
      label: (
        <Space>
          <span>{p.name}</span>
          {p.name_zh && <Text type="secondary">· {p.name_zh}</Text>}
          {p.region && <Text type="secondary" style={{ fontSize: 11 }}>· {p.region}</Text>}
        </Space>
      ),
    }))
  })()

  const addProvinceToDraft = (raw?: string) => {
    const v = (raw ?? provinceInput).trim()
    if (!v) return
    // Normalize to canonical Latin name if user typed Chinese / partial match
    const match =
      provinceCatalog.find(p => p.name === v) ??
      provinceCatalog.find(p => p.name.toLowerCase() === v.toLowerCase()) ??
      provinceCatalog.find(p => (p.name_zh ?? '') === v)
    const canonical = match?.name ?? v
    if (provinceDraft.includes(canonical)) {
      message.warning('已在列表中')
      setProvinceInput('')
      return
    }
    setProvinceDraft([...provinceDraft, canonical])
    setProvinceInput('')
  }

  const removeProvinceFromDraft = (name: string) => {
    setProvinceDraft(provinceDraft.filter(p => p !== name))
  }

  const moveProvince = (idx: number, dir: -1 | 1) => {
    const next = [...provinceDraft]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    setProvinceDraft(next)
  }

  const saveProvinces = async () => {
    if (!provinceTarget) return
    setProvinceSaving(true)
    try {
      await geographyApi.update(provinceTarget.code, { default_provinces: provinceDraft })
      message.success(`已保存 ${provinceTarget.code} 默认省份`)
      closeProvinces()
      await load()
    } catch {
      message.error('保存失败')
    } finally {
      setProvinceSaving(false)
    }
  }

  const runTranslate = async (row: AdminCountry, force = false) => {
    setTranslating(row.code)
    try {
      const r = await geographyApi.translateProvinces(row.code, force)
      setTranslateLog({ code: row.code, result: r.data })
      if (r.data.ok) {
        message.success(`${row.code}: 省份中文翻译完成`)
      } else {
        message.error(`${row.code}: ${r.data.error ?? '翻译失败'}`)
      }
    } catch {
      message.error('翻译失败 — 请检查后台日志')
    } finally {
      setTranslating(null)
    }
  }

  const runImport = async (row: AdminCountry, autoDetect = false) => {
    setImporting(row.code)
    try {
      const r = await geographyApi.importGeoNames([row.code], autoDetect)
      const result = r.data.results[row.code]
      setImportLog({ code: row.code, result })
      if (result.ok) {
        const detect = result.detected_level
          ? ` (auto-level: admin${result.detected_level})`
          : ''
        message.success(`${row.code}: 已导入 ${result.inserted} 条邮编${detect}`)
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
      title: (
        <Tooltip title="智能导入会自动设置此级别。手动修改后请重新导入邮编生效。">
          <span>省份级别 <RobotOutlined style={{ fontSize: 11, opacity: 0.6 }} /></span>
        </Tooltip>
      ),
      key: 'province_admin_level', width: 130,
      render: (_, row) => (
        <Select
          size="small"
          value={row.province_admin_level}
          style={{ width: '100%' }}
          options={[
            { value: 1, label: 'admin1' },
            { value: 2, label: 'admin2' },
            { value: 3, label: 'admin3' },
          ]}
          onChange={async (v) => {
            try {
              await geographyApi.update(row.code, { province_admin_level: v })
              message.success(`${row.code}: 改为 admin${v}（重新导入邮编生效）`)
              await load()
            } catch {
              message.error('修改失败')
            }
          }}
        />
      ),
    },
    {
      title: '默认省份', key: 'default_provinces', width: 110,
      render: (_, row) => {
        const n = row.default_provinces?.length ?? 0
        return n > 0
          ? <Tag color="purple">{n} 个</Tag>
          : <Tag color="default">未设置</Tag>
      },
    },
    {
      title: '操作', key: 'actions', width: 500, fixed: 'right' as const,
      render: (_, row) => (
        <Space wrap>
          <Tooltip title="一键完成：AI 自动识别省份级别 → 下载邮编 → 翻译省份（中文）。重复的省份名只翻译一次以节省 token。">
            <Popconfirm
              title="智能导入？"
              description="将下载 GeoNames、AI 选择 admin 级别、导入邮编、翻译省份。约 30–60 秒。"
              okText="开始"
              cancelText="取消"
              onConfirm={() => runImport(row, true)}
            >
              <Button
                size="small"
                type="primary"
                ghost
                icon={<ThunderboltOutlined />}
                loading={importing === row.code}
              >
                智能导入
              </Button>
            </Popconfirm>
          </Tooltip>
          <Tooltip title="只重新翻译省份（如果之前翻译失败或不满意）">
            <Popconfirm
              title="重新翻译省份为中文？"
              description="将调用 OpenAI 翻译尚未翻译的省份。重复名称去重，仅几秒。"
              okText="开始翻译"
              cancelText="取消"
              onConfirm={() => runTranslate(row)}
            >
              <Button
                size="small"
                icon={<TranslationOutlined />}
                loading={translating === row.code}
                disabled={row.postal_count === 0}
              >
                重译省份
              </Button>
            </Popconfirm>
          </Tooltip>
          <Button size="small" icon={<EnvironmentOutlined />} onClick={() => openProvinces(row)}>
            默认省份
          </Button>
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
          scroll={{ x: 1300 }}
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

          <Form.Item
            label="省份对应的 GeoNames 级别"
            name="province_admin_level"
            tooltip="GeoNames 文件含 admin1/admin2/admin3 三级行政区。不同国家「省」对应的级别不同：意大利/法国是 admin2，德国是 admin3 (Kreis)，荷兰/瑞士是 admin1。修改后需重新点「导入邮编」生效。"
            rules={[{ required: true }]}
          >
            <Select options={ADMIN_LEVEL_OPTIONS} />
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
            {importLog.result.detected_level && (
              <Alert
                type="info"
                showIcon
                style={{ marginTop: 8 }}
                message={
                  <span>
                    AI 自动识别：<Tag color="blue">admin{importLog.result.detected_level}</Tag>
                    置信度：{((importLog.result.detect_confidence ?? 0) * 100).toFixed(0)}%
                  </span>
                }
                description={importLog.result.detect_reason}
              />
            )}
            {importLog.result.translated_rows !== undefined && (
              <Alert
                type="success"
                showIcon
                style={{ marginTop: 8 }}
                message={`省份翻译完成 — 更新 ${importLog.result.translated_rows} 条邮编（重复省份名自动去重）`}
              />
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

      <Modal
        title={`翻译日志 — ${translateLog?.code}`}
        open={!!translateLog}
        onCancel={() => setTranslateLog(null)}
        footer={<Button onClick={() => setTranslateLog(null)}>关闭</Button>}
        width={600}
      >
        {translateLog && (
          <>
            {translateLog.result.ok ? (
              <Alert type="success" showIcon message="翻译完成" />
            ) : (
              <Alert type="error" showIcon message={translateLog.result.error ?? '失败'} />
            )}
            {translateLog.result.log && (
              <pre style={{ marginTop: 12, padding: 12, background: '#f5f5f5',
                            borderRadius: 4, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                {translateLog.result.log}
              </pre>
            )}
          </>
        )}
      </Modal>

      <Modal
        title={`默认省份 — ${provinceTarget?.code} ${provinceTarget?.name_zh ?? ''}`}
        open={!!provinceTarget}
        onCancel={closeProvinces}
        onOk={saveProvinces}
        okText="保存"
        cancelText="取消"
        confirmLoading={provinceSaving}
        width={520}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="客户端在省份搜索页底部展示这些默认省份。顺序即为展示顺序。"
        />
        <Space.Compact style={{ width: '100%' }}>
          <AutoComplete
            style={{ flex: 1 }}
            value={provinceInput}
            onChange={(v) => setProvinceInput(v)}
            onSelect={(v) => addProvinceToDraft(v)}
            options={autocompleteOptions}
            placeholder={
              catalogLoading
                ? '加载省份中…'
                : provinceCatalog.length === 0
                  ? '尚无省份数据 — 请先导入邮编'
                  : '输入省份名（中文或拉丁）例如 Milano / 米兰'
            }
            disabled={catalogLoading || provinceCatalog.length === 0}
            filterOption={false}
            allowClear
          >
            <Input onPressEnter={() => addProvinceToDraft()} />
          </AutoComplete>
          <Button
            type="primary"
            onClick={() => addProvinceToDraft()}
            disabled={!provinceInput.trim()}
          >
            添加
          </Button>
        </Space.Compact>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {provinceDraft.length === 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>暂无默认省份</Text>
          )}
          {provinceDraft.map((name, idx) => {
            const zh = provinceLatinToZh(name)
            return (
              <div
                key={name}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 10px', background: '#fafafa', borderRadius: 4,
                }}
              >
                <Text strong style={{ flex: 1 }}>
                  {idx + 1}. {name}
                  {zh && <Text type="secondary" style={{ marginLeft: 8 }}>· {zh}</Text>}
                </Text>
                <Button size="small" disabled={idx === 0} onClick={() => moveProvince(idx, -1)}>↑</Button>
                <Button size="small" disabled={idx === provinceDraft.length - 1} onClick={() => moveProvince(idx, 1)}>↓</Button>
                <Button size="small" danger onClick={() => removeProvinceFromDraft(name)}>删除</Button>
              </div>
            )
          })}
        </div>
      </Modal>
    </Space>
  )
}
