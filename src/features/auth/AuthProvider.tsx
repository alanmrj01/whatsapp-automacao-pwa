import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { queryClient } from '../../app/queryClient'
import { api } from '../../lib/api'
import { ApiError } from '../../lib/httpClient'
import type { SessionUser } from './types'
import { AuthContext, type AuthState } from './context'
import { clearPendingLogout, hasPendingLogout, markPendingLogout } from './logoutIntent'

const BOOTSTRAP_RETRY_DELAYS_MS = [750, 1500]
const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds))

export function AuthProvider({children}: {children:ReactNode}) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [state, setState] = useState<AuthState>(() => hasPendingLogout() ? 'logout_failed' : 'loading')
  const operation = useRef(0)
  const logoutBlocked = useRef(hasPendingLogout())
  const bootstrapping = useRef<Promise<void> | null>(null)
  const dropPrivateState = useCallback(() => {
    void queryClient.cancelQueries()
    queryClient.clear()
    setUser(null)
  }, [])

  const bootstrap = useCallback(async () => {
    if (logoutBlocked.current) return
    if (bootstrapping.current) return bootstrapping.current
    const expected = operation.current
    setState('loading')
    bootstrapping.current = (async () => {
      for (let attempt = 0; attempt <= BOOTSTRAP_RETRY_DELAYS_MS.length; attempt++) {
        try {
          await api.refresh()
          if (operation.current !== expected) return
          const me = await api.request<SessionUser>('/me')
          if (operation.current !== expected) return
          setUser(me)
          setState('authenticated')
          return
        } catch(error) {
          if (operation.current !== expected) return
          if (error instanceof ApiError && error.status === 401) {
            dropPrivateState()
            setState('anonymous')
            return
          }
          if (attempt < BOOTSTRAP_RETRY_DELAYS_MS.length) {
            await wait(BOOTSTRAP_RETRY_DELAYS_MS[attempt])
            if (operation.current !== expected || logoutBlocked.current) return
            continue
          }
          // A transient network/server failure does not invalidate the refresh
          // cookie. Keep the session recoverable and let the user retry.
          setState('unavailable')
        }
      }
    })()
    try { await bootstrapping.current }
    finally { bootstrapping.current = null }
  }, [dropPrivateState])

  useEffect(() => {
    let active = true
    if (logoutBlocked.current) api.clear()
    api.onExpired(() => {
      operation.current++
      dropPrivateState()
      if (!logoutBlocked.current) setState('anonymous')
    })
    // StrictMode may subscribe/unsubscribe in the same tick. Start one bootstrap
    // only for the surviving subscription, never for an abandoned mount.
    void Promise.resolve().then(() => { if (active) return bootstrap() })
    return () => { active = false; api.onExpired(() => {}) }
  }, [bootstrap, dropPrivateState])

  async function login(email:string,password:string) {
    if (hasPendingLogout()) throw new ApiError(401)
    const expected = ++operation.current
    logoutBlocked.current = false
    dropPrivateState()
    await api.login(email,password)
    if (operation.current !== expected) return
    const me = await api.request<SessionUser>('/me')
    if (operation.current !== expected) return
    setUser(me)
    setState('authenticated')
  }

  async function signup(businessName:string,email:string,password:string,idempotencyKey:string) {
    if (hasPendingLogout()) throw new ApiError(401)
    const expected = ++operation.current
    logoutBlocked.current = false
    dropPrivateState()
    try {
      await api.signup(businessName,email,password,idempotencyKey)
      if (operation.current !== expected) return
      const me = await api.request<SessionUser>('/me')
      if (operation.current !== expected) return
      setUser(me)
      setState('authenticated')
    } catch(error) {
      if (operation.current === expected) setState('anonymous')
      throw error
    }
  }

  async function logout() {
    operation.current++
    logoutBlocked.current = true
    markPendingLogout()
    dropPrivateState()
    setState('logging_out')
    try {
      await api.logout()
      clearPendingLogout()
      setState('anonymous')
    } catch(error) {
      setState('logout_failed')
      throw error
    }
  }

  async function selectBusiness(id:string) {
    if (!user?.memberships.some(m => m.business_id === id)) throw new ApiError(403)
    const expected = ++operation.current
    // Stop tenant queries while the server switches context. A lost response may
    // still have committed; do not resume the old tenant UI until /me is checked.
    setState('loading')
    try {
      await queryClient.cancelQueries()
      if (operation.current !== expected) return
      const me = await api.request<SessionUser>('/auth/active-business', {method:'POST', body:JSON.stringify({business_id:id})})
      if (operation.current !== expected) return
      queryClient.clear()
      setUser(me)
      setState('authenticated')
    } catch(error) {
      if (operation.current === expected) {
        if (error instanceof ApiError && error.status === 401) dropPrivateState()
        setState(error instanceof ApiError && error.status === 401 ? 'anonymous' : 'unavailable')
      }
      throw error
    }
  }

  return <AuthContext.Provider value={{state,user,
    membership:user?.memberships.find(m=>m.business_id===user.active_business_id),
    login,signup,logout,selectBusiness,bootstrap,reconnect:bootstrap}}>{children}</AuthContext.Provider>
}
