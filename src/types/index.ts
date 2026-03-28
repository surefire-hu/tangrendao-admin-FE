// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthTokens {
  access: string
  refresh: string
}

export interface AuthUser {
  id: string
  email: string
  username: string | null
  role: 'user' | 'merchant' | 'moderator' | 'admin'
  is_staff: boolean
  is_superuser: boolean
  is_registered: boolean
  avatar: string | null
  created_at: string
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// ── Admin Stats ───────────────────────────────────────────────────────────────

export interface DashboardStats {
  users_total: number
  users_today: number
  users_week: number
  guests_total: number
  listings_pending: number
  listings_approved: number
  listings_total: number
  jobs_today: number
  seeks_today: number
  classifieds_today: number
  jobs_week: number
  seeks_week: number
  classifieds_week: number
  convs_today: number
  messages_today: number
  phone_clicks_today: number
  phone_clicks_week: number
  searches_today: number
  ads_active: number
  global_ctr: number
}

export interface DailyDataPoint {
  date: string
  count: number
}

export interface MonthlyDataPoint {
  month: string
  count: number
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string
  email: string | null
  username: string | null
  first_name: string
  last_name: string
  role: 'user' | 'merchant' | 'moderator' | 'admin'
  is_active: boolean
  is_registered: boolean
  is_staff: boolean
  country: string
  created_at: string
  last_login: string | null
  avatar: string | null
  // Aggregated stats
  events_count?: number
  events_today?: number
  events_this_month?: number
}

export interface UserOperationStats {
  daily: DailyDataPoint[]
  monthly: MonthlyDataPoint[]
  total_events: number
  breakdown: Record<string, number>
}

// ── Advertisements ────────────────────────────────────────────────────────────

export type AdPosition =
  | 'any' | 'services' | 'job_detail' | 'restaurant_detail'
  | 'exchange' | 'permesso' | 'forum' | 'forum_detail'
  | 'passport' | 'local_service_detail' | 'housing_detail' | 'market_detail'

export type AdCountry = 'ALL' | 'IT' | 'DE' | 'FR' | 'ES' | 'GB' | 'PT' | 'NL' | 'BE' | 'CH' | 'AT'

export interface BannerAd {
  id: string
  image: string | null
  image_url: string | null
  link_url: string
  linked_content_type: string
  linked_content_id: string
  country: AdCountry
  position: AdPosition
  is_active: boolean
  priority: number
  display_probability: number
  start_date: string | null
  end_date: string | null
  created_at: string
  impressions: number
  clicks: number
  ctr?: number
}

export interface BannerAdCreate {
  image?: File
  link_url?: string
  linked_content_type?: string
  linked_content_id?: string
  country: AdCountry
  position: AdPosition
  is_active: boolean
  priority: number
  display_probability: number
  start_date?: string
  end_date?: string
}

// ── Publications ──────────────────────────────────────────────────────────────

export type PublicationType = 'market' | 'local_service' | 'housing' | 'job_post' | 'job_seek' | 'listing'

export interface ClassifiedItem {
  id: string
  title: string
  category: string
  item_type: 'local_service' | 'housing' | 'market'
  status: 'pending' | 'approved' | 'rejected'
  price: string | null
  country: string
  city: string
  created_at: string
  updated_at: string
  author?: { id: string; email: string; username: string }
  views_count: number
  phone_clicks_count: number
}

export interface JobPost {
  id: string
  title: string
  company: string | null
  status: 'pending' | 'approved' | 'rejected'
  country: string
  city: string
  created_at: string
  author?: { id: string; email: string; username: string }
  views_count: number
}

export interface JobSeek {
  id: string
  title: string
  status: 'pending' | 'approved' | 'rejected'
  country: string
  city: string
  created_at: string
  author?: { id: string; email: string; username: string }
}

export interface Listing {
  id: string
  name: string
  status: 'pending' | 'approved' | 'rejected'
  country: string
  city: string
  created_at: string
  views_count: number
}

export interface PublicationStats {
  id: string
  type: PublicationType
  title: string
  daily: DailyDataPoint[]
  monthly: MonthlyDataPoint[]
  total_views: number
  total_phone_clicks: number
  total_saves: number
  status: string
  created_at: string
}

// ── Admin Activity Log ────────────────────────────────────────────────────────

export type AdminActionType =
  | 'approve' | 'reject' | 'ban_user' | 'unban_user'
  | 'role_change' | 'broadcast' | 'staff_change'

export interface AdminActivityLog {
  id: string
  admin_id: string | null
  admin_email: string | null
  admin_username: string | null
  action: AdminActionType
  target_type: string
  target_id: string
  details: Record<string, unknown>
  created_at: string
}

export interface AdminActivityLogList {
  count: number
  results: AdminActivityLog[]
}

// ── Broadcast ─────────────────────────────────────────────────────────────────

export interface BroadcastPayload {
  title: string
  body: string
  target_role?: string
  target_country?: string
}

export interface BroadcastResult {
  sent_to: number
}
