import { useEffect, useState } from 'react'
import { Card, Button, Space, Switch, Typography, Descriptions, Modal, Alert, message, Popconfirm } from 'antd'
import { KeyOutlined, CopyOutlined } from '@ant-design/icons'
import { adminApi } from '../../api/admin'
import type { OrderingStoreAdmin } from '../../types'

const { Text, Paragraph } = Typography

const ORDER_SITE = 'https://order.tangrendao-ai.com'

/** 扫码点餐: issue the owner login for this listing (shown once) and toggle ordering. */
export function OrderingCard({ listingId }: { listingId: string }) {
  const [store, setStore] = useState<OrderingStoreAdmin | null>(null)
  const [loading, setLoading] = useState(true)
  const [issuing, setIssuing] = useState(false)
  const [issued, setIssued] = useState<{ login_id: string; password: string } | null>(null)

  useEffect(() => {
    adminApi.getOrderingStore(listingId)
      .then(r => setStore(r.data.store))
      .catch(() => message.error('加载点餐信息失败'))
      .finally(() => setLoading(false))
  }, [listingId])

  async function issue() {
    setIssuing(true)
    try {
      const r = await adminApi.issueOrderingCredentials(listingId)
      setStore(r.data.store)
      setIssued({ login_id: r.data.store.login_id, password: r.data.password })
    } catch {
      message.error('生成失败')
    } finally {
      setIssuing(false)
    }
  }

  async function toggleEnabled(v: boolean) {
    const r = await adminApi.updateOrderingStore(listingId, { is_enabled: v })
    setStore(r.data.store)
  }

  const credentialsText = issued
    ? `唐人道扫码点餐 商家后台\n网址：${ORDER_SITE}/owner\n账号：${issued.login_id}\n密码：${issued.password}`
    : ''

  return (
    <Card title="扫码点餐" loading={loading} style={{ marginBottom: 16 }}>
      {store ? (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Descriptions column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="商家账号"><Text code copyable>{store.login_id}</Text></Descriptions.Item>
            <Descriptions.Item label="唐人道AI登录邮箱"><Text copyable>{store.login_email || '—'}</Text></Descriptions.Item>
            <Descriptions.Item label="桌号数">{store.table_count}</Descriptions.Item>
            <Descriptions.Item label="订单数">{store.order_count}</Descriptions.Item>
            <Descriptions.Item label="店家接单">{store.accepting_orders ? '接单中' : '已暂停'}</Descriptions.Item>
            <Descriptions.Item label="启用点餐">
              <Switch size="small" checked={store.is_enabled} onChange={toggleEnabled} />
            </Descriptions.Item>
          </Descriptions>
          <Popconfirm title="重置后旧密码立即失效，确定？" onConfirm={issue}>
            <Button icon={<KeyOutlined />} loading={issuing}>重置密码</Button>
          </Popconfirm>
        </Space>
      ) : (
        <Space direction="vertical" size={12}>
          <Text type="secondary">
            为店家生成扫码点餐后台账号。店家登录后即为该店的管理者，菜单与唐人道AI里的菜单同步。
          </Text>
          <Button type="primary" icon={<KeyOutlined />} loading={issuing} onClick={issue}>生成商家账号</Button>
        </Space>
      )}

      <Modal
        open={!!issued}
        title="商家账号已生成"
        onCancel={() => setIssued(null)}
        footer={[
          <Button key="copy" icon={<CopyOutlined />} onClick={() => { navigator.clipboard.writeText(credentialsText); message.success('已复制') }}>
            复制发给店家
          </Button>,
          <Button key="ok" type="primary" onClick={() => setIssued(null)}>完成</Button>,
        ]}
      >
        <Alert type="warning" showIcon message="密码只显示这一次，关闭后无法再查看（可以重置）" style={{ marginBottom: 12 }} />
        <Paragraph style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', background: '#fafafa', padding: 12, borderRadius: 8 }}>
          {credentialsText}
        </Paragraph>
      </Modal>
    </Card>
  )
}
