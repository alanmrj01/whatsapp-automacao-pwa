import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

export type MessageUsage = {
  plan:'basic'|'plus'|null
  period_start:string
  resets_at:string
  used:number
  limit:number|null
  remaining:number|null
  exhausted:boolean
  quota_applies:boolean
  upgrade_plan:'basic'|'plus'|null
}

export function useMessageUsage(enabled=true) {
  return useQuery({
    queryKey:['billing','message-usage'],
    queryFn:()=>api.request<MessageUsage>('/billing/usage'),
    enabled,
    refetchInterval:60_000,
  })
}
