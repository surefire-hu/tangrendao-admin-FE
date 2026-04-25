import { apiClient } from './client'
import type {
  DashboardStats,
  AdminUser,
  UserOperationStats,
  PaginatedResponse,
  BannerAd,
  BannerAdCreate,
  AdProduct,
  AdCard,
  AdCardCreate,
  ClassifiedItem,
  JobPost,
  JobSeek,
  Listing,
  PublicationStats,
  PublicationType,
  ForumPost,
  ForumPostStats,
  ForumKind,
  AdminActivityLogList,
  BroadcastPayload,
  BroadcastResult,
  CurrencyStats,
} from '../types'

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const adminApi = {
  getStats: () => apiClient.get<DashboardStats>('/admin/stats/'),

  // ── Users ────────────────────────────────────────────────────────────────
  getUsers: (params?: {
    page?: number
    page_size?: number
    role?: string
    search?: string
    is_active?: boolean
    is_registered?: boolean
    is_bot?: boolean
    gender?: 'male' | 'female'
    ordering?: string
  }) => apiClient.get<PaginatedResponse<AdminUser>>('/admin/users/', { params }),

  getUser: (id: string) => apiClient.get<AdminUser>(`/admin/users/${id}/`),

  getUserStats: (id: string) =>
    apiClient.get<UserOperationStats>(`/admin/users/${id}/stats/`),

  updateUser: (id: string, data: Partial<AdminUser> & { moderator_roles?: string[] }) =>
    apiClient.patch<AdminUser>(`/admin/users/${id}/`, data),

  createUser: (data: {
    email?: string
    username?: string
    password?: string
    first_name?: string
    last_name?: string
    role?: string
    is_bot?: boolean
    gender?: 'male' | 'female' | null
    country?: string
    avatar?: File | null
  }) => {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return
      if (v instanceof File) fd.append(k, v)
      else if (typeof v === 'boolean') fd.append(k, v ? 'true' : 'false')
      else fd.append(k, String(v))
    })
    return apiClient.post<AdminUser>('/admin/users/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  // ── Advertisements ────────────────────────────────────────────────────────
  getAds: (params?: { page?: number; is_active?: boolean; position?: string; country?: string }) =>
    apiClient.get<PaginatedResponse<BannerAd>>('/ads/banners/admin/', { params }),

  getAd: (id: string) => apiClient.get<BannerAd>(`/ads/banners/admin/${id}/`),

  createAd: (data: BannerAdCreate) => {
    const form = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, v as string | Blob)
    })
    return apiClient.post<BannerAd>('/ads/banners/admin/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  updateAd: (id: string, data: Partial<BannerAdCreate> & { image?: File }) => {
    const form = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, v as string | Blob)
    })
    return apiClient.patch<BannerAd>(`/ads/banners/admin/${id}/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteAd: (id: string) => apiClient.delete(`/ads/banners/admin/${id}/`),

  searchProducts: (params: { type: string; q?: string; country?: string; page?: number; page_size?: number }) =>
    apiClient.get<{ count: number; has_next: boolean; page: number; results: AdProduct[] }>('/ads/products/', { params }),

  // ── AdCards (Advertisement) ───────────────────────────────────────────────
  getAdCards: (params?: { page?: number; country?: string; is_active?: boolean }) =>
    apiClient.get<{ count: number; next: boolean; results: AdCard[] }>('/adcards/admin/', { params }),

  getAdCard: (id: string) =>
    apiClient.get<AdCard>(`/adcards/admin/${id}/`),

  createAdCard: (data: AdCardCreate) => {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v === undefined || v === null) return
      if (k === 'tags') fd.append(k, JSON.stringify(v))
      else if (v instanceof File) fd.append(k, v)
      else fd.append(k, String(v))
    })
    return apiClient.post<AdCard>('/adcards/admin/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  updateAdCard: (id: string, data: Partial<AdCardCreate>) => {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v === undefined || v === null) return
      if (k === 'tags') fd.append(k, JSON.stringify(v))
      else if (v instanceof File) fd.append(k, v)
      else fd.append(k, String(v))
    })
    return apiClient.patch<AdCard>(`/adcards/admin/${id}/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteAdCard: (id: string) =>
    apiClient.delete(`/adcards/admin/${id}/`),

  uploadAdCardThumbnail: (file: File) => {
    const fd = new FormData()
    fd.append('thumbnail', file)
    return apiClient.post<{ url: string }>('/adcards/upload-thumbnail/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  searchAdCardProducts: (params: { type: string; q?: string; country?: string; page?: number; page_size?: number }) =>
    apiClient.get<{ count: number; has_next: boolean; page: number; results: AdProduct[] }>('/adcards/products/', { params }),

  // ── Publications – Classifieds ────────────────────────────────────────────
  getClassifieds: (params?: {
    page?: number
    page_size?: number
    category?: string
    status?: string
    search?: string
    ordering?: string
  }) => apiClient.get<PaginatedResponse<ClassifiedItem>>('/classifieds/items/', { params }),

  getClassified: (id: string) => apiClient.get<ClassifiedItem>(`/classifieds/items/${id}/`),

  // ── Publications – Jobs ───────────────────────────────────────────────────
  getJobPosts: (params?: { page?: number; status?: string; search?: string; ordering?: string }) =>
    apiClient.get<PaginatedResponse<JobPost>>('/jobs/posts/', { params }),

  getJobSeeks: (params?: { page?: number; status?: string; search?: string; ordering?: string }) =>
    apiClient.get<PaginatedResponse<JobSeek>>('/jobs/seeks/', { params }),

  // ── Publications – Listings (restaurants etc.) ────────────────────────────
  getListings: (params?: { page?: number; status?: string; search?: string; ordering?: string }) =>
    apiClient.get<PaginatedResponse<Listing>>('/listings/', { params }),

  // ── Publication Stats ─────────────────────────────────────────────────────
  getPublicationStats: (type: PublicationType, id: string) =>
    apiClient.get<PublicationStats>(`/admin/publications/${type}/${id}/stats/`),

  // ── Publication moderation ────────────────────────────────────────────────
  approvePublication: (type: PublicationType, id: string) =>
    apiClient.post(`/admin/publications/${type}/${id}/approve/`),

  rejectPublication: (type: PublicationType, id: string, reason?: string) =>
    apiClient.post(`/admin/publications/${type}/${id}/reject/`, { reason }),

  // ── Forum (posts + videos) ────────────────────────────────────────────────
  getForumPosts: (params?: {
    page?: number
    page_size?: number
    kind?: ForumKind
    post_type?: 'text' | 'photo' | 'video'
    status?: string
    country?: string
    category?: string
    search?: string
  }) => apiClient.get<{ count: number; results: ForumPost[] }>('/admin/forum/posts/', { params }),

  getForumPostStats: (id: string) =>
    apiClient.get<ForumPostStats>(`/admin/forum/posts/${id}/stats/`),

  approveForumPost: (id: string) =>
    apiClient.post(`/admin/forum/posts/${id}/approve/`),

  rejectForumPost: (id: string, reason?: string) =>
    apiClient.post(`/admin/forum/posts/${id}/reject/`, { reason }),

  // ── Activity Log (solo superadmin) ────────────────────────────────────────
  getActivityLog: (params?: {
    page?: number
    page_size?: number
    action?: string
    admin_id?: string
    date_from?: string
    date_to?: string
  }) => apiClient.get<AdminActivityLogList>('/admin/activity-log/', { params }),

  getActivityLogExportUrl: (params?: {
    action?: string
    date_from?: string
    date_to?: string
  }) => {
    const base = apiClient.defaults.baseURL ?? ''
    const qs = new URLSearchParams()
    if (params?.action) qs.set('action', params.action)
    if (params?.date_from) qs.set('date_from', params.date_from)
    if (params?.date_to) qs.set('date_to', params.date_to)
    return `${base}/admin/activity-log/export/${qs.toString() ? '?' + qs.toString() : ''}`
  },

  // ── Currency ──────────────────────────────────────────────────────────────────
  topupCurrency: (userId: string, data: { candy_amount: number; coin_amount: number; note?: string }) =>
    apiClient.post<{ ok: boolean; new_candy: number; new_coin: number }>(
      `/admin/users/${userId}/topup/`, data
    ),

  getCurrencyStats: () =>
    apiClient.get<CurrencyStats>('/admin/currency/stats/'),

  // ── Broadcast ─────────────────────────────────────────────────────────────
  sendBroadcast: (data: BroadcastPayload) => {
    const form = new FormData()
    form.append('title', data.title)
    form.append('body', data.body)
    if (data.target_role) form.append('target_role', data.target_role)
    if (data.target_country) form.append('target_country', data.target_country)
    if (data.image) form.append('image', data.image)
    return apiClient.post<BroadcastResult>('/admin/broadcast/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
