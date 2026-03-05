const API_BASE_URL = String(import.meta.env.VITE_API_URL ?? import.meta.env.REACT_APP_API_URL ?? '').replace(/\/+$/, '')

export default API_BASE_URL
