import { create } from 'zustand'
import type { AuthUser, AuthTokens } from '../types'
import { authApi } from '../api/auth'

interface AuthState {
  user: AuthUser | null
  tokens: AuthTokens | null
  isLoading: boolean

  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

// Hydrate synchronously from localStorage so ProtectedRoute
// sees the correct user on the very first render (before any useEffect).
function loadFromStorage(): { user: AuthUser | null; tokens: AuthTokens | null } {
  try {
    const rawUser   = localStorage.getItem('auth_user')
    const rawTokens = localStorage.getItem('auth_tokens')
    if (rawUser && rawTokens) {
      return { user: JSON.parse(rawUser), tokens: JSON.parse(rawTokens) }
    }
  } catch {
    // corrupted storage — ignore
  }
  return { user: null, tokens: null }
}

const persisted = loadFromStorage()

export const useAuthStore = create<AuthState>((set, get) => ({
  user:      persisted.user,
  tokens:    persisted.tokens,
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true })
    try {
      const res = await authApi.login(email, password)
      const { user, tokens } = res.data
      const canAccess = user.role === 'admin' || user.is_staff || user.is_superuser
      if (!canAccess) {
        throw new Error('无访问权限：仅限管理员和员工登录。')
      }
      localStorage.setItem('auth_tokens', JSON.stringify(tokens))
      localStorage.setItem('auth_user', JSON.stringify(user))
      set({ user, tokens })
    } finally {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    const { tokens } = get()
    if (tokens?.refresh) {
      try { await authApi.logout(tokens.refresh) } catch { /* silent */ }
    }
    localStorage.removeItem('auth_tokens')
    localStorage.removeItem('auth_user')
    set({ user: null, tokens: null })
  },
}))
