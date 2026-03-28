import { apiClient } from './client'
import type { AuthTokens, AuthUser } from '../types'

export interface LoginResponse {
  user: AuthUser
  tokens: AuthTokens
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login/', { email, password }),

  profile: () => apiClient.get<AuthUser>('/auth/profile/'),

  logout: (refresh: string) => apiClient.post('/auth/logout/', { refresh }),
}
