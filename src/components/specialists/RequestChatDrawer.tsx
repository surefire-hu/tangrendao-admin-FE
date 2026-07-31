import { useEffect, useState } from 'react'
import { Drawer, Spin, Empty, Space, Card, Descriptions, Tag, message } from 'antd'
import { FilePdfOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

import { specialistsApi, type ServiceRequestStatus } from '../../api/specialists'

const STATUS_LABEL: Record<ServiceRequestStatus, { color: string; text: string }> = {
  searching: { color: 'processing', text: '匹配中' },
  matched:   { color: 'cyan',       text: '已匹配' },
  confirmed: { color: 'blue',       text: '咨询中' },
  completed: { color: 'green',      text: '已完成' },
  cancelled: { color: 'default',    text: '已取消' },
}

// Read-only chat transcript viewer for a service request — shared by the
// specialist requests monitor and the refund-request review page.
export function RequestChatDrawer({ requestId, onClose }: { requestId: string | null; onClose: () => void }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<Awaited<ReturnType<typeof specialistsApi.getRequestMessages>>['data'] | null>(null)

  useEffect(() => {
    if (!requestId) { setData(null); return }
    let cancelled = false
    setLoading(true)
    specialistsApi.getRequestMessages(requestId).then(r => {
      if (!cancelled) setData(r.data)
    }).catch(() => {
      if (!cancelled) message.error('加载失败')
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [requestId])

  return (
    <Drawer
      open={!!requestId}
      title="聊天记录"
      onClose={onClose}
      width={Math.min(560, typeof window !== 'undefined' ? window.innerWidth - 60 : 560)}
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin /></div>
      ) : !data ? (
        <Empty />
      ) : (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Card size="small">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="状态"><Tag color={STATUS_LABEL[data.request.status].color}>{STATUS_LABEL[data.request.status].text}</Tag></Descriptions.Item>
              <Descriptions.Item label="分类">{data.request.category.name_zh}</Descriptions.Item>
              <Descriptions.Item label="糖果">{data.request.candy_spent} 糖果 {data.request.refunded ? <Tag color="green">已退</Tag> : null}</Descriptions.Item>
              <Descriptions.Item label="评分">{data.request.rating ? `⭐ ${data.request.rating}` : '—'}</Descriptions.Item>
            </Descriptions>
          </Card>

          {data.messages.length === 0
            ? <Empty description="暂无消息" />
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {data.messages.map(m => (
                  <div key={m.id} style={{
                    alignSelf: m.sender_kind === 'system' ? 'center' : (m.sender_kind === 'user' ? 'flex-end' : 'flex-start'),
                    maxWidth: '80%',
                  }}>
                    <div style={{ fontSize: 10, color: '#999', marginBottom: 2, textAlign: m.sender_kind === 'user' ? 'right' : 'left' }}>
                      {m.sender_kind === 'system' ? '系统' : m.sender_kind === 'user' ? '用户' : '专家'}
                      {' · '}
                      {dayjs(m.created_at).format('MM-DD HH:mm')}
                    </div>
                    <div style={{
                      padding: '8px 12px',
                      borderRadius: 12,
                      background: m.sender_kind === 'system'
                        ? '#f0f0f0'
                        : m.sender_kind === 'user' ? '#a5e89e' : '#fff',
                      border: m.sender_kind === 'system' ? 'none' : '1px solid #e6e6e6',
                      color: m.sender_kind === 'system' ? '#666' : '#000',
                      fontSize: m.sender_kind === 'system' ? 12 : 14,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {m.text || ''}
                      {m.attachment_url && m.attachment_kind === 'image' && (
                        <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 6 }}>
                          <img src={m.attachment_url} alt="" style={{ maxWidth: 220, maxHeight: 220, borderRadius: 6, display: 'block' }} />
                        </a>
                      )}
                      {m.attachment_url && m.attachment_kind === 'pdf' && (
                        <a href={m.attachment_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, color: '#1890ff' }}>
                          <FilePdfOutlined /> {m.attachment_name || 'PDF'}
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          }
        </Space>
      )}
    </Drawer>
  )
}
