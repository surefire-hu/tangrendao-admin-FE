import { useEffect, useMemo, useState } from 'react'
import {
  Card, Button, Space, Modal, Form, Input, InputNumber, Tooltip, Select,
  Typography, Empty, Spin, Popconfirm, message, Tag, Row, Col, Avatar,
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined,
  FolderOutlined, AppstoreOutlined, TagsOutlined, FolderOpenOutlined,
  HolderOutlined,
} from '@ant-design/icons'
import { adminApi } from '../../api/admin'
import { SortableList } from '../../components/SortableList'
import type {
  NavCategory, NavGroup, NavSection, NavItem,
  NavCategoryInput, NavGroupInput, NavSectionInput, NavItemInput,
} from '../../types'

const { Title, Text } = Typography

// 4-column master-detail: Categories → Groups → Sections → Items.
// Each column supports drag-to-reorder (HTML5 native DnD), and column header
// has a "新建" button. Sections may live under a group OR directly under the
// category — col 3 reflects whichever filter is active in col 2.

const SYSTEM_SLUGS: Record<string, { label: string; color: string }> = {
  housing:       { label: '房源 类型', color: 'geekblue' },
  market:        { label: '买卖 类型', color: 'geekblue' },
  local_service: { label: '本地服务',  color: 'geekblue' },
  jobs:          { label: '招聘 行业', color: 'volcano' },
  reviews:       { label: '大众点评',  color: 'green' },
  signal:        { label: '心动信号',  color: 'magenta' },
}

const FACET_OPTIONS = ['类型', '工价', '岗位'] as const

const NO_GROUP_KEY = -1 // sentinel for "未分组" view in col 2

type EditTarget =
  | { kind: 'category'; mode: 'create' } | { kind: 'category'; mode: 'edit'; data: NavCategory }
  | { kind: 'group';    mode: 'create'; categoryId: number } | { kind: 'group'; mode: 'edit'; data: NavGroup; categoryId: number }
  | { kind: 'section';  mode: 'create'; categoryId: number; groupId: number | null } | { kind: 'section'; mode: 'edit'; data: NavSection; categoryId: number }
  | { kind: 'item';     mode: 'create'; sectionId: number } | { kind: 'item'; mode: 'edit'; data: NavItem; sectionId: number }
  | null

export function NavigationPage() {
  const [data, setData] = useState<NavCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [target, setTarget] = useState<EditTarget>(null)
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [reordering, setReordering] = useState(false)

  const [activeCatId, setActiveCatId] = useState<number | null>(null)
  // null = "全部" filter (show every section). NO_GROUP_KEY = sections with no group.
  const [activeGroupFilter, setActiveGroupFilter] = useState<number | null>(null)
  const [activeSecId, setActiveSecId] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getNavigation()
      setData(res.data)
      setActiveCatId(prev => prev != null && res.data.some(c => c.id === prev) ? prev : res.data[0]?.id ?? null)
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

  // Reset downstream when category changes.
  useEffect(() => {
    setActiveGroupFilter(null)
    setActiveSecId(null)
  }, [activeCatId])

  const visibleSections = useMemo(() => {
    if (!activeCat) return []
    if (activeGroupFilter === null) return activeCat.sections
    if (activeGroupFilter === NO_GROUP_KEY) return activeCat.sections.filter(s => s.group == null)
    return activeCat.sections.filter(s => s.group === activeGroupFilter)
  }, [activeCat, activeGroupFilter])

  // Pin first visible section when filter changes.
  useEffect(() => {
    setActiveSecId(prev => {
      if (prev != null && visibleSections.some(s => s.id === prev)) return prev
      return visibleSections[0]?.id ?? null
    })
  }, [visibleSections])

  const activeSec = useMemo(
    () => visibleSections.find(s => s.id === activeSecId) ?? null,
    [visibleSections, activeSecId],
  )

  useEffect(() => {
    if (!target) return
    if (target.mode === 'edit') {
      const d: any = target.data
      form.setFieldsValue({
        ...d,
        // section.group is the FK id; coerce undefined to null for Select clearing.
        group: target.kind === 'section' ? (d.group ?? null) : undefined,
      })
    } else {
      form.resetFields()
      form.setFieldsValue({ display_order: 0 })
      // Pre-fill group for sections created from a specific group filter.
      if (target.kind === 'section' && target.groupId != null) {
        form.setFieldsValue({ group: target.groupId })
      }
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
      } else if (target.kind === 'group') {
        if (target.mode === 'create') {
          const payload: NavGroupInput = {
            category: target.categoryId, title: values.title,
            display_order: Number(values.display_order) || 0,
          }
          await adminApi.createNavGroup(payload)
        } else {
          await adminApi.updateNavGroup(target.data.id, {
            title: values.title, display_order: Number(values.display_order) || 0,
          })
        }
      } else if (target.kind === 'section') {
        const facets: string[] = Array.isArray(values.facets) ? values.facets : []
        const groupVal = values.group === undefined ? null : values.group
        if (target.mode === 'create') {
          const payload: NavSectionInput = {
            category: target.categoryId, title: values.title,
            icon_name: values.icon_name || '',
            group: groupVal,
            display_order: Number(values.display_order) || 0,
            facets,
          }
          await adminApi.createNavSection(payload)
        } else {
          await adminApi.updateNavSection(target.data.id, {
            title: values.title,
            icon_name: values.icon_name || '',
            group: groupVal,
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

  const handleDelete = async (kind: 'category' | 'group' | 'section' | 'item', id: number) => {
    try {
      if      (kind === 'category') await adminApi.deleteNavCategory(id)
      else if (kind === 'group')    await adminApi.deleteNavGroup(id)
      else if (kind === 'section')  await adminApi.deleteNavSection(id)
      else                          await adminApi.deleteNavItem(id)
      message.success('已删除')
      if (kind === 'category' && id === activeCatId) setActiveCatId(null)
      if (kind === 'group' && id === activeGroupFilter) setActiveGroupFilter(null)
      if (kind === 'section' && id === activeSecId) setActiveSecId(null)
      load()
    } catch (e: any) {
      message.error(e?.response?.data?.error || '删除失败')
    }
  }

  // ── Reorder helpers: PATCH each row's display_order to its new index ─────
  //
  // We don't bulk-reorder server-side; sending N PATCH requests in parallel is
  // fine because the navigation table is tiny (a few dozen rows per col).

  async function persistReorder(
    newIds: number[],
    patch: (id: number, order: number) => Promise<any>,
  ) {
    setReordering(true)
    try {
      await Promise.all(newIds.map((id, idx) => patch(id, idx + 1)))
      await load()
    } catch (e: any) {
      message.error('排序失败')
    } finally {
      setReordering(false)
    }
  }

  const reorderCategories = (ids: number[]) =>
    persistReorder(ids, (id, order) => adminApi.updateNavCategory(id, { display_order: order }))

  const reorderGroups = (ids: number[]) =>
    persistReorder(ids, (id, order) => adminApi.updateNavGroup(id, { display_order: order }))

  const reorderSections = (ids: number[]) =>
    persistReorder(ids, (id, order) => adminApi.updateNavSection(id, { display_order: order }))

  const reorderItems = (ids: number[]) =>
    persistReorder(ids, (id, order) => adminApi.updateNavItem(id, { display_order: order }))

  // ── Render ───────────────────────────────────────────────────────────────

  const colHeader = (
    icon: React.ReactNode, label: string, count: number,
    onCreate?: () => void, createLabel = '新建',
  ) => (
    <Space style={{ width: '100%', justifyContent: 'space-between' }}>
      <Space>{icon}<Text strong>{label}</Text><Tag>{count}</Tag></Space>
      {onCreate && (
        <Button size="small" type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          {createLabel}
        </Button>
      )}
    </Space>
  )

  const rowActions = (onEdit: () => void, onDelete: () => void, confirmText: string) => (
    <Space size={0} onClick={e => e.stopPropagation()}>
      <Tooltip title="编辑">
        <Button size="small" type="text" icon={<EditOutlined />} onClick={onEdit} />
      </Tooltip>
      <Popconfirm title={confirmText} okText="删除" cancelText="取消" onConfirm={onDelete}>
        <Tooltip title="删除"><Button size="small" type="text" danger icon={<DeleteOutlined />} /></Tooltip>
      </Popconfirm>
    </Space>
  )

  // Section row helper: shared by sortable + non-sortable fallback.
  const sectionRowContent = (sec: NavSection, selected: boolean) => (
    <Space style={{
      padding: '10px 12px', cursor: 'pointer',
      background: selected ? 'rgba(22,119,255,0.08)' : undefined,
      borderLeft: selected ? '3px solid #1677ff' : '3px solid transparent',
      width: '100%', justifyContent: 'space-between',
    }} onClick={() => setActiveSecId(sec.id)}>
      <Space>
        <HolderOutlined style={{ color: '#bbb' }} />
        <Avatar size={24} icon={<AppstoreOutlined />} style={{ background: '#52c41a' }} />
        <div>
          <Space size={6}>
            <Text strong>{sec.title}</Text>
            {sec.icon_name && <Tag color="blue" style={{ margin: 0 }}>{sec.icon_name}</Tag>}
            {(sec.facets ?? []).map(f => (
              <Tag key={f} color="purple" style={{ margin: 0 }}>{f}</Tag>
            ))}
          </Space>
          <div>
            <Space size={6}>
              <Tag style={{ margin: 0 }}>排序 {sec.display_order}</Tag>
              {sec.group_title && <Tag color="orange" style={{ margin: 0 }}>{sec.group_title}</Tag>}
              <Text type="secondary" style={{ fontSize: 12 }}>{sec.items.length} 项</Text>
            </Space>
          </div>
        </div>
      </Space>
      {rowActions(
        () => setTarget({ kind: 'section', mode: 'edit', data: sec, categoryId: activeCatId! }),
        () => handleDelete('section', sec.id),
        '删除该分区及其所有项？',
      )}
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
        拖拽行可调整顺序；选择左侧逐级钻取。本地服务用「生活服务/移民服务」分组；其他类目按需添加分组。
      </Text>

      <Spin spinning={loading || reordering}>
        <Row gutter={12} style={{ marginTop: 16 }}>
          {/* ── Col 1: Categories ── */}
          <Col xs={24} md={6}>
            <Card
              size="small"
              title={colHeader(<FolderOutlined />, '类目', data.length,
                              () => setTarget({ kind: 'category', mode: 'create' }), '新建')}
              bodyStyle={{ padding: 0, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}
            >
              {data.length === 0 ? <Empty style={{ padding: 32 }} description="暂无类目" /> : (
                <SortableList items={data} onReorder={reorderCategories} disabled={reordering}>
                  {(cat) => {
                    const selected = cat.id === activeCatId
                    return (
                      <Space style={{
                        padding: '10px 12px', cursor: 'pointer',
                        background: selected ? 'rgba(22,119,255,0.08)' : undefined,
                        borderLeft: selected ? '3px solid #1677ff' : '3px solid transparent',
                        width: '100%', justifyContent: 'space-between',
                      }} onClick={() => setActiveCatId(cat.id)}>
                        <Space>
                          <HolderOutlined style={{ color: '#bbb' }} />
                          <Avatar size={24} icon={<FolderOutlined />} style={{ background: '#1677ff' }} />
                          <div>
                            <Space>
                              <Text strong>{cat.label}</Text>
                              <Text code style={{ fontSize: 11 }}>{cat.slug}</Text>
                            </Space>
                            <div>
                              <Space size={6}>
                                <Tag style={{ margin: 0 }}>排序 {cat.display_order}</Tag>
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {cat.groups.length}组 · {cat.sections.length}区
                                </Text>
                              </Space>
                            </div>
                          </div>
                        </Space>
                        {rowActions(
                          () => setTarget({ kind: 'category', mode: 'edit', data: cat }),
                          () => handleDelete('category', cat.id),
                          '删除该类目及其所有分组/分区/项？',
                        )}
                      </Space>
                    )
                  }}
                </SortableList>
              )}
            </Card>
          </Col>

          {/* ── Col 2: Groups ── */}
          <Col xs={24} md={5}>
            <Card
              size="small"
              title={colHeader(
                <FolderOpenOutlined />,
                activeCat ? `${activeCat.label} 分组` : '分组',
                activeCat?.groups.length ?? 0,
                activeCat ? () => setTarget({ kind: 'group', mode: 'create', categoryId: activeCat.id }) : undefined,
                '新建',
              )}
              bodyStyle={{ padding: 0, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}
            >
              {!activeCat ? <Empty style={{ padding: 32 }} description="请先选择类目" /> : (
                <>
                  {/* "全部" + "未分组" pseudo-rows for filter convenience */}
                  <div
                    onClick={() => setActiveGroupFilter(null)}
                    style={{
                      padding: '10px 12px', cursor: 'pointer',
                      background: activeGroupFilter === null ? 'rgba(22,119,255,0.08)' : undefined,
                      borderLeft: activeGroupFilter === null ? '3px solid #1677ff' : '3px solid transparent',
                    }}
                  >
                    <Space>
                      <Text strong>全部</Text>
                      <Tag>{activeCat.sections.length}</Tag>
                    </Space>
                  </div>
                  {activeCat.sections.some(s => s.group == null) && (
                    <div
                      onClick={() => setActiveGroupFilter(NO_GROUP_KEY)}
                      style={{
                        padding: '10px 12px', cursor: 'pointer',
                        background: activeGroupFilter === NO_GROUP_KEY ? 'rgba(22,119,255,0.08)' : undefined,
                        borderLeft: activeGroupFilter === NO_GROUP_KEY ? '3px solid #1677ff' : '3px solid transparent',
                      }}
                    >
                      <Space>
                        <Text type="secondary">未分组</Text>
                        <Tag>{activeCat.sections.filter(s => s.group == null).length}</Tag>
                      </Space>
                    </div>
                  )}
                  <SortableList items={activeCat.groups} onReorder={reorderGroups} disabled={reordering}>
                    {(grp) => {
                      const selected = grp.id === activeGroupFilter
                      const count = activeCat.sections.filter(s => s.group === grp.id).length
                      return (
                        <Space style={{
                          padding: '10px 12px', cursor: 'pointer',
                          background: selected ? 'rgba(22,119,255,0.08)' : undefined,
                          borderLeft: selected ? '3px solid #1677ff' : '3px solid transparent',
                          width: '100%', justifyContent: 'space-between',
                        }} onClick={() => setActiveGroupFilter(grp.id)}>
                          <Space>
                            <HolderOutlined style={{ color: '#bbb' }} />
                            <Avatar size={24} icon={<FolderOpenOutlined />} style={{ background: '#fa8c16' }} />
                            <div>
                              <Text strong>{grp.title}</Text>
                              <div>
                                <Space size={6}>
                                  <Tag style={{ margin: 0 }}>排序 {grp.display_order}</Tag>
                                  <Text type="secondary" style={{ fontSize: 12 }}>{count} 区</Text>
                                </Space>
                              </div>
                            </div>
                          </Space>
                          {rowActions(
                            () => setTarget({ kind: 'group', mode: 'edit', data: grp, categoryId: activeCat.id }),
                            () => handleDelete('group', grp.id),
                            '删除该分组？分区会变为「未分组」。',
                          )}
                        </Space>
                      )
                    }}
                  </SortableList>
                </>
              )}
            </Card>
          </Col>

          {/* ── Col 3: Sections ── */}
          <Col xs={24} md={7}>
            <Card
              size="small"
              title={colHeader(
                <AppstoreOutlined />,
                activeCat ? '分区' : '分区',
                visibleSections.length,
                activeCat ? () => setTarget({
                  kind: 'section', mode: 'create', categoryId: activeCat.id,
                  groupId: typeof activeGroupFilter === 'number' && activeGroupFilter !== NO_GROUP_KEY
                    ? activeGroupFilter : null,
                }) : undefined,
                '新建',
              )}
              bodyStyle={{ padding: 0, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}
            >
              {!activeCat ? <Empty style={{ padding: 32 }} description="请先选择类目" /> :
                visibleSections.length === 0 ? <Empty style={{ padding: 32 }} description="暂无分区" /> : (
                <SortableList items={visibleSections} onReorder={reorderSections} disabled={reordering}>
                  {(sec) => sectionRowContent(sec, sec.id === activeSecId)}
                </SortableList>
              )}
            </Card>
          </Col>

          {/* ── Col 4: Items ── */}
          <Col xs={24} md={6}>
            <Card
              size="small"
              title={colHeader(
                <TagsOutlined />,
                activeSec ? `${activeSec.title} 项` : '项',
                activeSec?.items.length ?? 0,
                activeSec ? () => setTarget({ kind: 'item', mode: 'create', sectionId: activeSec.id }) : undefined,
                '新建',
              )}
              bodyStyle={{ padding: 0, maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}
            >
              {!activeSec ? <Empty style={{ padding: 32 }} description="请选择分区" /> :
                activeSec.items.length === 0 ? <Empty style={{ padding: 32 }} description="暂无项" /> : (
                <SortableList items={activeSec.items} onReorder={reorderItems} disabled={reordering}>
                  {(item) => (
                    <Space style={{
                      padding: '10px 12px', width: '100%', justifyContent: 'space-between',
                    }}>
                      <Space>
                        <HolderOutlined style={{ color: '#bbb' }} />
                        <Avatar size={24} icon={<TagsOutlined />} style={{ background: '#fa541c' }} />
                        <div>
                          <Space>
                            <Text strong>{item.label}</Text>
                            <Text code style={{ fontSize: 11 }}>{item.slug}</Text>
                          </Space>
                          <div>
                            <Space size={6}>
                              <Tag style={{ margin: 0 }}>排序 {item.display_order}</Tag>
                              {item.icon_name && <Tag color="blue" style={{ margin: 0 }}>{item.icon_name}</Tag>}
                            </Space>
                          </div>
                        </div>
                      </Space>
                      {rowActions(
                        () => setTarget({ kind: 'item', mode: 'edit', data: item, sectionId: activeSec.id }),
                        () => handleDelete('item', item.id),
                        '删除该项？',
                      )}
                    </Space>
                  )}
                </SortableList>
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
          target.kind === 'category' ? (target.mode === 'create' ? '新建类目' : '编辑类目') :
          target.kind === 'group'    ? (target.mode === 'create' ? '新建分组' : '编辑分组') :
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
          {target?.kind === 'group' && (
            <Form.Item name="title" label="分组名" rules={[{ required: true, max: 50 }]}>
              <Input placeholder="例如 生活服务" />
            </Form.Item>
          )}
          {target?.kind === 'section' && (
            <>
              <Form.Item name="title" label="标题" rules={[{ required: true, max: 50 }]}>
                <Input placeholder="分区标题" />
              </Form.Item>
              <Form.Item
                name="icon_name" label="图标 (Ionic icon name)"
                tooltip="客户端使用 ionicons 的 outline 名称，例如 hammer-outline、home-outline"
              >
                <Input placeholder="例如 hammer-outline" />
              </Form.Item>
              <Form.Item name="group" label="所属分组 (可选)">
                <Select
                  allowClear
                  placeholder="不分组"
                  options={(activeCat?.groups ?? []).map(g => ({ value: g.id, label: g.title }))}
                />
              </Form.Item>
              <Form.Item
                name="facets"
                label="额外筛选维度 (可选)"
                tooltip="客户端在该分区下渲染的额外 chip 选择器；分类(items) / 所在地区 / 供求 默认已启用"
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
