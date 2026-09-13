import { useEffect, useState } from 'react'
import { Card, Form, Input, Switch, Button, Typography, Space, message, Spin, Divider, Alert } from 'antd'
import { SaveOutlined } from '@ant-design/icons'
import { adminApi } from '../../api/admin'
import type { ClientConfig } from '../../types'

const { Title, Text } = Typography

export function ClientConfigPage() {
  const [form] = Form.useForm<ClientConfig>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getClientConfig()
      form.setFieldsValue(res.data)
    } catch {
      message.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const onSave = async (values: ClientConfig) => {
    setSaving(true)
    try {
      const res = await adminApi.updateClientConfig(values)
      form.setFieldsValue(res.data)
      message.success('已保存')
    } catch {
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <Title level={4} style={{ marginBottom: 4 }}>客户端配置</Title>
      <Text type="secondary">功能开关与 App 更新提示，改动实时生效，无需重新发版</Text>

      <Spin spinning={loading}>
        <Form form={form} layout="vertical" onFinish={onSave} style={{ marginTop: 24 }}>
          <Card title="心动信号" size="small" style={{ marginBottom: 20 }}>
            <Form.Item
              name="xindong_xinhao_enabled"
              label="功能已上线"
              valuePropName="checked"
              extra="关闭时，App 里点进心动信号只会看到「敬请期待」占位页"
            >
              <Switch />
            </Form.Item>
          </Card>

          <Card title="App 更新提示" size="small">
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="填写的版本号需要与 App 实际发布的版本一致（iOS 用 CFBundleShortVersionString，Android 用 versionName）。App 检测到自己版本低于这里填写的值时，会弹出更新提示。"
            />
            <Form.Item name="latest_ios_version" label="iOS 最新版本号">
              <Input placeholder="例如 1.7.0" />
            </Form.Item>
            <Form.Item name="ios_app_store_url" label="App Store 链接">
              <Input placeholder="https://apps.apple.com/app/id..." />
            </Form.Item>
            <Divider style={{ margin: '8px 0 20px' }} />
            <Form.Item name="latest_android_version" label="Android 最新版本号">
              <Input placeholder="例如 1.7.0" />
            </Form.Item>
            <Form.Item name="android_play_store_url" label="Google Play 链接">
              <Input placeholder="https://play.google.com/store/apps/details?id=..." />
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
