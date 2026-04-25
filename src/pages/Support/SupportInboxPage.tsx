import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Layout, List, Avatar, Typography, Badge, Button, Input, Empty,
  Popconfirm, Tabs, Tag, Space, message,
} from 'antd'
import { UserOutlined, LockOutlined, SendOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  supportApi,
  type SupportConversation,
  type SupportMessage,
} from '../../api/support'

const { Sider, Content } = Layout
const { Text, Paragraph } = Typography
const { TextArea } = Input

type StatusFilter = 'open' | 'closed'

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    })
  } catch { return '' }
}

export function SupportInboxPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [items, setItems]               = useState<SupportConversation[]>([])
  const [loading, setLoading]           = useState(false)
  const [selectedId, setSelectedId]     = useState<string | null>(null)
  const [messages, setMessages]         = useState<SupportMessage[]>([])
  const [draft, setDraft]               = useState('')
  const [sending, setSending]           = useState(false)
  const [closing, setClosing]           = useState(false)
  const [currentConv, setCurrentConv]   = useState<SupportConversation | null>(null)

  const socketRef = useRef<WebSocket | null>(null)
  const listEndRef = useRef<HTMLDivElement | null>(null)

  const selected = useMemo(
    () => items.find(x => x.id === selectedId) ?? currentConv,
    [items, selectedId, currentConv],
  )

  async function loadInbox() {
    setLoading(true)
    try {
      const res = await supportApi.listInbox(statusFilter)
      setItems(res)
      if (selectedId && !res.some(x => x.id === selectedId)) {
        setSelectedId(null)
        setMessages([])
        setCurrentConv(null)
      }
    } catch {
      message.error('加载会话失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadInbox() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [statusFilter])

  // Poll inbox every 30s (WS covers individual-conversation deltas, this keeps the list fresh)
  useEffect(() => {
    const t = setInterval(loadInbox, 30_000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  // When a conversation is selected: fetch messages, open WS
  useEffect(() => {
    if (!selectedId) return
    let cancelled = false

    ;(async () => {
      try {
        const res = await supportApi.fetchMessages(selectedId)
        if (cancelled) return
        setMessages(res.messages)
        setCurrentConv(res.conversation)
        // Reset operator unread on this conversation
        supportApi.markRead(selectedId).catch(() => {})
        setItems(prev => prev.map(c => c.id === selectedId ? { ...c, operator_unread_count: 0 } : c))
      } catch {
        message.error('加载消息失败')
      }
    })()

    const ws = supportApi.openSocket(selectedId, {
      onMessage: (m) => {
        setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
        if (m.role === 'user') {
          supportApi.markRead(selectedId).catch(() => {})
        }
      },
      onStatus: (s) => {
        if (s === 'closed') {
          setCurrentConv(prev => prev ? { ...prev, is_closed: true } : prev)
        }
      },
    })
    socketRef.current = ws

    return () => {
      cancelled = true
      try { ws.close() } catch { /* ignore */ }
      socketRef.current = null
    }
  }, [selectedId])

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const text = draft.trim()
    if (!text || !selectedId || sending) return
    setSending(true)
    try {
      const msg = await supportApi.sendMessage(selectedId, text)
      setMessages(prev => prev.some(x => x.id === msg.id) ? prev : [...prev, msg])
      setDraft('')
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detail = (err as any)?.response?.data?.detail
      message.error(detail ?? '发送失败')
    } finally {
      setSending(false)
    }
  }

  async function closeConversation() {
    if (!selectedId || closing) return
    setClosing(true)
    try {
      const conv = await supportApi.close(selectedId)
      setCurrentConv(conv)
      message.success('已关闭对话')
      loadInbox()
    } catch {
      message.error('关闭失败')
    } finally {
      setClosing(false)
    }
  }

  const isClosed = currentConv?.is_closed === true

  return (
    <Layout style={{ height: 'calc(100vh - 112px)', background: '#fff', borderRadius: 8 }}>
      <Sider
        width={320}
        style={{ background: '#fafafa', borderRight: '1px solid #f0f0f0', overflow: 'auto' }}
      >
        <div style={{ padding: 12, borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tabs
            size="small"
            activeKey={statusFilter}
            onChange={(k) => setStatusFilter(k as StatusFilter)}
            items={[
              { key: 'open',   label: '进行中' },
              { key: 'closed', label: '已结束' },
            ]}
            style={{ flex: 1 }}
          />
          <Button size="small" icon={<ReloadOutlined />} loading={loading} onClick={loadInbox} />
        </div>

        {items.length === 0 ? (
          <div style={{ padding: 24 }}><Empty description="暂无会话" /></div>
        ) : (
          <List
            dataSource={items}
            renderItem={item => (
              <List.Item
                onClick={() => setSelectedId(item.id)}
                style={{
                  padding: 12,
                  cursor: 'pointer',
                  background: item.id === selectedId ? '#e6f4ff' : 'transparent',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <List.Item.Meta
                  avatar={
                    <Badge count={item.operator_unread_count} size="small" offset={[-4, 4]}>
                      <Avatar icon={<UserOutlined />} src={item.user_display?.avatar_url ?? undefined} />
                    </Badge>
                  }
                  title={
                    <Space size={6}>
                      <Text strong ellipsis style={{ maxWidth: 160 }}>
                        {item.user_display?.name ?? '用户'}
                      </Text>
                      {item.is_closed && <Tag color="default">已关闭</Tag>}
                    </Space>
                  }
                  description={
                    <div>
                      <Paragraph
                        ellipsis={{ rows: 1 }}
                        style={{ margin: 0, fontSize: 12, color: '#8c8c8c' }}
                      >
                        {item.last_message_preview?.content ?? '(暂无消息)'}
                      </Paragraph>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {formatDate(item.updated_at)}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Sider>

      <Content style={{ display: 'flex', flexDirection: 'column' }}>
        {!selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty description="请选择一个会话" />
          </div>
        ) : (
          <>
            <div
              style={{
                padding: '12px 20px',
                borderBottom: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Space>
                <Avatar icon={<UserOutlined />} src={selected.user_display?.avatar_url ?? undefined} />
                <div>
                  <Text strong>{selected.user_display?.name ?? '用户'}</Text>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {isClosed ? '已关闭' : '进行中'} · 创建于 {formatDate(selected.created_at)}
                    </Text>
                  </div>
                </div>
              </Space>

              {!isClosed && (
                <Popconfirm
                  title="结束对话"
                  description="结束后用户将无法继续发送消息。"
                  okText="结束"
                  cancelText="取消"
                  onConfirm={closeConversation}
                >
                  <Button danger icon={<LockOutlined />} loading={closing}>结束对话</Button>
                </Popconfirm>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', background: '#f5f5f5' }}>
              {messages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>暂无消息</div>
              )}
              {messages.map(msg => {
                if (msg.role === 'system') {
                  return (
                    <div key={msg.id} style={{ textAlign: 'center', margin: '12px 0' }}>
                      <Tag>{msg.content}</Tag>
                    </div>
                  )
                }
                // role='assistant' = operator's reply in support context
                const fromOperator = msg.role === 'assistant'
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: fromOperator ? 'flex-end' : 'flex-start',
                      marginBottom: 10,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '65%',
                        background: fromOperator ? '#1677ff' : '#fff',
                        color: fromOperator ? '#fff' : '#000',
                        padding: '8px 12px',
                        borderRadius: 8,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                      }}
                    >
                      {msg.content}
                      <div
                        style={{
                          fontSize: 10,
                          marginTop: 4,
                          color: fromOperator ? 'rgba(255,255,255,0.7)' : '#aaa',
                          textAlign: 'right',
                        }}
                      >
                        {formatTime(msg.created_at)}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={listEndRef} />
            </div>

            {isClosed ? (
              <div style={{ padding: 16, borderTop: '1px solid #f0f0f0', textAlign: 'center', color: '#999' }}>
                <LockOutlined /> 此对话已关闭
              </div>
            ) : (
              <div style={{ padding: 12, borderTop: '1px solid #f0f0f0', display: 'flex', gap: 8 }}>
                <TextArea
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  placeholder="输入回复…（Enter 发送，Shift+Enter 换行）"
                  autoSize={{ minRows: 1, maxRows: 5 }}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) { e.preventDefault(); send() }
                  }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={sending}
                  onClick={send}
                  disabled={!draft.trim()}
                >
                  发送
                </Button>
              </div>
            )}
          </>
        )}
      </Content>
    </Layout>
  )
}
