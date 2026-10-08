// 便民工具 / 小程序: what the app's tools grid shows, in this order. 小程序 are
// web pages opened inside the app — an external https URL, or a zipped
// static site uploaded here (served from the media CDN). 内置工具 are the
// app's own tools: they can be renamed, hidden and moved, not deleted.
// Changes go live in the app without an app release.
import { useEffect, useState } from 'react'
import {
  Table, Button, Space, Switch, Popconfirm, Typography, message, Tooltip, Tag,
  Modal, Form, Input, Radio, Upload, Alert,
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, LinkOutlined, HolderOutlined, OrderedListOutlined } from '@ant-design/icons'
import { adminApi } from '../../api/admin'
import { SortableList } from '../../components/SortableList'
import type { MiniApp, MiniAppInput } from '../../types'

const { Title, Paragraph, Text } = Typography

type EditTarget = { mode: 'create' } | { mode: 'edit'; data: MiniApp } | null

export function MiniAppListPage() {
  const [items, setItems] = useState<MiniApp[]>([])
  const [loading, setLoading] = useState(true)
  const [target, setTarget] = useState<EditTarget>(null)
  const [form] = Form.useForm()
  const [iconFile, setIconFile] = useState<File | null>(null)
  const [bundleFile, setBundleFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const source = Form.useWatch('source', form)
  const [sorting, setSorting] = useState(false)
  const [reordering, setReordering] = useState(false)
  const isBuiltin = target?.mode === 'edit' && target.data.kind === 'builtin'

  async function reorder(ids: number[]) {
    const byId = new Map(items.map(a => [a.id, a]))
    setItems(ids.map(id => byId.get(id)!))  // optimistic
    setReordering(true)
    try {
      setItems((await adminApi.reorderMiniApps(ids)).data)
    } catch {
      message.error('排序保存失败')
      load()
    } finally {
      setReordering(false)
    }
  }

  function Icon({ a, size = 44 }: { a: MiniApp; size?: number }) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 12, background: a.kind === 'builtin' ? '#EEF2F7' : '#F6E3E3', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.45, color: a.kind === 'builtin' ? '#4A5568' : '#B8333A',
      }}>
        {a.kind === 'builtin' ? <span style={{ fontWeight: 700, fontSize: size * 0.36 }}>{a.name.slice(0, 1)}</span>
          : a.icon_url ? <img src={a.icon_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className={a.icon_fa} />}
      </div>
    )
  }

  async function load() {
    setLoading(true)
    try {
      setItems((await adminApi.getMiniApps()).data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function toggleActive(app: MiniApp, val: boolean) {
    await adminApi.updateMiniApp(app.id, { is_active: val })
    setItems(prev => prev.map(a => a.id === app.id ? { ...a, is_active: val } : a))
  }

  function openCreate() {
    form.resetFields()
    form.setFieldsValue({ source: 'bundle', requires_login: true, is_active: false, order: 0, icon_fa: 'fa-solid fa-cube' })
    setIconFile(null)
    setBundleFile(null)
    setTarget({ mode: 'create' })
  }

  function openEdit(a: MiniApp) {
    form.setFieldsValue({ ...a, countries: a.countries.join(', ') })
    setIconFile(null)
    setBundleFile(null)
    setTarget({ mode: 'edit', data: a })
  }

  async function handleSubmit() {
    const values = await form.validateFields()
    const payload: MiniAppInput = {
      ...values,
      countries: (values.countries || '').toString(),
      icon: iconFile ?? undefined,
      bundle: values.source === 'bundle' ? bundleFile ?? undefined : undefined,
    }
    if (target?.mode === 'create' && values.source === 'bundle' && !bundleFile) {
      message.warning('请上传网页包（.zip）')
      return
    }
    setSaving(true)
    try {
      if (target?.mode === 'edit') {
        await adminApi.updateMiniApp(target.data.id, payload)
        message.success('已保存，App 里立即生效')
      } else {
        await adminApi.createMiniApp(payload)
        message.success('小程序已创建')
      }
      setTarget(null)
      load()
    } catch (e: any) {
      message.error(e?.response?.data?.detail || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    { title: '#', width: 44, render: (_: unknown, __: MiniApp, i: number) => <Text type="secondary">{i + 1}</Text> },
    { title: '图标', width: 64, render: (_: unknown, a: MiniApp) => <Icon a={a} /> },
    {
      title: '名称',
      render: (_: unknown, a: MiniApp) => (
        <Space direction="vertical" size={2}>
          <span style={{ fontWeight: 600 }}>
            {a.name}{' '}
            {a.kind === 'builtin' ? <Tag>内置工具</Tag> : <Text type="secondary" style={{ fontSize: 12 }}>/{a.slug}</Text>}
          </span>
          {a.description && <span style={{ fontSize: 12, color: '#888' }}>{a.description}</span>}
        </Space>
      ),
    },
    {
      title: '内容',
      width: 220,
      render: (_: unknown, a: MiniApp) => a.kind === 'builtin' ? <Text type="secondary">App 内置功能</Text> : a.entry_url ? (
        <Space direction="vertical" size={2}>
          <Tag color={a.source === 'bundle' ? 'purple' : 'blue'}>{a.source === 'bundle' ? `网页包 · ${a.bundle_version}` : '外部网址'}</Tag>
          <a href={a.entry_url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}><LinkOutlined /> 预览</a>
        </Space>
      ) : <Tag color="orange">未上传</Tag>,
    },
    {
      title: '国家',
      width: 90,
      render: (_: unknown, a: MiniApp) => a.countries.length ? a.countries.join(', ') : '全部',
    },
    {
      title: '上线',
      width: 72,
      render: (_: unknown, a: MiniApp) => (
        <Switch size="small" checked={a.is_active} disabled={a.kind === 'web' && !a.entry_url} onChange={v => toggleActive(a, v)} />
      ),
    },
    {
      title: '操作',
      width: 100,
      render: (_: unknown, a: MiniApp) => (
        <Space>
          <Tooltip title="编辑"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(a)} /></Tooltip>
          {a.kind === 'web' && (
            <Popconfirm title="删除这个小程序？" onConfirm={async () => { await adminApi.deleteMiniApp(a.id); load() }}>
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 12 }}>
        <Title level={4} style={{ margin: 0 }}>便民工具 · 小程序</Title>
        <Space>
          <Button icon={<OrderedListOutlined />} onClick={() => setSorting(true)}>调整顺序</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建小程序</Button>
        </Space>
      </Space>

      <Table rowKey="id" loading={loading} dataSource={items} columns={columns} pagination={false} />

      <Modal open={sorting} title="调整便民工具顺序" footer={null} onCancel={() => setSorting(false)} width={460}>
        <Paragraph type="secondary">拖动调整顺序，App 里「便民工具」按这个顺序显示（每页 6 个）。松手后自动保存。</Paragraph>
        <SortableList items={items} onReorder={reorder} disabled={reordering}>
          {(a, dragging) => (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px', marginBottom: 6, borderRadius: 10,
              border: '1px solid #E5E7EB', background: dragging ? '#F3F4F6' : '#fff', opacity: a.is_active ? 1 : 0.5, cursor: 'grab',
            }}>
              <HolderOutlined style={{ color: '#9CA3AF' }} />
              <Icon a={a} size={32} />
              <span style={{ flex: 1, fontWeight: 600 }}>{a.name}</span>
              {a.kind === 'builtin' && <Tag>内置</Tag>}
              {!a.is_active && <Tag>已下线</Tag>}
            </div>
          )}
        </SortableList>
      </Modal>

      <Modal
        open={!!target} title={target?.mode === 'edit' ? `编辑：${target.data.name}${isBuiltin ? '（内置工具）' : ''}` : '新建小程序'}
        onCancel={() => setTarget(null)} onOk={handleSubmit} confirmLoading={saving} okText="保存" width={560} destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请填写名称' }]}>
            <Input maxLength={20} placeholder="如：驾照服务" />
          </Form.Item>
          {target?.mode === 'create' && (
            <Form.Item name="slug" label="英文标识（地址里用，创建后不能改）" rules={[{ required: true, message: '请填写英文标识' }]}>
              <Input maxLength={40} placeholder="如：driving-license" />
            </Form.Item>
          )}
          {!isBuiltin && <>
          <Form.Item name="description" label="简介">
            <Input maxLength={120} />
          </Form.Item>

          <Form.Item label="图标">
            <Space>
              <Upload accept="image/*" maxCount={1} beforeUpload={f => { setIconFile(f); return false }} onRemove={() => setIconFile(null)}>
                <Button icon={<UploadOutlined />}>上传图标图片</Button>
              </Upload>
              <Form.Item name="icon_fa" noStyle><Input style={{ width: 200 }} placeholder="或 Font Awesome：fa-solid fa-car" /></Form.Item>
            </Space>
          </Form.Item>

          <Form.Item name="source" label="内容">
            <Radio.Group>
              <Radio.Button value="bundle">上传网页包（.zip）</Radio.Button>
              <Radio.Button value="url">外部网址</Radio.Button>
            </Radio.Group>
          </Form.Item>
          {source === 'url' ? (
            <Form.Item name="url" label="网址" rules={[{ required: true, type: 'url', message: '请填写 https:// 网址' }]}>
              <Input placeholder="https://..." />
            </Form.Item>
          ) : (
            <Form.Item label={target?.mode === 'edit' && target.data.bundle_version ? `网页包（当前版本 ${target.data.bundle_version}，上传新包即替换）` : '网页包'}>
              <Upload accept=".zip" maxCount={1} beforeUpload={f => { setBundleFile(f); return false }} onRemove={() => setBundleFile(null)}>
                <Button icon={<UploadOutlined />}>选择 .zip</Button>
              </Upload>
              <Alert style={{ marginTop: 8 }} type="info" showIcon
                message="把网站文件夹压缩成 zip 上传，里面要有 index.html（最大 20MB）。只支持静态网页文件（html/css/js/图片/字体/视频）。" />
            </Form.Item>
          )}
          </>}

          <Space size="large" wrap>
            {!isBuiltin && <Form.Item name="requires_login" label="需要登录" valuePropName="checked"><Switch /></Form.Item>}
            <Form.Item name="is_active" label="上线" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="countries" label="只在这些国家显示"><Input placeholder="留空 = 全部；如 IT, ES" style={{ width: 180 }} /></Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  )
}
