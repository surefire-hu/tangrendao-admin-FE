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

  importGeoNames: (countries: string[], autoDetect = false) =>
    apiClient.post<ImportResponse>('/geo/admin/import-geonames/', {
      countries, auto_detect: autoDetect,
    }),

  detectAdminLevel: (country: string, apply = false) =>
    apiClient.post<DetectResult>('/geo/admin/detect-admin-level/', { country, apply }),

  translateProvinces: (country: string, force = false) =>
    apiClient.post<TranslateResponse>('/geo/admin/translate-provinces/', { country, force }),

  searchProvinces: (country: string, q: string) =>
    apiClient.get<ProvinceOption[]>('/geo/provinces/', { params: { country, q } }),
}

export interface ProvinceOption {
  name: string
  name_zh: string
  region: string
}
