export class ApiError extends Error {
  status: number
  constructor(status: number) {
    super(status === 401 ? 'Sua sessão expirou. Entre novamente.' :
      status === 403 ? 'Você não tem permissão para esta ação.' :
      'Não foi possível concluir. Verifique sua conexão e tente novamente.')
    this.name = 'ApiError'
    this.status = status
  }
}

// Tokens live only in this closure. No browser storage or query persistence.
export function createApiClient(baseUrl: string, fetcher: typeof fetch = fetch) {
  let token: string | null = null
  let generation = 0
  let refreshing: Promise<void> | null = null
  let loggingIn: Promise<void> | null = null
  let loggingOut: Promise<void> | null = null
  let blocked = false
  let onExpired = () => {}
  const base = baseUrl.replace(/\/$/, '') + '/api/v1'

  function clear() { token = null; blocked = true; generation++ }
  function expire() { clear(); onExpired() }

  async function raw(path: string, options: RequestInit = {}, bearer: string | null = null): Promise<Response> {
    const controller = new AbortController()
    const abort = () => controller.abort()
    if (options.signal?.aborted) controller.abort()
    options.signal?.addEventListener('abort', abort, { once: true })
    const timeout = setTimeout(abort, 15_000)
    try {
      return await fetcher(base + path, {
        ...options, credentials: 'include', cache: 'no-store', signal: controller.signal,
        headers: { ...(options.body ? {'Content-Type':'application/json'} : {}),
          ...(bearer ? {Authorization: `Bearer ${bearer}`} : {}) },
      })
    } catch {
      throw new ApiError(0)
    } finally {
      clearTimeout(timeout)
      options.signal?.removeEventListener('abort', abort)
    }
  }

  async function body<T>(response: Response): Promise<T> {
    if (!response.ok) throw new ApiError(response.status)
    if (response.status === 204) return undefined as T
    try { return await response.json() as T } catch { throw new ApiError(502) }
  }

  async function acceptToken(response: Response, expectedGeneration: number) {
    const value = await body<{access_token:string}>(response)
    if (!value || typeof value.access_token !== 'string' || !value.access_token) throw new ApiError(502)
    if (expectedGeneration !== generation) throw new ApiError(401)
    token = value.access_token
  }

  async function refresh(): Promise<void> {
    if (blocked) throw new ApiError(401)
    if (!refreshing) {
      const expected = generation
      refreshing = (async () => {
        const rotate = async () => {
          if (generation !== expected) throw new ApiError(401)
          await acceptToken(await raw('/auth/refresh', {method:'POST',body:'{}'}), expected)
        }
        // Serialize refresh across tabs when supported; never share a token.
        if (typeof navigator !== 'undefined' && navigator.locks) {
          await navigator.locks.request('alovia-refresh', rotate)
        } else { await rotate() }
      })().catch(error => {
        if (generation === expected) expire()
        throw error
      }).finally(() => { refreshing = null })
    }
    return refreshing
  }

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (blocked) throw new ApiError(401)
    const expected = generation
    const initial = token
    let response = await raw(path, options, initial)
    if (generation !== expected) throw new ApiError(401)
    if (response.status === 401) {
      if (!token || token === initial) await refresh()
      if (generation !== expected) throw new ApiError(401)
      response = await raw(path, options, token)
      if (response.status === 401 && generation === expected) expire()
    }
    const value = await body<T>(response)
    if (generation !== expected) throw new ApiError(401)
    return value
  }

  return {
    request, refresh, clear,
    onExpired(listener: () => void) { onExpired = listener },
    async login(email: string, password: string) {
      if (loggingOut || loggingIn) throw new ApiError(401)
      const previousRefresh = refreshing
      clear()
      blocked = false
      const expected = generation
      loggingIn = (async () => {
        if (previousRefresh) await previousRefresh.catch(() => {})
        if (generation !== expected) throw new ApiError(401)
        await acceptToken(await raw('/auth/login', {method:'POST',body:JSON.stringify({email,password})}), expected)
      })()
      try { await loggingIn }
      finally { loggingIn = null }
    },
    async logout() {
      if (loggingOut) return loggingOut
      // Invalidate immediately. Wait only to revoke the latest cookie if a
      // preceding login/rotation is still completing; it cannot restore memory.
      clear()
      const pending = [refreshing, loggingIn].filter(Boolean)
      loggingOut = (async () => {
        await Promise.allSettled(pending)
        await body(await raw('/auth/logout',{method:'POST',body:'{}'}))
      })()
      try { await loggingOut }
      finally { loggingOut = null }
    },
  }
}
