import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { queryClient } from '../../app/queryClient'
import { api } from '../../lib/api'
import { ApiError } from '../../lib/httpClient'
import type { SessionUser } from './types'
import { AuthContext, type AuthState } from './context'
import { clearPendingLogout, hasPendingLogout, markPendingLogout } from './logoutIntent'

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
    bootstrapping.current = (async () => {
      try {
        await api.refresh()
        if (operation.current !== expected) return
        const me = await api.request<SessionUser>('/me')
        if (operation.current !== expected) return
        setUser(me)
        setState('authenticated')
      } catch(error) {
        if (operation.current !== expected) return
        api.clear()
        dropPrivateState()
        setState(error instanceof ApiError && error.status === 401 ? 'anonymous' : 'unavailable')
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
        dropPrivateState()
        setState('unavailable')
      }
      throw error
    }
  }

  return <AuthContext.Provider value={{state,user,
    membership:user?.memberships.find(m=>m.business_id===user.active_business_id),
    login,logout,selectBusiness,bootstrap}}>{children}</AuthContext.Provider>
}
