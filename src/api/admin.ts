import { apiClient } from './client'
import type {
  DashboardStats,
  AdminUser,
  UserOperationStats,
  PaginatedResponse,
  BannerAd,
  BannerAdCreate,
  ClassifiedItem,
  JobPost,
  JobSeek,
  Listing,
  PublicationStats,
  PublicationType,
  AdminActivityLogList,
  BroadcastPayload,
  BroadcastResult,
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
    ordering?: string
  }) => apiClient.get<PaginatedResponse<AdminUser>>('/admin/users/', { params }),

  getUser: (id: string) => apiClient.get<AdminUser>(`/admin/users/${id}/`),

  getUserStats: (id: string) =>
    apiClient.get<UserOperationStats>(`/admin/users/${id}/stats/`),

  updateUser: (id: string, data: Partial<AdminUser> & { moderator_roles?: string[] }) =>
    apiClient.patch<AdminUser>(`/admin/users/${id}/`, data),

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
