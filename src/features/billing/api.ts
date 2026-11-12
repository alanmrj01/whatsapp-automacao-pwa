import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useAuth } from '../auth/useAuth'
import { useEntitlements } from '../access/useEntitlements'

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

export type SubscriptionStatus = {
  status:'none'|'active'|'past_due'|'canceled'|'suspended'
  payment_method:'credit_card'|'pix'|'pix_automatic'|null
  plan:'basic'|'plus'|null
  cycle:'monthly'|'quarterly'|'annual'|null
  access_until:string|null
  canceled_at:string|null
  cancellation_requested_at:string|null
  guarantee_until:string|null
  guarantee_eligible:boolean
  refund_status:'none'|'requested'|'reconcile_required'|'refunded'
  refund_provider_status:'awaiting_authorization'|'pending'|'done'|'cancelled'|'partial'|'unknown'|null
  refund_deadline_at:string|null
}

export function useMessageUsage() {
  const {membership}=useAuth()
  const entitlement=useEntitlements()
  return useQuery({
    queryKey:['billing',membership?.business_id,'usage'],
    queryFn:({signal})=>api.request<MessageUsage>('/billing/usage',{signal}),
    enabled:entitlement.isPaid&&!!membership?.business_id,
    retry:false,
    refetchInterval:10_000,
    refetchIntervalInBackground:false,
  })
}

export function useSubscriptionStatus() {
  const {membership}=useAuth()
  const entitlement=useEntitlements()
  const canManage=membership?.role==='owner'||membership?.role==='admin'
  return useQuery({
    queryKey:['billing',membership?.business_id,'subscription'],
    queryFn:({signal})=>api.request<SubscriptionStatus>('/billing/subscription',{signal}),
    enabled:entitlement.isPaid&&canManage&&!!membership?.business_id,
    retry:false,
    staleTime:30_000,
  })
}

export function formatPlanRenewalDate(value:string|null|undefined) {
  if(!value)return null
  return new Intl.DateTimeFormat('pt-BR',{
    day:'2-digit',
    month:'2-digit',
    year:'numeric',
    timeZone:'America/Sao_Paulo',
  }).format(new Date(value))
}
