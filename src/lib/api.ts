import { createApiClient } from './httpClient'

// Public configuration only. Never put secrets in any VITE_* variable.
export const api = createApiClient(import.meta.env.VITE_API_BASE_URL?.trim() ?? '')
