import { createContext } from 'react'
import type { Membership, SessionUser } from './types'

export type AuthState = 'loading' | 'authenticated' | 'anonymous' | 'unavailable' | 'logging_out' | 'logout_failed'
type AuthContextValue = {
  state: AuthState
  user: SessionUser | null
  membership: Membership | undefined
  login: (email: string, password: string) => Promise<void>
  signup: (businessName: string, email: string, password: string, idempotencyKey: string) => Promise<void>
  logout: () => Promise<void>
  selectBusiness: (id: string) => Promise<void>
  bootstrap: () => Promise<void>
  reconnect: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
