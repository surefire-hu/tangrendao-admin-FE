import { useEffect, useState } from 'react'
import { Card, Form, InputNumber, Button, Typography, Space, message, Spin, Divider } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { adminApi } from '../../api/admin'
import type { XindongConfig } from '../../types'

const { Title, Text } = Typography

export function XindongSettingsPage() {
  const [form] = Form.useForm<XindongConfig>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getXindongConfig()
      form.setFieldsValue(res.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onSave = async (values: XindongConfig) => {
    setSaving(true)
    try {
      const res = await adminApi.updateXindongConfig(values)
      form.setFieldsValue(res.data)
      message.success('已保存')
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <Title level={4} style={{ marginBottom: 4 }}>心动信号设置</Title>
      <Text type="secondary">订阅价格与每日免费匹配次数，改动实时生效</Text>

      <Spin spinning={loading}>
        <Form form={form} layout="vertical" onFinish={onSave} style={{ marginTop: 24 }}>
          <Card title="订阅价格（糖果）" size="small" style={{ marginBottom: 20 }}>
            <Form.Item name="sub_daily_price" label="日卡">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="sub_weekly_price" label="周卡">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="sub_monthly_price" label="月卡">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
            <Divider style={{ margin: '8px 0 20px' }} />
            <Form.Item name="sub_annual_price" label="年卡" style={{ marginBottom: 0 }}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Card>

          <Card title="匹配限制" size="small">
            <Form.Item name="daily_free_matches" label="每天可发起的免费匹配次数（所有圈子共用）" style={{ marginBottom: 0 }}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Card>

          <Space style={{ marginTop: 20 }}>
            <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={saving}>
              保存
            </Button>
          </Space>
        </Form>
      </Spin>
    </div>
  )
}
