import { apiClient } from './client'

export interface AdminCountry {
  code: string
  name: string
  name_zh: string
  phone_prefix: string
  postal_regex: string
  postal_example: string
  currency: string
  flag_emoji: string
  is_active: boolean
  is_hot: boolean
  default_provinces: string[]
  province_admin_level: 1 | 2 | 3
  postal_count: number
  created_at: string
  updated_at: string
}

export type CountryPayload = Omit<AdminCountry, 'postal_count' | 'created_at' | 'updated_at'>

export interface ImportResult {
  ok: boolean
  deleted?: number
  inserted?: number
  error?: string
  log?: string
  detected_level?: 1 | 2 | 3
  detect_reason?: string
  detect_confidence?: number
  translated_rows?: number
}

export interface ImportResponse {
  results: Record<string, ImportResult>
}

export interface DetectResult {
  ok: boolean
  level?: 1 | 2 | 3
  confidence?: number
  reason?: string
  samples?: Record<'1' | '2' | '3', string[]>
  applied?: boolean
  error?: string
}

export interface TranslateResponse {
  ok: boolean
  error?: string
  log?: string
}

export const geographyApi = {
  list: () =>
    apiClient.get<AdminCountry[]>('/geo/admin/countries/'),

  create: (data: CountryPayload) =>
    apiClient.post<AdminCountry>('/geo/admin/countries/', data),

  update: (code: string, data: Partial<CountryPayload>) =>
    apiClient.patch<AdminCountry>(`/geo/admin/countries/${code}/`, data),

  remove: (code: string) =>
    apiClient.delete(`/geo/admin/countries/${code}/`),

  // Import runs in the background now → returns { started, ... } (202).
  // admin_level (1|2|3) forces the province level; omit to let AI auto-detect.
  importGeoNames: (countries: string[], autoDetect = false, adminLevel?: number) =>
    apiClient.post<{ started: boolean; countries: string[]; admin_level: number | null; auto_detect: boolean; detail: string }>(
      '/geo/admin/import-geonames/',
      { countries, auto_detect: autoDetect, ...(adminLevel ? { admin_level: adminLevel } : {}) },
    ),

  detectAdminLevel: (country: string, apply = false) =>
    apiClient.post<DetectResult>('/geo/admin/detect-admin-level/', { country, apply }),

  translateProvinces: (country: string, force = false) =>
    apiClient.post<TranslateResponse>('/geo/admin/translate-provinces/', { country, force }),

  searchProvinces: (country: string, q: string) =>
    apiClient.get<ProvinceOption[]>('/geo/provinces/', { params: { country, q } }),

  // ── Popular cities (heat list on every search page) ────────────────────
  listPopularCities: (country?: string) =>
    apiClient.get<PopularCity[]>('/geo/admin/popular-cities/', { params: country ? { country } : {} }),
  createPopularCity: (data: PopularCityInput) =>
    apiClient.post<PopularCity>('/geo/admin/popular-cities/', data),
  updatePopularCity: (id: number, data: Partial<PopularCityInput>) =>
    apiClient.patch<PopularCity>(`/geo/admin/popular-cities/${id}/`, data),
  deletePopularCity: (id: number) =>
    apiClient.delete(`/geo/admin/popular-cities/${id}/`),
}

export interface PopularCity {
  id: number
  country: string
  name: string
  click_count: number
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export type PopularCityInput = Omit<PopularCity, 'id' | 'created_at' | 'updated_at'>

export interface ProvinceOption {
  name: string
  name_zh: string
  region: string
}
