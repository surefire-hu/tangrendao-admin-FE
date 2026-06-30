import { apiClient } from './client'

// Operator-side view of a chat.Message (role: 'user' | 'assistant' | 'system';
// 'assistant' means the operator's reply in support context).
export type SupportMessageRole = 'user' | 'assistant' | 'system'

export interface SupportMessage {
  id: string
  role: SupportMessageRole
  content: string
  metadata?: Record<string, unknown>
  created_at: string
  attachment_url?: string | null
  attachment_kind?: '' | 'image' | 'pdf'
  attachment_name?: string
  attachment_size?: number | null
}

export interface OperatorDisplay {
  id: string
  name: string
  avatar_url: string | null
}

export interface SupportConversation {
  id: string
  title: string
  kind: 'ai' | 'support'
  is_closed: boolean
  is_read: boolean
  is_pinned: boolean
  is_favorite: boolean
  operator_unread_count: number
  last_message_preview: {
    role: SupportMessageRole
    content: string
    created_at: string
  } | null
  user_display?: { id: string; name: string; avatar_url: string | null }
  claimed_by?: OperatorDisplay | null
  is_claim_active?: boolean
  is_claimed_by_me?: boolean
  created_at: string
  updated_at: string
  closed_at: string | null
}

export interface PresenceResponse {
  online: boolean
  online_count: number
}

export interface ClaimResponse {
  claimed_by: OperatorDisplay | null
  is_claim_active: boolean
  is_claimed_by_me: boolean
}

function getAccessToken(): string {
  const raw = localStorage.getItem('auth_tokens')
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw)
    return parsed.access ?? ''
  } catch {
    return ''
  }
}

function wsBase(): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiUrl: string = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000/api'
  return apiUrl.replace(/^http/, 'ws').replace(/\/api\/?$/, '')
}

export const supportApi = {
  async listInbox(statusFilter: 'open' | 'closed' = 'open') {
    const res = await apiClient.get<{ results: SupportConversation[] }>(
      '/chat/support/admin/inbox/', { params: { status: statusFilter } },
    )
    return res.data.results
  },

  async unreadCount() {
    const res = await apiClient.get<{ unread_count: number }>('/chat/support/admin/inbox/unread-count/')
    return res.data.unread_count
  },

  async fetchMessages(conversationId: string) {
    // Operator-side detail: returns conversation + messages without enforcing user-ownership.
    const res = await apiClient.get<SupportConversation & { messages: SupportMessage[] }>(
      `/chat/support/admin/conversations/${conversationId}/`,
    )
    const { messages, ...conversation } = res.data
    return { conversation, messages }
  },

  async sendMessage(conversationId: string, content: string) {
    const res = await apiClient.post<SupportMessage>(
      `/chat/support/admin/conversations/${conversationId}/send/`,
      { content },
    )
    return res.data
  },

  async markRead(conversationId: string) {
    await apiClient.post(`/chat/support/admin/conversations/${conversationId}/mark-read/`, {})
  },

  async getPresence() {
    const res = await apiClient.get<PresenceResponse>('/chat/support/admin/presence/')
    return res.data
  },

  async setPresence(online: boolean) {
    const res = await apiClient.post<PresenceResponse>('/chat/support/admin/presence/', { online })
    return res.data
  },

  async claim(conversationId: string) {
    const res = await apiClient.post<ClaimResponse>(
      `/chat/support/admin/conversations/${conversationId}/claim/`,
    )
    return res.data
  },

  async release(conversationId: string) {
    const res = await apiClient.delete<ClaimResponse>(
      `/chat/support/admin/conversations/${conversationId}/claim/`,
    )
    return res.data
  },

  async close(conversationId: string) {
    const res = await apiClient.post<SupportConversation>(
      `/chat/support/admin/conversations/${conversationId}/close/`,
      {},
    )
    return res.data
  },

  openSocket(
    conversationId: string,
    handlers: {
      onMessage?: (m: SupportMessage) => void
      onStatus?:  (status: 'open' | 'closed') => void
      onClose?:   (code: number) => void
    },
  ): WebSocket {
    const token = getAccessToken()
    const url = `${wsBase()}/ws/chat/${conversationId}/?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(url)
    ws.onclose = (e) => handlers.onClose?.(e.code)
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.type === 'message' && data.message) handlers.onMessage?.(data.message)
        else if (data.type === 'status' && data.status) handlers.onStatus?.(data.status)
      } catch { /* ignore */ }
    }
    return ws
  },

  // Global operator inbox socket — live unread count for the sidebar red dot.
  openInboxSocket(onUpdate: (unreadCount: number) => void): WebSocket {
    const token = getAccessToken()
    const ws = new WebSocket(`${wsBase()}/ws/support/inbox/?token=${encodeURIComponent(token)}`)
    ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data.type === 'inbox_update' && typeof data.unread_count === 'number') {
          onUpdate(data.unread_count)
        }
      } catch { /* ignore */ }
    }
    return ws
  },
}
