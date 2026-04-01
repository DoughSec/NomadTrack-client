const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {}
const rawBaseUrl = String(env.VITE_API_URL ?? env.REACT_APP_API_URL ?? '').trim()
const sanitizedBaseUrl = rawBaseUrl.replace(/\/+$/, '')
const API_BASE_URL = /\/nomadTrack$/i.test(sanitizedBaseUrl)
  ? sanitizedBaseUrl
  : `${sanitizedBaseUrl}/nomadTrack`

export default API_BASE_URL


// const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {}
// const isLocalDevelopment = env.DEV === true
// const defaultBaseUrl = isLocalDevelopment ? 'http://localhost:8080' : ''
// const rawBaseUrl = String(env.VITE_API_URL ?? env.REACT_APP_API_URL ?? defaultBaseUrl).trim()
// const sanitizedBaseUrl = rawBaseUrl.replace(/\/+$/, '')
// const API_BASE_URL = sanitizedBaseUrl
//   ? (/\/nomadTrack$/i.test(sanitizedBaseUrl)
//     ? sanitizedBaseUrl
//     : `${sanitizedBaseUrl}/nomadTrack`)
//   : '/nomadTrack'

// export default API_BASE_URL

