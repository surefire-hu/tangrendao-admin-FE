import { useEffect, useMemo, useState } from 'react'
import {
  Card, Button, Space, Modal, Form, Input, InputNumber, Tooltip, Select,
  Typography, Empty, Spin, Popconfirm, message, Tag, Row, Col, List, Avatar,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  FolderOutlined, AppstoreOutlined, TagsOutlined, ArrowRightOutlined,
} from '@ant-design/icons'
import { adminApi } from '../../api/admin'
import type {
  NavCategory, NavSection, NavItem,
  NavCategoryInput, NavSectionInput, NavItemInput,
} from '../../types'

const { Title, Text } = Typography

// 3-column master-detail. Pick a category → see its sections. Pick a section
// → see its items. Every column owns its own create / edit / delete affordance
// so we never bury actions inside nested panels.

// System-reserved category slugs that drive features outside the navigation
// menu itself. The labels are shown as small badges in the left column so a
// moderator knows what they're editing affects.
const SYSTEM_SLUGS: Record<string, { label: string; color: string }> = {
  housing:       { label: '房源 类型', color: 'geekblue' },
  market:        { label: '买卖 类型', color: 'geekblue' },
  local_service: { label: '本地服务 类型', color: 'geekblue' },
  jobs:          { label: '招聘 行业/工种', color: 'volcano' },
  reviews:       { label: '大众点评 导航', color: 'green' },
  signal:        { label: '心动信号', color: 'magenta' },
}

// Extra facets the FE renders alongside the section's items. Items already
// act as the "分类" picker; these are the additional dimensions defined in
// 服务.xmind (e.g. 装修 → 类型 + 工价).
const FACET_OPTIONS = ['类型', '工价', '岗位'] as const

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

  const [activeCatId, setActiveCatId] = useState<number | null>(null)
  const [activeSecId, setActiveSecId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getNavigation()
      setData(res.data)
      // Keep selection sticky when possible; otherwise fall back to first row.
      setActiveCatId(prev => {
        if (prev != null && res.data.some(c => c.id === prev)) return prev
        return res.data[0]?.id ?? null
      })
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const activeCat = useMemo(
    () => data.find(c => c.id === activeCatId) ?? null,
    [data, activeCatId],
  )

  // When the active category changes, pick its first section by default so the
  // right pane is never empty if there's something to show.
  useEffect(() => {
    if (!activeCat) { setActiveSecId(null); return }
    setActiveSecId(prev => {
      if (prev != null && activeCat.sections.some(s => s.id === prev)) return prev
      return activeCat.sections[0]?.id ?? null
    })
  }, [activeCat])

  const activeSec = useMemo(
    () => activeCat?.sections.find(s => s.id === activeSecId) ?? null,
    [activeCat, activeSecId],
  )

  useEffect(() => {
    if (!target) return
    if (target.mode === 'edit') {
      form.setFieldsValue(target.data as any)
    } else {
      form.resetFields()
      form.setFieldsValue({ display_order: 0 })
    }
  }, [target, form])

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
        else                          await adminApi.updateNavCategory(target.data.id, payload)
      } else if (target.kind === 'section') {
        const facets: string[] = Array.isArray(values.facets) ? values.facets : []
        if (target.mode === 'create') {
          const payload: NavSectionInput = {
            category: target.categoryId, title: values.title,
            display_order: Number(values.display_order) || 0,
            facets,
          }
          await adminApi.createNavSection(payload)
        } else {
          await adminApi.updateNavSection(target.data.id, {
            title: values.title,
            display_order: Number(values.display_order) || 0,
            facets,
          })
        }
      } else {
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
      if (kind === 'category')      await adminApi.deleteNavCategory(id)
      else if (kind === 'section')  await adminApi.deleteNavSection(id)
      else                          await adminApi.deleteNavItem(id)
      message.success('已删除')
      // Reset selection downstream if we just removed what was selected.
      if (kind === 'category' && id === activeCatId) setActiveCatId(null)
      if (kind === 'section'  && id === activeSecId) setActiveSecId(null)
      load()
    } catch (e: any) {
      message.error(e?.response?.data?.error || '删除失败')
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const colHeader = (icon: React.ReactNode, label: string, count: number, onCreate?: () => void, createLabel = '新建') => (
    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
      <Space>
        {icon}
        <Text strong>{label}</Text>
        <Tag>{count}</Tag>
      </Space>
      {onCreate && (
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          {createLabel}
        </Button>
      )}
    </Space>
  )

  const rowActions = (onEdit: () => void, onDelete: () => void, confirmText: string) => (
    <Space size={4} onClick={e => e.stopPropagation()}>
      <Tooltip title="编辑">
        <Button size="small" type="text" icon={<EditOutlined />} onClick={onEdit} />
      </Tooltip>
      <Popconfirm title={confirmText} okText="删除" cancelText="取消" onConfirm={onDelete}>
        <Tooltip title="删除"><Button size="small" type="text" danger icon={<DeleteOutlined />} /></Tooltip>
      </Popconfirm>
    </Space>
  )

  return (
    <div style={{ padding: 24, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Space style={{ marginBottom: 4, width: '100%', justifyContent: 'space-between' }}>
        <Title level={3} style={{ margin: 0 }}>服务导航管理</Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={load}>刷新</Button>
        </Space>
      </Space>
      <Text type="secondary">
        编辑 /api/services/navigation/ 返回的分类 / 分区 / 项。点选左列查看分区，再点选分区查看项。
      </Text>

      <Spin spinning={loading}>
        <Row gutter={16} style={{ marginTop: 16 }}>
          {/* ── Categories ── */}
          <Col xs={24} md={7}>
            <Card
              size="small"
              title={colHeader(<FolderOutlined />, '分类', data.length,
                              () => setTarget({ kind: 'category', mode: 'create' }), '新建分类')}
              bodyStyle={{ padding: 0, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}
            >
              {data.length === 0 ? (
                <Empty style={{ padding: 32 }} description="暂无分类" />
              ) : (
                <List
                  dataSource={data}
                  rowKey="id"
                  renderItem={cat => {
                    const selected = cat.id === activeCatId
                    return (
                      <List.Item
                        onClick={() => setActiveCatId(cat.id)}
                        style={{
                          padding: '10px 16px',
                          cursor: 'pointer',
                          background: selected ? 'rgba(22,119,255,0.08)' : undefined,
                          borderLeft: selected ? '3px solid #1677ff' : '3px solid transparent',
                        }}
                        actions={[rowActions(
                          () => setTarget({ kind: 'category', mode: 'edit', data: cat }),
                          () => handleDelete('category', cat.id),
                          '删除该分类及其所有分区/项？',
                        )]}
                      >
                        <List.Item.Meta
                          avatar={<Avatar size={24} icon={<FolderOutlined />} style={{ background: '#1677ff' }} />}
                          title={
                            <Space>
                              <Text strong>{cat.label}</Text>
                              <Text code style={{ fontSize: 11 }}>{cat.slug}</Text>
                              {SYSTEM_SLUGS[cat.slug] && (
                                <Tag color={SYSTEM_SLUGS[cat.slug].color} style={{ margin: 0 }}>
                                  {SYSTEM_SLUGS[cat.slug].label}
                                </Tag>
                              )}
                            </Space>
                          }
                          description={
                            <Space size={6}>
                              <Tag style={{ margin: 0 }}>排序 {cat.display_order}</Tag>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {cat.sections.length} 分区
                              </Text>
                            </Space>
                          }
                        />
                      </List.Item>
                    )
                  }}
                />
              )}
            </Card>
          </Col>

          {/* ── Sections ── */}
          <Col xs={24} md={8}>
            <Card
              size="small"
              title={colHeader(
                <AppstoreOutlined />,
                activeCat ? `${activeCat.label} 的分区` : '分区',
                activeCat?.sections.length ?? 0,
                activeCat ? () => setTarget({ kind: 'section', mode: 'create', categoryId: activeCat.id }) : undefined,
                '新建分区',
              )}
              bodyStyle={{ padding: 0, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}
            >
              {!activeCat ? (
                <Empty style={{ padding: 32 }} description="请选择左侧分类" />
              ) : activeCat.sections.length === 0 ? (
                <Empty style={{ padding: 32 }} description="该分类暂无分区" />
              ) : (
                <List
                  dataSource={activeCat.sections}
                  rowKey="id"
                  renderItem={sec => {
                    const selected = sec.id === activeSecId
                    return (
                      <List.Item
                        onClick={() => setActiveSecId(sec.id)}
                        style={{
                          padding: '10px 16px',
                          cursor: 'pointer',
                          background: selected ? 'rgba(22,119,255,0.08)' : undefined,
                          borderLeft: selected ? '3px solid #1677ff' : '3px solid transparent',
                        }}
                        actions={[rowActions(
                          () => setTarget({ kind: 'section', mode: 'edit', data: sec, categoryId: activeCat.id }),
                          () => handleDelete('section', sec.id),
                          '删除该分区及其所有项？',
                        )]}
                      >
                        <List.Item.Meta
                          avatar={<Avatar size={24} icon={<AppstoreOutlined />} style={{ background: '#52c41a' }} />}
                          title={
                            <Space>
                              <Text strong>{sec.title}</Text>
                              {(sec.facets ?? []).map(f => (
                                <Tag key={f} color="purple" style={{ margin: 0 }}>{f}</Tag>
                              ))}
                            </Space>
                          }
                          description={
                            <Space size={6}>
                              <Tag style={{ margin: 0 }}>排序 {sec.display_order}</Tag>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {sec.items.length} 项
                              </Text>
                              <ArrowRightOutlined style={{ color: '#999' }} />
                            </Space>
                          }
                        />
                      </List.Item>
                    )
                  }}
                />
              )}
            </Card>
          </Col>

          {/* ── Items ── */}
          <Col xs={24} md={9}>
            <Card
              size="small"
              title={colHeader(
                <TagsOutlined />,
                activeSec ? `${activeSec.title} 的项` : '项',
                activeSec?.items.length ?? 0,
                activeSec ? () => setTarget({ kind: 'item', mode: 'create', sectionId: activeSec.id }) : undefined,
                '新建项',
              )}
              bodyStyle={{ padding: 0, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}
            >
              {!activeSec ? (
                <Empty style={{ padding: 32 }} description="请选择中间分区" />
              ) : activeSec.items.length === 0 ? (
                <Empty style={{ padding: 32 }} description="该分区暂无项" />
              ) : (
                <List
                  dataSource={activeSec.items}
                  rowKey="id"
                  renderItem={item => (
                    <List.Item
                      style={{ padding: '10px 16px' }}
                      actions={[rowActions(
                        () => setTarget({ kind: 'item', mode: 'edit', data: item, sectionId: activeSec.id }),
                        () => handleDelete('item', item.id),
                        '删除该项？',
                      )]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar size={24} icon={<TagsOutlined />} style={{ background: '#fa8c16' }} />}
                        title={
                          <Space>
                            <Text strong>{item.label}</Text>
                            <Text code style={{ fontSize: 11 }}>{item.slug}</Text>
                          </Space>
                        }
                        description={
                          <Space size={6}>
                            <Tag style={{ margin: 0 }}>排序 {item.display_order}</Tag>
                            {item.icon_name && <Tag color="blue" style={{ margin: 0 }}>{item.icon_name}</Tag>}
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>
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
            <>
              <Form.Item name="title" label="标题" rules={[{ required: true, max: 50 }]}>
                <Input placeholder="分区标题" />
              </Form.Item>
              <Form.Item
                name="facets"
                label="额外筛选维度 (可选)"
                tooltip="客户端在该分区下渲染的额外 chip 选择器，分类(items) / 所在地区 / 供求 已默认启用"
              >
                <Select
                  mode="multiple"
                  allowClear
                  placeholder="选择需要的维度"
                  options={FACET_OPTIONS.map(f => ({ value: f, label: f }))}
                />
              </Form.Item>
            </>
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
