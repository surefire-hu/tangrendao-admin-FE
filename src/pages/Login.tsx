import { useState } from 'react'
import { Form, Input, Button, Card, Typography, Alert, theme } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const { Title, Text } = Typography

export function LoginPage() {
  const { login, isLoading } = useAuthStore()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const { token } = theme.useToken()

  const onFinish = async ({ email, password }: { email: string; password: string }) => {
    setError(null)
    try {
      await login(email, password)
      navigate('/')
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : '账号或密码错误，或无权限访问。'
      setError(msg)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgLayout} 100%)`,
      }}
    >
      <Card
        style={{ width: 400, boxShadow: token.boxShadowSecondary }}
        styles={{ body: { padding: 40 } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            唐人道 Admin
          </Title>
          <Text type="secondary">管理员控制台</Text>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            style={{ marginBottom: 16 }}
            showIcon
            closable
            onClose={() => setError(null)}
          />
        )}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            name="email"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '邮箱格式不正确' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="邮箱"
              size="large"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="密码"
              size="large"
              autoComplete="current-password"
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={isLoading}
            style={{ marginTop: 8 }}
          >
            Accedi
          </Button>
        </Form>
      </Card>
    </div>
  )
}
