import axios from 'axios'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:8000/api'

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT access token to every request
apiClient.interceptors.request.use((config) => {
  const tokens = localStorage.getItem('auth_tokens')
  if (tokens) {
    const { access } = JSON.parse(tokens)
    if (access) config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

// Auto-refresh token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const tokens = localStorage.getItem('auth_tokens')
      if (tokens) {
        try {
          const { refresh } = JSON.parse(tokens)
          const res = await axios.post(`${API_URL}/auth/token/refresh/`, { refresh })
          const newAccess = res.data.access
          const updated = { ...JSON.parse(tokens), access: newAccess }
          localStorage.setItem('auth_tokens', JSON.stringify(updated))
          original.headers.Authorization = `Bearer ${newAccess}`
          return apiClient(original)
        } catch {
          localStorage.removeItem('auth_tokens')
          localStorage.removeItem('auth_user')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)
