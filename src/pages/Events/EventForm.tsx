import { useEffect, useState } from 'react'
import {
  Form, Input, InputNumber, Switch, Button, Card,
  Upload, Typography, Space, Alert, message, Row, Col, DatePicker,
  Table, Select, Popconfirm, Tooltip, Image as AntImage,
} from 'antd'
import { UploadOutlined, ArrowLeftOutlined, PlusOutlined, EditOutlined, DeleteOutlined, PictureOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { UploadFile } from 'antd/es/upload/interface'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { type Dayjs } from 'dayjs'
import { adminApi } from '../../api/admin'
import { ProductSelect } from '../../components/ProductSelect'
import type { AdProduct, AdminEventCreate, Cosmetic, EventPrize, EventPrizeCreate, EventPrizeKind } from '../../types'

const { Title, Text } = Typography

interface FormValues {
  name: string
  description?: string
  range?: [Dayjs, Dayjs]
  is_active: boolean
}

export function EventFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(!!id)
  const [error, setError] = useState<string | null>(null)
  const [dragonFileList, setDragonFileList] = useState<UploadFile[]>([])
  const [bannerFileList, setBannerFileList] = useState<UploadFile[]>([])
  const [selectedListing, setSelectedListing] = useState<AdProduct | null>(null)
  const isEdit = !!id

  useEffect(() => {
    if (!id) return
    adminApi.getEvent(id).then((r) => {
      const e = r.data
      form.setFieldsValue({
        name: e.name,
        description: e.description,
        range: e.start_at && e.end_at ? [dayjs(e.start_at), dayjs(e.end_at)] : undefined,
        is_active: e.is_active,
      })
      if (e.dragon_image_url) setDragonFileList([{ uid: '-1', name: 'dragon.png', status: 'done', url: e.dragon_image_url }])
      if (e.banner_image_url) setBannerFileList([{ uid: '-2', name: 'banner.png', status: 'done', url: e.banner_image_url }])
      if (e.listing_id) setSelectedListing({ id: e.listing_id, title: e.listing_name || '', cover_image: '', city: '' })
    }).finally(() => setInitLoading(false))
  }, [id, form])

  const onFinish = async (values: FormValues) => {
    setLoading(true)
    setError(null)
    try {
      const payload: AdminEventCreate & { dragon_image?: File; banner_image?: File } = {
        name: values.name,
        description: values.description,
        listing_id: selectedListing?.id,
        start_at: values.range?.[0]?.toISOString(),
        end_at: values.range?.[1]?.toISOString(),
        is_active: values.is_active,
        dragon_image: dragonFileList[0]?.originFileObj as File | undefined,
        banner_image: bannerFileList[0]?.originFileObj as File | undefined,
      }
      if (isEdit && id) {
        await adminApi.updateEvent(id, payload)
        message.success('活动已更新')
        navigate('/events')
      } else {
        const res = await adminApi.createEvent(payload)
        message.success('活动已创建，现在可以添加奖品')
        navigate(`/events/${res.data.id}/edit`)
      }
    } catch {
      setError('保存失败，请检查所有字段是否填写正确。')
    } finally {
      setLoading(false)
    }
  }

  if (initLoading) return null

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/events')} style={{ marginBottom: 16 }}>
        返回活动列表
      </Button>

      <Title level={4}>{isEdit ? '编辑活动' : '新建活动'}</Title>

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}

      <Card style={{ maxWidth: 780, marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ is_active: true }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="首页龙形图标" required={!isEdit}>
                <Upload
                  listType="picture-card"
                  fileList={dragonFileList}
                  beforeUpload={() => false}
                  onChange={({ fileList: fl }) => setDragonFileList(fl)}
                  maxCount={1}
                  accept="image/*"
                >
                  {dragonFileList.length === 0 && (
                    <div><UploadOutlined /><div style={{ marginTop: 8 }}>上传</div></div>
                  )}
                </Upload>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  活动进行中会替代首页默认的龙形图标，点击后进入本活动页面。建议尺寸 500×500px（正方形），透明背景 PNG。
                </Text>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="活动详情长图" required={!isEdit}>
                <Upload
                  listType="picture-card"
                  fileList={bannerFileList}
                  beforeUpload={() => false}
                  onChange={({ fileList: fl }) => setBannerFileList(fl)}
                  maxCount={1}
                  accept="image/*"
                >
                  {bannerFileList.length === 0 && (
                    <div><UploadOutlined /><div style={{ marginTop: 8 }}>上传</div></div>
                  )}
                </Upload>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  活动详情页展示的长图（建议竖版，适合手机整屏浏览）。建议尺寸 750×1600px 或更高（宽 750px，高度不限），JPG/PNG。
                </Text>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="name" label="活动名称" rules={[{ required: true, message: '请填写活动名称' }]}>
            <Input placeholder="如：迪厅之夜" maxLength={80} />
          </Form.Item>

          <Form.Item name="description" label="活动说明">
            <Input.TextArea rows={3} placeholder="活动规则说明，展示在活动详情页" maxLength={1000} />
          </Form.Item>

          <Form.Item label="关联商户（用户在该商户详情页点击「推荐」可获得抽奖机会）">
            <ProductSelect
              productType="listing"
              country=""
              onSelect={setSelectedListing}
              searchFn={adminApi.searchAdCardProducts}
              selectedId={selectedListing?.id}
            />
            {selectedListing && (
              <Alert style={{ marginTop: 8 }} type="success" message={`已选: ${selectedListing.title}`} />
            )}
          </Form.Item>

          <Row gutter={16}>
            <Col span={16}>
              <Form.Item name="range" label="活动时间" rules={[{ required: true, message: '请选择活动起止时间' }]}>
                <DatePicker.RangePicker showTime style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="is_active" label="启用" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? '更新' : '创建并继续设置奖品'}
            </Button>
            <Button onClick={() => navigate('/events')}>取消</Button>
          </Space>
        </Form>
      </Card>

      {isEdit && id && <PrizePool eventId={id} />}
    </div>
  )
}

// ── 奖品池 ───────────────────────────────────────────────────────────────────

const KIND_LABEL: Record<EventPrizeKind, string> = {
  coin: '金币', candy: '糖果', cosmetic: '装扮', merchant: '商户实物奖品',
}

interface PrizeFormValues {
  kind: EventPrizeKind
  name: string
  amount?: number
  cosmetic_id?: string
  weight: number
  stock?: number
  sort_order: number
}

function PrizePool({ eventId }: { eventId: string }) {
  const [prizes, setPrizes] = useState<EventPrize[]>([])
  const [loading, setLoading] = useState(false)
  const [cosmetics, setCosmetics] = useState<Cosmetic[]>([])
  const [editing, setEditing] = useState<EventPrize | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm<PrizeFormValues>()
  const kind = Form.useWatch('kind', form)

  const fetchPrizes = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getEventPrizes(eventId)
      setPrizes(res.data.results)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPrizes() }, [eventId])
  useEffect(() => {
    adminApi.getCosmetics({ page: 1, page_size: 100 }).then((r) => setCosmetics(r.data.results)).catch(() => {})
  }, [])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ kind: 'coin', weight: 1, sort_order: 100 })
    setFileList([])
    setShowForm(true)
  }

  const openEdit = (p: EventPrize) => {
    setEditing(p)
    form.setFieldsValue({
      kind: p.kind, name: p.name, amount: p.amount, cosmetic_id: p.cosmetic_id ?? undefined,
      weight: p.weight, stock: p.stock ?? undefined, sort_order: p.sort_order,
    })
    setFileList(p.image_url ? [{ uid: '-1', name: 'prize.png', status: 'done', url: p.image_url }] : [])
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await adminApi.deleteEventPrize(id)
      message.success('奖品已删除')
      fetchPrizes()
    } catch {
      message.error('删除失败')
    }
  }

  const onFinish = async (values: PrizeFormValues) => {
    setSaving(true)
    try {
      const payload: EventPrizeCreate = {
        ...values,
        image: fileList[0]?.originFileObj as File | undefined,
      }
      if (editing) {
        await adminApi.updateEventPrize(editing.id, payload)
        message.success('奖品已更新')
      } else {
        await adminApi.createEventPrize(eventId, payload)
        message.success('奖品已添加')
      }
      setShowForm(false)
      fetchPrizes()
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const totalWeight = prizes.reduce((s, p) => s + p.weight, 0)

  const columns: ColumnsType<EventPrize> = [
    {
      title: '图片',
      dataIndex: 'image_url',
      width: 60,
      render: (url: string | null) =>
        url ? <AntImage src={url} width={40} height={40} style={{ objectFit: 'contain', borderRadius: 4 }} />
          : <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: 4 }}><PictureOutlined /></div>,
    },
    { title: '类型', dataIndex: 'kind', width: 100, render: (k: EventPrizeKind) => KIND_LABEL[k] },
    { title: '名称', dataIndex: 'name', width: 160 },
    {
      title: '数量/内容', key: 'content', width: 140,
      render: (_, p) => p.kind === 'coin' || p.kind === 'candy'
        ? `${p.amount} ${p.kind === 'coin' ? '金币' : '糖果'}`
        : p.kind === 'cosmetic'
          ? (cosmetics.find(c => c.id === p.cosmetic_id)?.name || '装扮')
          : '线下实物',
    },
    {
      title: '中奖概率', key: 'prob', width: 100,
      render: (_, p) => totalWeight > 0 ? `${((p.weight / totalWeight) * 100).toFixed(1)}%` : '—',
    },
    { title: '权重', dataIndex: 'weight', width: 70 },
    { title: '库存', dataIndex: 'stock', width: 80, render: (s: number | null) => s === null ? '不限' : s },
    { title: '已中奖', dataIndex: 'win_count', width: 80 },
    {
      title: '', key: 'actions', width: 80,
      render: (_, p) => (
        <Space size={4}>
          <Tooltip title="编辑"><Button type="text" icon={<EditOutlined />} onClick={() => openEdit(p)} /></Tooltip>
          <Popconfirm title="确定删除此奖品？" onConfirm={() => handleDelete(p.id)} okText="确定" cancelText="取消">
            <Tooltip title="删除"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card
      title="抽奖奖品池"
      extra={<Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>添加奖品</Button>}
      style={{ maxWidth: 780 }}
    >
      <Table
        columns={columns}
        dataSource={prizes}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
      />

      {showForm && (
        <Card size="small" style={{ marginTop: 16, background: '#fafafa' }} title={editing ? '编辑奖品' : '新建奖品'}>
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Form.Item label="奖品图片">
              <Upload
                listType="picture-card"
                fileList={fileList}
                beforeUpload={() => false}
                onChange={({ fileList: fl }) => setFileList(fl)}
                maxCount={1}
                accept="image/*"
              >
                {fileList.length === 0 && <div><UploadOutlined /><div style={{ marginTop: 8 }}>上传</div></div>}
              </Upload>
              <Text type="secondary" style={{ fontSize: 12 }}>
                建议尺寸 300×300px（正方形），透明背景 PNG（金币/糖果类型可不填，使用默认图标）。
              </Text>
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="kind" label="奖品类型" rules={[{ required: true }]}>
                  <Select options={Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label }))} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="name" label="名称" rules={[{ required: true, message: '请填写名称' }]}>
                  <Input placeholder="展示给用户的奖品名称" maxLength={80} />
                </Form.Item>
              </Col>
            </Row>

            {(kind === 'coin' || kind === 'candy') && (
              <Form.Item name="amount" label={`数量（${kind === 'coin' ? '金币' : '糖果'}）`} rules={[{ required: true, message: '请填写数量' }]}>
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            )}

            {kind === 'cosmetic' && (
              <Form.Item name="cosmetic_id" label="选择装扮" rules={[{ required: true, message: '请选择装扮' }]}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  options={cosmetics.map(c => ({ value: c.id, label: `${c.kind === 'frame' ? '头像框' : '聊天背景'} · ${c.name}` }))}
                />
              </Form.Item>
            )}

            {kind === 'merchant' && (
              <Alert type="info" showIcon message="线下实物奖品由商户自行准备与核销，中奖记录可在后台查看用于兑奖。" style={{ marginBottom: 16 }} />
            )}

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="weight" label="权重（决定中奖概率）" rules={[{ required: true }]}>
                  <InputNumber style={{ width: '100%' }} min={1} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="stock" label="库存（留空为不限）">
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="sort_order" label="排序">
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>

            <Space>
              <Button type="primary" htmlType="submit" loading={saving}>保存奖品</Button>
              <Button onClick={() => setShowForm(false)}>取消</Button>
            </Space>
          </Form>
        </Card>
      )}
    </Card>
  )
}
