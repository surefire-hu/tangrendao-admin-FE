import { useEffect, useState } from 'react'
import {
  Form, Input, Select, InputNumber, Switch, Button, Card,
  Upload, Typography, Space, Alert, message, Row, Col, Tag,
} from 'antd'
import { UploadOutlined, ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { UploadFile } from 'antd/es/upload/interface'
import { adminApi } from '../../api/admin'
import type { AdCardCreate, AdCountry, AdProduct } from '../../types'
import { ProductSelect } from '../../components/ProductSelect'

const { Title, Text } = Typography

const countries: { value: AdCountry; label: string }[] = [
  { value: 'ALL', label: '🌍 所有国家' },
  { value: 'IT', label: '🇮🇹 意大利' },
  { value: 'DE', label: '🇩🇪 德国' },
  { value: 'FR', label: '🇫🇷 法国' },
  { value: 'ES', label: '🇪🇸 西班牙' },
  { value: 'GB', label: '🇬🇧 英国' },
  { value: 'PT', label: '🇵🇹 葡萄牙' },
  { value: 'NL', label: '🇳🇱 荷兰' },
  { value: 'BE', label: '🇧🇪 比利时' },
  { value: 'CH', label: '🇨🇭 瑞士' },
  { value: 'AT', label: '🇦🇹 奥地利' },
]

const productTypes = [
  { value: 'listing',       label: '商家 / Listing' },
  { value: 'housing',       label: '房源' },
  { value: 'market',        label: '买卖市场' },
  { value: 'local_service', label: '本地服务' },
  { value: 'job_post',      label: '招聘' },
  { value: 'job_seek',      label: '求职' },
]

// ── Mini AdCard Preview ───────────────────────────────────────────────────────
const GOLD_MID   = '#C9981A'
const GOLD_LIGHT = '#E8C040'
const GOLD_DARK  = '#A87C10'

function AdCardPreview({ title, subtitle, tags, imageUrl }: {
  title: string; subtitle: string; tags: string[]; imageUrl: string
}) {
  return (
    <div style={{
      width: 160, borderRadius: 20, overflow: 'hidden',
      border: `1.5px solid ${GOLD_MID}`,
      flexShrink: 0, display: 'flex', flexDirection: 'column',
    }}>
      {/* Cover — fixed height matching app */}
      <div style={{ position: 'relative', width: '100%', height: 120, flexShrink: 0, background: '#c8c8c8' }}>
        {imageUrl
          ? <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#e0d4b8,#c8b88a)' }} />
        }
        <div style={{
          position: 'absolute', top: 8, right: 8,
          background: 'rgba(201,152,26,0.92)', color: '#fff',
          fontSize: 10, fontWeight: 700, borderRadius: 4, padding: '2px 6px',
        }}>广告</div>
      </div>
      {/* Gold footer */}
      <div style={{
        background: `linear-gradient(160deg, ${GOLD_LIGHT} 0%, ${GOLD_MID} 60%, ${GOLD_DARK} 100%)`,
        padding: '8px 10px 10px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1,
      }}>
        <div style={{
          margin: 0, fontSize: 12, fontWeight: 700, color: '#fff',
          lineHeight: 1.3, overflow: 'hidden',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {title || <span style={{ opacity: 0.45 }}>标题</span>}
        </div>
        {subtitle && (
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.88)', lineHeight: 1.3, overflow: 'hidden',
            display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' }}>
            {subtitle}
          </div>
        )}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
            {tags.map(t => (
              <span key={t} style={{
                background: 'rgba(255,255,255,0.22)', border: '1px solid rgba(255,255,255,0.55)',
                color: '#fff', fontSize: 9, fontWeight: 600, borderRadius: 10, padding: '1px 6px',
              }}>{t}</span>
            ))}
          </div>
        )}
        <div style={{
          alignSelf: 'flex-start', marginTop: 2,
          background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.65)',
          color: '#fff', fontSize: 10, fontWeight: 600, borderRadius: 10, padding: '3px 10px',
        }}>查看详情</div>
      </div>
    </div>
  )
}

// ── Main Form ─────────────────────────────────────────────────────────────────
export function AdCardFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate  = useNavigate()
  const [form]    = Form.useForm()
  const [loading, setLoading]     = useState(false)
  const [initLoading, setInitLoad] = useState(!!id)
  const [error, setError]         = useState<string | null>(null)
  const [fileList, setFileList]     = useState<UploadFile[]>([])
  const [uploading, setUploading]   = useState(false)
  const isEdit = !!id

  // preview state
  const [previewTitle, setPreviewTitle]   = useState('')
  const [previewSubtitle, setPreviewSub] = useState('')
  const [previewTags, setPreviewTags]    = useState<string[]>([])
  const [previewCity, setPreviewCity]    = useState('')
  // manual cover (uploaded file) takes priority over product cover
  const [manualCover, setManualCover]   = useState('')  // blob URL or saved URL
  const [productCover, setProductCover] = useState('')  // from selected product

  // resolved preview: manual wins, product is fallback
  const previewImage = manualCover || productCover

  // tags
  const [tagInput, setTagInput] = useState('')

  // product search
  const [productType, setProductType]         = useState('listing')
  const [selectedProduct, setSelectedProduct] = useState<AdProduct | null>(null)
  const [country, setCountry]                 = useState<AdCountry>('IT')

  // load existing
  useEffect(() => {
    if (!id) return
    adminApi.getAdCard(id).then(r => {
      const a = r.data
      form.setFieldsValue({
        title: a.title, subtitle: a.subtitle, description: a.description,
        city: a.city, cta_text: a.cta_text, cta_url: a.cta_url,
        linked_content_type: a.linked_content_type,
        linked_content_id: a.linked_content_id,
        country: a.country, is_active: a.is_active, priority: a.priority,
      })
      setPreviewTitle(a.title); setPreviewSub(a.subtitle)
      setPreviewTags(a.tags || []); setPreviewCity(a.city)
      setCountry(a.country)
      if (a.linked_content_type) setProductType(a.linked_content_type)
      const img = a.thumbnail_url || a.cover_url || ''
      setManualCover(img)
      setUploadedThumbnailUrl(img)
      if (img) setFileList([{ uid: '-1', name: 'cover.jpg', status: 'done', url: img }])
    }).finally(() => setInitLoad(false))
  }, [id, form])

  function selectProduct(p: AdProduct) {
    setSelectedProduct(p)
    setProductCover(p.cover_image || '')
    form.setFieldsValue({
      linked_content_type: productType,
      linked_content_id: p.id,
      title: form.getFieldValue('title') || p.title,
      city: form.getFieldValue('city') || p.city,
    })
    if (!previewTitle) setPreviewTitle(p.title)
    if (!previewCity)  setPreviewCity(p.city)
  }

  function addTag() {
    const t = tagInput.trim()
    if (!t || previewTags.includes(t) || previewTags.length >= 5) return
    setPreviewTags(prev => [...prev, t])
    setTagInput('')
  }

  // uploadedThumbnailUrl: absolute URL returned by the upload endpoint
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = useState('')

  async function onFileChange({ fileList: fl }: { fileList: UploadFile[] }) {
    const file = fl[0]?.originFileObj
    if (file) {
      // Show local blob preview immediately, mark as uploading
      setManualCover(URL.createObjectURL(file))
      setFileList([{ uid: fl[0].uid, name: fl[0].name, status: 'uploading' }])
      setUploading(true)
      try {
        // Upload to backend — returns absolute URL (local in DEBUG, Cloudinary in prod)
        const res = await adminApi.uploadAdCardThumbnail(file)
        setUploadedThumbnailUrl(res.data.url)
        setManualCover(res.data.url)
        setFileList([{ uid: fl[0].uid, name: fl[0].name, status: 'done', url: res.data.url }])
      } catch {
        message.error('图片上传失败')
        setFileList([])
        setManualCover('')
      } finally {
        setUploading(false)
      }
    } else if (fl.length === 0) {
      // Removed
      setManualCover('')
      setUploadedThumbnailUrl('')
      setFileList([])
    }
  }

  const onFinish = async (values: Record<string, unknown>) => {
    setLoading(true); setError(null)
    try {
      const payload: AdCardCreate = {
        ...(values as AdCardCreate),
        tags: previewTags,
        // Pass the absolute URL (stored at upload time), not the raw File
        thumbnail_url: uploadedThumbnailUrl || undefined,
      }
      if (isEdit && id) {
        await adminApi.updateAdCard(id, payload)
        message.success('广告卡片已更新')
      } else {
        await adminApi.createAdCard(payload)
        message.success('广告卡片已创建')
      }
      navigate('/adcards')
    } catch {
      setError('保存失败，请检查所有字段。')
    } finally {
      setLoading(false)
    }
  }

  if (initLoading) return null

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/adcards')} style={{ marginBottom: 16 }}>
        返回卡片列表
      </Button>
      <Title level={4}>{isEdit ? '编辑广告卡片' : '新建广告卡片'}</Title>
      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}

      <Row gutter={24} align="top">
        {/* Form */}
        <Col xs={24} lg={16}>
          <Card>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              onValuesChange={(changed) => {
                if ('title'    in changed) setPreviewTitle(changed.title ?? '')
                if ('subtitle' in changed) setPreviewSub(changed.subtitle ?? '')
                if ('city'     in changed) setPreviewCity(changed.city ?? '')
                if ('country'  in changed) setCountry(changed.country)
              }}
              initialValues={{ is_active: true, priority: 0, country: 'IT', cta_text: '了解更多' }}
            >
              {/* Cover upload */}
              <Form.Item label="封面图片（3:4 竖版）" required={!isEdit}>
                <Upload
                  listType="picture-card"
                  fileList={fileList}
                  beforeUpload={() => false}
                  onChange={onFileChange}
                  maxCount={1}
                  accept="image/*"
                  disabled={uploading}
                >
                  {fileList.length === 0 && <div><UploadOutlined /><div style={{ marginTop: 8 }}>{uploading ? '上传中…' : '上传'}</div></div>}
                </Upload>
                <Text type="secondary" style={{ fontSize: 12 }}>建议比例 3:4（如 600×800px）</Text>
              </Form.Item>

              {/* Product selector */}
              <Card size="small" title="关联产品（自动填充封面和城市）" style={{ marginBottom: 16 }}>
                <Row gutter={8} style={{ marginBottom: 8 }}>
                  <Col span={10}>
                    <Select
                      style={{ width: '100%' }}
                      options={productTypes}
                      value={productType}
                      onChange={v => { setProductType(v); setSelectedProduct(null) }}
                    />
                  </Col>
                  <Col span={14}>
                    <ProductSelect
                      productType={productType}
                      country={country}
                      onSelect={selectProduct}
                      searchFn={adminApi.searchAdCardProducts}
                      selectedId={selectedProduct?.id}
                    />
                  </Col>
                </Row>
                {selectedProduct && (
                  <Alert type="success" message={`已选: ${selectedProduct.title}${selectedProduct.city ? ' · ' + selectedProduct.city : ''}`} />
                )}
                <Row gutter={8} style={{ marginTop: 8 }}>
                  <Col span={12}>
                    <Form.Item name="linked_content_type" label="内容类型" style={{ marginBottom: 0 }}>
                      <Input placeholder="listing / housing / job_post…" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="linked_content_id" label="内容 ID" style={{ marginBottom: 0 }}>
                      <Input placeholder="UUID" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              {/* Text fields */}
              <Form.Item name="title" label="标题" rules={[{ required: true, message: '请填写标题' }]}>
                <Input placeholder="商家名称 / 职位名称" maxLength={80} />
              </Form.Item>
              <Form.Item name="subtitle" label="副标题（可选）">
                <Input placeholder="如：506 人排号 / 月薪 2000€" maxLength={60} />
              </Form.Item>

              {/* Tags */}
              <Form.Item label="标签（最多 5 个）">
                <Space wrap style={{ marginBottom: 8 }}>
                  {previewTags.map(t => (
                    <Tag key={t} closable onClose={() => setPreviewTags(prev => prev.filter(x => x !== t))}>{t}</Tag>
                  ))}
                </Space>
                <Space>
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onPressEnter={addTag}
                    placeholder="输入标签后回车（如：火锅）"
                    maxLength={20}
                    style={{ width: 200 }}
                    disabled={previewTags.length >= 5}
                  />
                  <Button icon={<PlusOutlined />} onClick={addTag} disabled={previewTags.length >= 5}>添加</Button>
                </Space>
              </Form.Item>

              <Form.Item name="city" label="城市">
                <Input placeholder="如 Prato" maxLength={60} />
              </Form.Item>
              <Form.Item name="cta_url" label="外部链接（无关联产品时使用）">
                <Input placeholder="https://..." />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="country" label="国家" rules={[{ required: true }]}>
                    <Select options={countries} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="priority" label="优先级">
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={6}>
                  <Form.Item name="is_active" label="启用" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </Col>
              </Row>

              <Space>
                <Button type="primary" htmlType="submit" loading={loading} disabled={uploading}>
                  {isEdit ? '更新卡片' : '创建卡片'}
                </Button>
                <Button onClick={() => navigate('/adcards')}>取消</Button>
              </Space>
            </Form>
          </Card>
        </Col>

        {/* Live preview */}
        <Col xs={24} lg={8}>
          <Card title="卡片预览" style={{ position: 'sticky', top: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 16px' }}>
              <AdCardPreview
                title={previewTitle}
                subtitle={previewSubtitle}
                tags={previewTags}
                imageUrl={previewImage}
              />
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              卡片宽度 160px，比例 3:4，在 App 中横向滚动显示。
            </Text>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
