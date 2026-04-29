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
}

export interface ImportResponse {
  results: Record<string, ImportResult>
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

  importGeoNames: (countries: string[]) =>
    apiClient.post<ImportResponse>('/geo/admin/import-geonames/', { countries }),
}
