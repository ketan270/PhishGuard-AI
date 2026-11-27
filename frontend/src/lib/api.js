import axios from 'axios'

const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '') + '/api',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pg_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let onUnauthorized = null
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && onUnauthorized && !err.config?.url?.includes('/auth/login')) onUnauthorized()
    return Promise.reject(err)
  },
)

export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err) return fallback
  if (err.code === 'ECONNABORTED') return 'The request timed out. Is the backend running?'
  if (!err.response) return 'Cannot reach the PhishGuard API. Make sure the backend is running on port 8000.'
  const d = err.response.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d.length) {
    const first = d[0]
    const field = Array.isArray(first.loc) ? first.loc[first.loc.length - 1] : ''
    return `${field ? field + ': ' : ''}${first.msg}`.replace('Value error, ', '')
  }
  return fallback
}

export default api
