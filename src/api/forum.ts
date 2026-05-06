import { apiClient } from './client'

export interface ForumHotKeyword {
  id: number
  term: string
  country: string
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ForumHotKeywordPayload = Pick<
  ForumHotKeyword,
  'term' | 'country' | 'display_order' | 'is_active'
>

export const forumApi = {
  listHotKeywords: (country?: string) =>
    apiClient.get<ForumHotKeyword[]>('/forum/admin/hot-keywords/', {
      params: country ? { country } : {},
    }),

  createHotKeyword: (data: ForumHotKeywordPayload) =>
    apiClient.post<ForumHotKeyword>('/forum/admin/hot-keywords/', data),

  updateHotKeyword: (id: number, data: Partial<ForumHotKeywordPayload>) =>
    apiClient.patch<ForumHotKeyword>(`/forum/admin/hot-keywords/${id}/`, data),

  removeHotKeyword: (id: number) =>
    apiClient.delete(`/forum/admin/hot-keywords/${id}/`),
}
