import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { entitlementsFor } from '../access/entitlements'
import { useAuth } from '../auth/useAuth'
import type { WhatsAppConnection } from './types'

export function useConnection() {
  const {user,membership} = useAuth()
  const canRead = entitlementsFor(membership).canReadOperationalData
  return useQuery({
    queryKey:['whatsapp-connection',user?.id,membership?.business_id],
    queryFn:({signal})=>api.request<WhatsAppConnection>('/whatsapp/connection',{signal}),
    enabled:!!membership && canRead,
    retry:false,
    staleTime:60_000,
    gcTime:5*60_000,
    refetchOnWindowFocus:false,
  })
}
