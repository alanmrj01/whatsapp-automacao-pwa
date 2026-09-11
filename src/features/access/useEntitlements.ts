import { useAuth } from '../auth/useAuth'
import { entitlementsFor } from './entitlements'

export function useEntitlements() {
  const { membership } = useAuth()
  return {...entitlementsFor(membership), membership}
}
