import { useEffect, useState } from 'react'
import {
  Form, Input, Select, InputNumber, Switch, Button, Card,
  Upload, Typography, Space, Alert, message, Row, Col,
} from 'antd'
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { UploadFile } from 'antd/es/upload/interface'
import { adminApi } from '../../api/admin'
import type { CosmeticAcquireType, CosmeticCreate, CosmeticKind } from '../../types'

const { Title, Text } = Typography

const acquireOptions: { value: CosmeticAcquireType; label: string }[] = [
  { value: 'coin', label: '金币购买（永久）' },
  { value: 'candy', label: '糖果购买（永久）' },
  { value: 'rent_coin', label: '金币租用（限时）' },
  { value: 'rent_candy', label: '糖果租用（限时）' },
  { value: 'event', label: '仅活动获得（不可购买）' },
]

interface FormValues {
  kind: CosmeticKind
  name: string
  acquire_type: CosmeticAcquireType
  price: number
  rent_days?: number
  sort_order: number
  is_active: boolean
}

export function CosmeticFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm<FormValues>()
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(!!id)
  const [error, setError] = useState<string | null>(null)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const isEdit = !!id

  const acquireType = Form.useWatch('acquire_type', form)
  const kind = Form.useWatch('kind', form)
  const isRental = acquireType === 'rent_coin' || acquireType === 'rent_candy'
  const isEventOnly = acquireType === 'event'

  useEffect(() => {
    if (!id) return
    adminApi.getCosmetic(id).then((r) => {
      const c = r.data
      form.setFieldsValue({
        kind: c.kind, name: c.name, acquire_type: c.acquire_type,
        price: c.price, rent_days: c.rent_days ?? undefined,
        sort_order: c.sort_order, is_active: c.is_active,
      })
      if (c.image_url) {
        setFileList([{ uid: '-1', name: 'cosmetic.png', status: 'done', url: c.image_url }])
      }
    }).finally(() => setInitLoading(false))
  }, [id, form])

  const onFinish = async (values: FormValues) => {
    setLoading(true)
    setError(null)
    try {
      const payload: CosmeticCreate & { image?: File } = {
        ...values,
        image: fileList[0]?.originFileObj as File | undefined,
      }
      if (isEdit && id) {
        await adminApi.updateCosmetic(id, payload)
        message.success('装扮已更新')
      } else {
        await adminApi.createCosmetic(payload)
        message.success('装扮已创建')
      }
      navigate('/cosmetics')
    } catch {
      setError('保存失败，请检查所有字段是否填写正确。')
    } finally {
      setLoading(false)
    }
  }

  if (initLoading) return null

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/cosmetics')} style={{ marginBottom: 16 }}>
        返回装扮列表
      </Button>

      <Title level={4}>{isEdit ? '编辑装扮' : '新建装扮'}</Title>

      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}

      <Card style={{ maxWidth: 700 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ kind: 'frame', acquire_type: 'coin', price: 0, sort_order: 100, is_active: true }}
        >
          <Form.Item label="图片" required={!isEdit}>
            <Upload
              listType="picture-card"
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: fl }) => setFileList(fl)}
              maxCount={1}
              accept="image/png,image/*"
            >
              {fileList.length === 0 && (
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>上传</div>
                </div>
              )}
            </Upload>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {kind === 'background'
                ? '聊天背景：显示在会话列表中该用户的整行背景（裁切铺满）。建议尺寸 900×300px 或更大，横向，JPG/PNG。'
                : '头像框：环绕头像四周的装饰，中间必须透明。建议尺寸 500×500px（正方形），透明背景 PNG。'}
            </Text>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="kind" label="类型" rules={[{ required: true }]}>
                <Select options={[{ value: 'frame', label: '头像框' }, { value: 'background', label: '聊天背景' }]} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="名称" rules={[{ required: true, message: '请填写名称' }]}>
                <Input placeholder="如：星光头像框" maxLength={80} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="acquire_type" label="获取方式" rules={[{ required: true }]}>
            <Select options={acquireOptions} />
          </Form.Item>

          {!isEventOnly && (
            <Row gutter={16}>
              <Col span={isRental ? 12 : 24}>
                <Form.Item
                  name="price"
                  label={`价格（${acquireType?.includes('candy') ? '糖果' : '金币'}）`}
                  rules={[{ required: true, message: '请填写价格' }]}
                >
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
              {isRental && (
                <Col span={12}>
                  <Form.Item name="rent_days" label="租用天数" rules={[{ required: true, message: '请填写租用天数' }]}>
                    <InputNumber style={{ width: '100%' }} min={1} />
                  </Form.Item>
                </Col>
              )}
            </Row>
          )}
          {isEventOnly && (
            <Alert
              type="info"
              showIcon
              message="该装扮不可购买，只能在活动奖品池中设置为抽奖奖品，或由管理员手动发放。"
              style={{ marginBottom: 16 }}
            />
          )}

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sort_order" label="排序（越小越靠前）">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_active" label="上架" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? '更新' : '创建'}
            </Button>
            <Button onClick={() => navigate('/cosmetics')}>取消</Button>
          </Space>
        </Form>
      </Card>
    </div>
  )
}
