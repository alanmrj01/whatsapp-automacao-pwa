import { api } from '../../lib/api'

export type PlatformBusiness = {
  id: string
  name: string
  timezone: string
  active: boolean
  access_mode: 'free' | 'paid'
  admin_full_access: boolean
  commercial_access_active: boolean
  commercial_plan_code: 'basic' | 'plus' | null
  commercial_billing_cycle: 'monthly' | 'quarterly' | 'annual' | null
  commercial_subscription_status: 'active' | 'past_due' | 'canceled' | 'suspended' | null
  commercial_access_until: string | null
  commercial_cancellation_requested_at: string | null
  commercial_refund_status: 'none' | 'requested' | 'reconcile_required' | 'refunded' | null
  commercial_refund_requested_at: string | null
  commercial_refunded_at: string | null
  commercial_provider_payment_id: string | null
  commercial_provider_subscription_id: string | null
  commercial_contact_name: string | null
  commercial_contact_email: string | null
  commercial_contact_phone: string | null
  commercial_refund_deadline_at: string | null
  owners: string[]
  whatsapp_status: 'disconnected' | 'pending' | 'connected' | 'error'
}

type PlatformBusinessList = { businesses: PlatformBusiness[] }

export type CreatePlatformBusiness = {
  name: string
  timezone: string
  owner_email: string
  owner_password: string
}

export async function listPlatformBusinesses() {
  return (await api.request<PlatformBusinessList>('/admin/businesses')).businesses
}

export async function createPlatformBusiness(payload: CreatePlatformBusiness, idempotencyKey: string) {
  return api.request<PlatformBusiness>('/admin/businesses', {
    method: 'POST',
    headers: {'Idempotency-Key': idempotencyKey},
    body: JSON.stringify(payload),
  })
}

export async function setPlatformBusinessActive(id: string, active: boolean) {
  return api.request<{id:string;active:boolean}>(`/admin/businesses/${id}/active`, {
    method: 'PATCH',
    body: JSON.stringify({active}),
  })
}

export async function setPlatformBusinessAccess(id: string, access_mode: 'free' | 'paid') {
  return api.request<{business_id:string;access_mode:'free'|'paid'}>(`/admin/businesses/${id}/access`, {
    method: 'PATCH',
    body: JSON.stringify({access_mode}),
  })
}
