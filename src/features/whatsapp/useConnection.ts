import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAuth } from '../auth/useAuth'
import type { WhatsAppConnection } from './types'

export function useConnection() {
  const {user,membership} = useAuth()
  const paid = membership?.access_mode === 'paid'
  return useQuery({
    queryKey:['whatsapp-connection',user?.id,membership?.business_id],
    queryFn:({signal})=>api.request<WhatsAppConnection>('/whatsapp/connection',{signal}),
    enabled:!!membership && paid, retry:false, staleTime:0, gcTime:0,
    refetchOnWindowFocus:true,
  })
}
