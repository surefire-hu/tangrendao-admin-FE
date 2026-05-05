import { apiClient } from './client'

export type SpecialistCategoryCode =
  | 'accounting' | 'lawyer' | 'immigration' | 'consultant' | 'doctor'

export interface ServiceCategory {
  code: SpecialistCategoryCode
  name_zh: string
  icon: string
  price_candy: number
  description: string
  is_active: boolean
  display_order: number
}

export interface SpecialistPublic {
  id: string
  username: string | null
  full_name: string
  avatar_url: string | null
  category: SpecialistCategoryCode | null
  bio: string
  years_exp: number | null
  city: string
  rating: string | number
  total_orders: number
  is_online: boolean
}

export type ServiceRequestStatus =
  | 'searching' | 'matched' | 'confirmed' | 'completed' | 'cancelled'

export interface ServiceRequest {
  id: string
  user: string
  specialist: SpecialistPublic | null
  category: ServiceCategory
  candy_spent: number
  status: ServiceRequestStatus
  ai_context: string
  swaps_count: number
  rating: number | null
  rating_comment: string
  cancelled_by: string | null
  refunded: boolean
  created_at: string
  matched_at: string | null
  confirmed_at: string | null
  completed_at: string | null
  cancelled_at: string | null
}

export const specialistsApi = {
  // ── Categories ────────────────────────────────────────────────
  listCategories: () =>
    apiClient.get<ServiceCategory[]>('/specialists/admin/categories/'),

  updateCategory: (
    code: SpecialistCategoryCode,
    data: Partial<Pick<ServiceCategory, 'price_candy' | 'name_zh' | 'icon' | 'description' | 'is_active' | 'display_order'>>,
  ) => apiClient.patch<ServiceCategory>(`/specialists/admin/categories/${code}/`, data),

  // ── Specialists ───────────────────────────────────────────────
  listSpecialists: (params?: { category?: SpecialistCategoryCode; is_online?: boolean }) =>
    apiClient.get<SpecialistPublic[]>('/specialists/admin/specialists/', { params }),

  promoteUser: (data: {
    user_id: string
    category: SpecialistCategoryCode
    bio?: string
    years_exp?: number
    city?: string
  }) => apiClient.post<SpecialistPublic>('/specialists/admin/specialists/promote/', data),

  revokeSpecialist: (userId: string) =>
    apiClient.post<{ ok: true }>(`/specialists/admin/specialists/${userId}/revoke/`),

  // ── Specialist detail / stats ─────────────────────────────────
  getSpecialistDetail: (userId: string) =>
    apiClient.get<{
      profile: SpecialistPublic
      stats: {
        total: number
        completed: number
        cancelled: number
        confirmed: number
        matched: number
        candy_revenue: number
        avg_rating: number | null
        rated_count: number
        completion_rate: number
      }
      recent_requests: ServiceRequest[]
    }>(`/specialists/admin/specialists/${userId}/`),

  getSpecialistReviews: (userId: string) =>
    apiClient.get<Array<{
      request_id: string
      rating: number
      comment: string
      category: { code: SpecialistCategoryCode; name_zh: string }
      user: { id: string; username: string; email: string; full_name: string }
      completed_at: string | null
      created_at: string
    }>>(`/specialists/admin/specialists/${userId}/reviews/`),

  // ── Requests monitoring ───────────────────────────────────────
  listRequests: (params?: { status?: ServiceRequestStatus; category?: SpecialistCategoryCode }) =>
    apiClient.get<ServiceRequest[]>('/specialists/admin/requests/', { params }),

  getRequestMessages: (requestId: string) =>
    apiClient.get<{
      request: ServiceRequest
      messages: Array<{
        id: string
        request: string
        sender: string | null
        sender_kind: 'user' | 'specialist' | 'system'
        text: string
        attachment_url: string | null
        attachment_kind: 'image' | 'pdf' | null
        attachment_name: string
        attachment_size: number | null
        created_at: string
      }>
    }>(`/specialists/admin/requests/${requestId}/messages/`),
}
