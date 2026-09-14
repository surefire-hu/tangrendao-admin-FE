import { useEffect, useState } from 'react'
import { Form, Input, Switch, Button, Card, Typography, Space, Alert, message } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '../../api/admin'
import type { XindongCircleInput } from '../../types'

const { Title } = Typography

const ICON_PRESETS = [
  '💓', '🇮🇹', '💪', '🎬', '🍜', '🚗', '🐾', '✈️',
  '📷', '🎵', '☕', '📚', '⚽', '🎨', '🎮', '🍷',
]

export function CircleFormPage() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(!!id)
  const [error, setError] = useState<string | null>(null)
  const [icon, setIcon] = useState('💓')
  const isEdit = !!id

  useEffect(() => {
    if (!id) return
    adminApi.getXindongCircle(Number(id)).then(r => {
      const c = r.data
      form.setFieldsValue({
        name: c.name, description: c.description,
        is_default: c.is_default, is_active: c.is_active,
      })
      setIcon(c.icon || '💓')
    }).finally(() => setInitLoading(false))
  }, [id, form])

  const onFinish = async (values: Record<string, unknown>) => {
    setLoading(true); setError(null)
    try {
      const payload: XindongCircleInput = { ...(values as XindongCircleInput), icon }
      if (isEdit && id) {
        await adminApi.updateXindongCircle(Number(id), payload)
        message.success('圈子已更新')
      } else {
        await adminApi.createXindongCircle(payload)
        message.success('圈子已创建')
      }
      navigate('/xindong/circles')
    } catch {
      setError('保存失败，请检查所有字段。')
    } finally {
      setLoading(false)
    }
  }

  if (initLoading) return null

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate('/xindong/circles')} style={{ marginBottom: 16 }}>
        返回圈子列表
      </Button>
      <Title level={4}>{isEdit ? '编辑圈子' : '新建圈子'}</Title>
      {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}

      <Card style={{ maxWidth: 640 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{ is_default: false, is_active: true }}
        >
          <Form.Item label="图标">
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18, background: '#F3DEDA',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
              }}>
                {icon}
              </div>
              <Input
                value={icon}
                onChange={e => setIcon(e.target.value)}
                maxLength={8}
                style={{ width: 120 }}
                placeholder="输入 emoji"
              />
              <Space wrap size={8}>
                {ICON_PRESETS.map(p => (
                  <Button
                    key={p}
                    shape="circle"
                    size="large"
                    onClick={() => setIcon(p)}
                    style={{
                      fontSize: 18,
                      borderColor: icon === p ? '#B84C6B' : undefined,
                      borderWidth: icon === p ? 2 : 1,
                    }}
                  >{p}</Button>
                ))}
              </Space>
            </Space>
          </Form.Item>

          <Form.Item name="name" label="圈子名称" rules={[{ required: true, message: '请填写圈子名称' }]}>
            <Input placeholder="如：旅行搭子" maxLength={40} />
          </Form.Item>

          <Form.Item name="description" label="描述">
            <Input.TextArea placeholder="简单介绍一下这个圈子" maxLength={200} rows={3} />
          </Form.Item>

          <Form.Item name="is_default" label="默认圈子" valuePropName="checked" extra="默认圈子会在首页优先展示">
            <Switch />
          </Form.Item>

          <Form.Item name="is_active" label="启用" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              {isEdit ? '更新圈子' : '创建圈子'}
            </Button>
            <Button onClick={() => navigate('/xindong/circles')}>取消</Button>
          </Space>
        </Form>
      </Card>
    </div>
  )
}
