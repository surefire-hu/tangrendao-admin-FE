import { useEffect, useState } from 'react'
import {
  Form, Input, Select, InputNumber, Switch, Button, Card,
  Upload, Typography, Space, Alert, message, Row, Col, DatePicker,
} from 'antd'
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { UploadFile } from 'antd/es/upload/interface'
import { adminApi } from '../../api/admin'
import type { BannerAdCreate, AdPosition, AdCountry, AdProduct } from '../../types'
import { ProductSelect } from '../../components/ProductSelect'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const positions: { value: AdPosition; label: string }[] = [
  { value: 'any', label: '通用 – 所有页面' },
  { value: 'services', label: '服务页' },
  { value: 'job_detail', label: '招聘详情页' },
  { value: 'restaurant_detail', label: 'Listing 详情页' },
  { value: 'exchange', label: '汇率页' },
  { value: 'permesso', label: '居留证页' },
  { value: 'passport', label: '护照页' },
  { value: 'huangli', label: '黄历页' },
  { value: 'fiscal_code', label: '税号计算页' },
  { value: 'vehicle_check', label: '车况查询页' },
  { value: 'weather', label: '天气页' },
  { value: 'forum', label: '论坛' },
  { value: 'forum_detail', label: '帖子详情' },
  { value: 'local_service_detail', label: '本地服务详情' },
  { value: 'housing_detail', label: '房屋详情' },
  { value: 'market_detail', label: '市场详情' },
]

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

const linkedTypes = [
  { value: '', label: '无（使用外部链接）' },
  { value: 'job', label: '招聘' },
  { value: 'local_service', label: '本地服务' },
  { value: 'housing', label: '房屋租售' },
  { value: 'market', label: '二手市场' },
  { value: 'listing', label: 'Listing' },
]

interface FormValues {
  link_url: string
  linked_content_type: string
  linked_content_id: string
  country: AdCountry
  position: AdPosition
  is_active: boolean
  priority: number
  display_probability: number
  start_date?: dayjs.Dayjs
  end_date?: dayjs.Dayjs
}

const productTypes = [
  { value: 'listing',       label: '商家 / Listing' },
  { value: 'housing',       label: '房源' },
  { value: 'market',        label: '买卖市场' },
  { value: 'local_service', label: '本地服务' },
  { value: 'job_post',      label: '招聘' },
  { value: 'job_seek',      label: '求职' },
]

export function AdFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(!!id)
  const [error, setError] = useState<string | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const isEdit = !!id

  // product selector
  const [productType, setProductType]         = useState('listing')
  const [selectedProduct, setSelectedProduct] = useState<AdProduct | null>(null)
  const [country, setCountry]                 = useState<AdCountry>('IT')

  useEffect(() => {
    if (!id) return
    adminApi.getAd(id).then((r) => {
      const ad = r.data
      form.setFieldsValue({
        link_url: ad.link_url,
        linked_content_type: ad.linked_content_type,
        linked_content_id: ad.linked_content_id,
        country: ad.country,
        position: ad.position,
        is_active: ad.is_active,
        priority: ad.priority,
        display_probability: ad.display_probability,
        start_date: ad.start_date ? dayjs(ad.start_date) : undefined,
        end_date: ad.end_date ? dayjs(ad.end_date) : undefined,
      })
      if (ad.image_url) {
        setFileList([{ uid: '-1', name: 'banner.jpg', status: 'done', url: ad.image_url }])
      }
    }).finally(() => setInitLoading(false))
  }, [id, form])

  const onFinish = async (values: FormValues) => {
    setLoading(true)
    setError(null)
    try {
      const payload: BannerAdCreate & { image?: File } = {
        ...values,
        start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : undefined,
        end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : undefined,
        image: fileList[0]?.originFileObj as File | undefined,
      }

      if (isEdit && id) {
        await adminApi.updateAd(id, payload)
        message.success('横幅已更新')
      } else {
        await adminApi.createAd(payload)
        message.success('横幅已创建')
      }
      navigate('/advertisements')
    } catch {
      setError('保存失败，请检查所有字段是否填写正确。')
    } finally {
      setLoading(false)
    }
  }

  if (initLoading) return null

  return (
    <div>
      <Button
        icon={<ArrowLeftOutlined />}
        type="text"
        onClick={() => navigate('/advertisements')}
        style={{ marginBottom: 16 }}
      >
        返回横幅列表
      </Button>

      <Title level={4}>{isEdit ? '编辑横幅' : '新建广告横幅'}</Title>

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}

      <Card style={{ maxWidth: 700 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ is_active: true, priority: 0, display_probability: 100, country: 'IT', position: 'any' }}
        >
          {/* 图片 */}
          <Form.Item label="横幅图片" required={!isEdit}>
            <Upload
              listType="picture-card"
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: fl }) => setFileList(fl)}
              maxCount={1}
              accept="image/*"
            >
              {fileList.length === 0 && (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>上传</div>
                </div>
              )}
            </Upload>
            <Text type="secondary" style={{ fontSize: 12 }}>建议尺寸：1200×400px，最大 2MB</Text>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="country" label="国家" rules={[{ required: true }]}>
                <Select options={countries} onChange={v => setCountry(v)} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="position" label="展示位置" rules={[{ required: true }]}>
                <Select options={positions} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="link_url" label="外部链接（URL）">
            <Input placeholder="https://..." />
          </Form.Item>

          {/* Product selector */}
          <Card size="small" title="关联产品（快速填充内容类型和 ID）" style={{ marginBottom: 16 }}>
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
                  onSelect={(p) => {
                    setSelectedProduct(p)
                    form.setFieldsValue({
                      linked_content_type: productType,
                      linked_content_id: p.id,
                    })
                  }}
                  searchFn={adminApi.searchProducts}
                  selectedId={selectedProduct?.id}
                />
              </Col>
            </Row>
            {selectedProduct && (
              <Alert
                type="success"
                message={`已选: ${selectedProduct.title}${selectedProduct.city ? ' · ' + selectedProduct.city : ''}`}
                style={{ marginBottom: 0 }}
              />
            )}
          </Card>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="linked_content_type" label="关联内容类型">
                <Select options={linkedTypes} disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="linked_content_id" label="关联内容 ID">
                <Input placeholder="内容的 UUID" disabled />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="priority" label="优先级" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="display_probability" label="展示概率 %">
                <InputNumber style={{ width: '100%' }} min={0} max={100} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="is_active" label="启用" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="start_date" label="开始日期">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="end_date" label="结束日期">
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? '更新横幅' : '创建横幅'}
            </Button>
            <Button onClick={() => navigate('/advertisements')}>取消</Button>
          </Space>
        </Form>
      </Card>
    </div>
  )
}
