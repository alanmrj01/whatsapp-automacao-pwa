import { Navigate, Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'
import { LoadingState } from '../../components/LoadingState'
import { useAuth } from './useAuth'
import { canConfigureWhatsApp, homeFor } from './types'
import { BusinessSelector } from './BusinessSelector'
import { SessionActions } from './SessionActions'
import { LogoutRecovery } from './LogoutRecovery'
import { SessionRecovery } from './SessionRecovery'

export function ProtectedRoute({platform = false}: {platform?:boolean}) {
  const auth = useAuth()
  if (auth.state === 'logout_failed') return <LogoutRecovery />
  if (auth.state === 'loading' || auth.state === 'logging_out') return <div className="auth-boundary"><LoadingState /></div>
  if (auth.state === 'unavailable') return <SessionRecovery />
  if (!auth.user) return <Navigate to="/login" replace />
  if (platform !== (auth.user.platform_role === 'super_admin')) return <Navigate to={homeFor(auth.user)} replace />
  if (!platform && !auth.membership) return <div className="auth-boundary page-stack"><BusinessSelector /><SessionActions /></div>
  return <Outlet />
}

export function RoleGuard({children}: {children:ReactNode}) {
  const {membership} = useAuth()
  return canConfigureWhatsApp(membership?.role) ? children : <Navigate to="/app/whatsapp" replace />
}
