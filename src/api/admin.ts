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
  SplashAd,
  SplashAdCreate,
  SplashAdConfig,
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
  CurrencyMovement,
  CurrencyMovementsResponse,
  CurrencyMovementsRange,
  CandyPackage,
  CandyPackageInput,
  NavCategory,
  NavCategoryInput,
  NavGroupInput,
  NavSectionInput,
  NavItemInput,
  ClassifiedSubcategory,
  ClassifiedSubcategoryInput,
  ClassifiedSubType,
  ClassifiedSubTypeInput,
  ClassifiedCategoryRoot,
  ListingClaim,
  ListingClaimStatus,
  UnbanRequest,
  UnbanRequestStatus,
  AdminContentType,
  AdminUserContentItem,
  AdminNewsArticle,
  AdminNewsArticleInput,
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
    country?: string
    is_active?: boolean
    is_registered?: boolean
    is_bot?: boolean
    gender?: 'male' | 'female'
    ordering?: string
  }) => apiClient.get<PaginatedResponse<AdminUser>>('/admin/users/', { params }),

  getUserCounts: (params?: { search?: string; country?: string; role?: string }) =>
    apiClient.get<{ real: number; bot: number; guest: number }>('/admin/users/counts/', { params }),

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

  bulkCreateBots: (data: {
    count: number
    female_ratio: number
    source_weights: { anime: number; wangtu: number; animals: number; environments: number }
    country?: string
  }) =>
    apiClient.post<{ created: number; skipped: number; sample: AdminUser[] }>(
      '/admin/users/bulk-create-bots/',
      data,
      { timeout: 600_000 },
    ),

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

  // ── Splash (interstitial / 开屏广告) ──────────────────────────────────────
  getSplashAds: (params?: { page?: number; is_active?: boolean; country?: string }) =>
    apiClient.get<PaginatedResponse<SplashAd>>('/ads/splash/admin/', { params }),

  getSplashAd: (id: string) => apiClient.get<SplashAd>(`/ads/splash/admin/${id}/`),

  createSplashAd: (data: SplashAdCreate) => {
    const form = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, v as string | Blob)
    })
    return apiClient.post<SplashAd>('/ads/splash/admin/', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  updateSplashAd: (id: string, data: Partial<SplashAdCreate> & { image?: File }) => {
    const form = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, v as string | Blob)
    })
    return apiClient.patch<SplashAd>(`/ads/splash/admin/${id}/`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteSplashAd: (id: string) => apiClient.delete(`/ads/splash/admin/${id}/`),

  getSplashConfig: () =>
    apiClient.get<SplashAdConfig>('/ads/splash/admin/config/'),

  updateSplashConfig: (data: SplashAdConfig) =>
    apiClient.patch<SplashAdConfig>('/ads/splash/admin/config/', data),

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

  setPublicationPending: (type: PublicationType, id: string) =>
    apiClient.post(`/admin/publications/${type}/${id}/pending/`),

  deletePublication: (type: PublicationType, id: string) =>
    apiClient.post(`/admin/publications/${type}/${id}/delete/`),

  updatePublicationClassification: (
    type: PublicationType,
    id: string,
    payload: {
      category_id?: string | null
      business_type_ids?: string[]
      cuisine_types?: string[]
      industry_id?: string | null
      job_type_ids?: string[]
      subcategory?: string
      sub_type?: string
    },
  ) =>
    apiClient.patch(`/admin/publications/${type}/${id}/classification/`, payload),

  // Options for the classification editor
  getMerchantCategories: () =>
    apiClient.get<Array<{ id: string; name: string; types: Array<{ id: string; name: string }> }>>(
      '/merchants/categories/',
    ),

  // /jobs/industries/ is paginated by DRF default; unwrap to plain array.
  getJobIndustries: async () => {
    const r = await apiClient.get<
      | Array<{ id: string; name: string }>
      | { results: Array<{ id: string; name: string }> }
    >('/jobs/industries/', { params: { page_size: 1000 } })
    const data = Array.isArray(r.data) ? r.data : (r.data?.results ?? [])
    return { ...r, data }
  },

  getJobTypesForIndustry: (industryId: string) =>
    apiClient.get<Array<{ id: string; name: string }>>(`/jobs/industries/${industryId}/job_types/`),

  // Canonical classifieds taxonomy backed by the navigation tree
  // (housing/market/local_service ServiceSection + ServiceItem).
  getClassifiedTaxonomy: () =>
    apiClient.get<Record<
      'housing' | 'market' | 'local_service',
      Array<{ id: number; name: string; sub_types: Array<{ id: number; name: string }> }>
    >>('/classifieds/taxonomy/'),

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

  setForumPostPending: (id: string) =>
    apiClient.post(`/admin/forum/posts/${id}/pending/`),

  deleteForumPost: (id: string) =>
    apiClient.post(`/admin/forum/posts/${id}/delete/`),

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

  getCurrencyMovements: (params: { range: CurrencyMovementsRange; page?: number; page_size?: number }) =>
    apiClient.get<CurrencyMovementsResponse>('/admin/currency/movements/', { params }),

  // ── Candy packages (admin CRUD) ───────────────────────────────────────────
  listCandyPackages: (params?: { currency?: string; platform?: string }) =>
    apiClient.get<CandyPackage[]>('/admin/payments/packages/', { params }),

  createCandyPackage: (data: CandyPackageInput) =>
    apiClient.post<CandyPackage>('/admin/payments/packages/', data),

  updateCandyPackage: (id: number, data: Partial<CandyPackageInput>) =>
    apiClient.patch<CandyPackage>(`/admin/payments/packages/${id}/`, data),

  deleteCandyPackage: (id: number) =>
    apiClient.delete<void>(`/admin/payments/packages/${id}/`),

  // ── Service Navigation (admin CRUD) ───────────────────────────────────────
  getNavigation: () =>
    apiClient.get<NavCategory[]>('/admin/services/navigation/'),

  createNavCategory: (data: NavCategoryInput) =>
    apiClient.post<NavCategory>('/admin/services/categories/', data),
  updateNavCategory: (id: number, data: Partial<NavCategoryInput>) =>
    apiClient.patch<NavCategory>(`/admin/services/categories/${id}/`, data),
  deleteNavCategory: (id: number) =>
    apiClient.delete<void>(`/admin/services/categories/${id}/`),

  createNavGroup: (data: NavGroupInput) =>
    apiClient.post(`/admin/services/groups/`, data),
  updateNavGroup: (id: number, data: Partial<Omit<NavGroupInput, 'category'>>) =>
    apiClient.patch(`/admin/services/groups/${id}/`, data),
  deleteNavGroup: (id: number) =>
    apiClient.delete<void>(`/admin/services/groups/${id}/`),

  createNavSection: (data: NavSectionInput) =>
    apiClient.post(`/admin/services/sections/`, data),
  updateNavSection: (id: number, data: Partial<Omit<NavSectionInput, 'category'>>) =>
    apiClient.patch(`/admin/services/sections/${id}/`, data),
  deleteNavSection: (id: number) =>
    apiClient.delete<void>(`/admin/services/sections/${id}/`),

  createNavItem: (data: NavItemInput) =>
    apiClient.post(`/admin/services/items/`, data),
  updateNavItem: (id: number, data: Partial<Omit<NavItemInput, 'section'>>) =>
    apiClient.patch(`/admin/services/items/${id}/`, data),
  deleteNavItem: (id: number) =>
    apiClient.delete<void>(`/admin/services/items/${id}/`),

  // ── Classifieds taxonomy (housing / market / local_service) ──────────────
  getClassifiedSubcategories: (params?: { category?: ClassifiedCategoryRoot }) =>
    apiClient.get<ClassifiedSubcategory[]>('/admin/classifieds/subcategories/', { params }),
  createClassifiedSubcategory: (data: ClassifiedSubcategoryInput) =>
    apiClient.post<ClassifiedSubcategory>('/admin/classifieds/subcategories/', data),
  updateClassifiedSubcategory: (id: number, data: Partial<Omit<ClassifiedSubcategoryInput, 'category'>>) =>
    apiClient.patch<ClassifiedSubcategory>(`/admin/classifieds/subcategories/${id}/`, data),
  deleteClassifiedSubcategory: (id: number) =>
    apiClient.delete<void>(`/admin/classifieds/subcategories/${id}/`),

  createClassifiedSubType: (data: ClassifiedSubTypeInput) =>
    apiClient.post<ClassifiedSubType>('/admin/classifieds/sub-types/', data),
  updateClassifiedSubType: (id: number, data: Partial<Omit<ClassifiedSubTypeInput, 'subcategory'>>) =>
    apiClient.patch<ClassifiedSubType>(`/admin/classifieds/sub-types/${id}/`, data),
  deleteClassifiedSubType: (id: number) =>
    apiClient.delete<void>(`/admin/classifieds/sub-types/${id}/`),

  // ── Listing Claims ────────────────────────────────────────────────────────
  getListingClaims: (params?: { page?: number; page_size?: number; status?: ListingClaimStatus }) =>
    apiClient.get<PaginatedResponse<ListingClaim>>('/admin/listing-claims/', { params }),

  getListingClaimsUnreadCount: () =>
    apiClient.get<{ count: number }>('/admin/listing-claims/unread-count/'),

  matchListingClaim: (id: string) =>
    apiClient.post<ListingClaim>(`/admin/listing-claims/${id}/match/`),

  rejectListingClaim: (id: string, reason?: string) =>
    apiClient.post<ListingClaim>(`/admin/listing-claims/${id}/reject/`, { reason }),

  // ── Broadcast ─────────────────────────────────────────────────────────────
  // ── Ban / Unban appeals ──────────────────────────────────────────────────
  banUser: (id: string, ban_reason: string) =>
    apiClient.patch<AdminUser>(`/admin/users/${id}/`, { is_active: false, ban_reason }),

  unbanUser: (id: string) =>
    apiClient.patch<AdminUser>(`/admin/users/${id}/`, { is_active: true }),

  getUnbanRequests: (params?: {
    status?: UnbanRequestStatus | 'all'
    page?: number
    page_size?: number
  }) => apiClient.get<PaginatedResponse<UnbanRequest>>('/admin/unban-requests/', { params }),

  resolveUnbanRequest: (id: string, action: 'approve' | 'reject', admin_response: string) =>
    apiClient.post<UnbanRequest>(`/admin/unban-requests/${id}/${action}/`, { admin_response }),

  // ── Per-user content moderation ──────────────────────────────────────────
  getUserContent: (userId: string, type: AdminContentType, params?: { page?: number; page_size?: number }) =>
    apiClient.get<PaginatedResponse<AdminUserContentItem>>(
      `/admin/users/${userId}/content/`,
      { params: { ...params, type } },
    ),

  setContentHidden: (type: AdminContentType, id: string, hide: boolean) =>
    apiClient.post<{ hidden: boolean }>(`/admin/content/${type}/${id}/hide/`, { hide }),

  // ── News (admin CRUD) ────────────────────────────────────────────────────
  getNewsArticles: (params?: {
    country?: string
    is_published?: boolean
    author?: string
    search?: string
    page?: number
    page_size?: number
  }) => apiClient.get<PaginatedResponse<AdminNewsArticle>>('/admin/news/', { params }),

  getNewsArticle: (id: string) =>
    apiClient.get<AdminNewsArticle>(`/admin/news/${id}/`),

  createNewsArticle: (data: AdminNewsArticleInput) => {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v === undefined || v === null) return
      if (v instanceof File) fd.append(k, v)
      else if (typeof v === 'boolean') fd.append(k, v ? 'true' : 'false')
      else fd.append(k, String(v))
    })
    return apiClient.post<AdminNewsArticle>('/admin/news/', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  updateNewsArticle: (id: string, data: Partial<AdminNewsArticleInput>) => {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => {
      if (v === undefined || v === null) return
      if (v instanceof File) fd.append(k, v)
      else if (typeof v === 'boolean') fd.append(k, v ? 'true' : 'false')
      else fd.append(k, String(v))
    })
    return apiClient.patch<AdminNewsArticle>(`/admin/news/${id}/`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  deleteNewsArticle: (id: string) =>
    apiClient.delete<void>(`/admin/news/${id}/`),

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
