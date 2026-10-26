import { useMutation, useQuery } from '@tanstack/react-query'
import { queryClient } from '../../app/queryClient'
import { api } from '../../lib/api'
import { entitlementsFor } from '../access/entitlements'
import { useAuth } from '../auth/useAuth'
import type { WhatsAppConnection, WhatsAppConnectionMode } from './types'

export function useConnection() {
  const {user,membership} = useAuth()
  const entitlement = entitlementsFor(membership)
  const canRead = entitlement.canReadOperationalData || entitlement.isPreactivation
  return useQuery({
    queryKey:['whatsapp-connection',user?.id,membership?.business_id],
    queryFn:({signal})=>api.request<WhatsAppConnection>('/whatsapp/connection',{signal}),
    enabled:!!membership && canRead,
    retry:false,
    staleTime:10_000,
    gcTime:5*60_000,
    // Returning from Meta must consult the server even when the cached
    // pending state is still fresh. Pending onboarding is short-lived and
    // deserves tighter reconciliation than normal operational reads.
    refetchOnMount:'always',
    refetchOnWindowFocus:'always',
    refetchOnReconnect:'always',
    refetchInterval: query => (
      query.state.data?.status === 'pending' ? 3_000 : false
    ),
    refetchIntervalInBackground:true,
  })
}


export function useDisconnectWhatsApp() {
  const {user,membership} = useAuth()
  return useMutation({
    mutationFn:()=>api.request<WhatsAppConnection>('/whatsapp/disconnect',{method:'POST',body:'{}'}),
    onSuccess:async()=> {
      await queryClient.invalidateQueries({queryKey:['whatsapp-connection',user?.id,membership?.business_id]})
      await queryClient.invalidateQueries({queryKey:['operations',membership?.business_id,'setup']})
    },
  })
}


export function useSetWhatsAppModePreference() {
  const {user,membership} = useAuth()
  return useMutation({
    mutationFn:(preferredMode:WhatsAppConnectionMode|null)=>api.request<WhatsAppConnection>(
      '/whatsapp/mode-preference',
      {
        method:'POST',
        body:JSON.stringify({preferred_mode:preferredMode}),
      },
    ),
    onSuccess:async(connection)=> {
      queryClient.setQueryData(
        ['whatsapp-connection',user?.id,membership?.business_id],
        connection,
      )
      await queryClient.invalidateQueries({
        queryKey:['whatsapp-connection',user?.id,membership?.business_id],
      })
    },
  })
}
