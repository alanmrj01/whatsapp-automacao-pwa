import { api } from '../../lib/api'

export type PlatformBusiness = {
  id: string
  name: string
  timezone: string
  active: boolean
  created_at: string | null
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
  commercial_payment_method: 'credit_card' | 'pix' | 'pix_automatic' | null
  commercial_amount_cents: number | null
  commercial_paid_at: string | null
  contact_whatsapp: string | null
  owners: string[]
  whatsapp_status: 'disconnected' | 'pending' | 'connected' | 'error'
}

export type PlatformBusinessDetail = PlatformBusiness & {
  responsible_name: string | null
  lead_name: string | null
  lead_source: string | null
  lead_created_at: string | null
  whatsapp_mode: 'coexistence' | 'api_only' | null
  whatsapp_display_phone: string | null
  whatsapp_connected_at: string | null
  whatsapp_disconnected_at: string | null
  whatsapp_last_error_code: string | null
  whatsapp_meta_review_status: 'approved' | 'rejected' | null
  commercial_checkout_status: 'creating' | 'active' | 'paid' | 'canceled' | 'expired' | 'failed' | null
  commercial_provider_customer_id: string | null
  commercial_checkout_created_at: string | null
  commercial_subscription_created_at: string | null
  acquisition_source: string | null
  acquisition_medium: string | null
  acquisition_campaign: string | null
  acquisition_content: string | null
  acquisition_term: string | null
  acquisition_campaign_id: string | null
  acquisition_adset_id: string | null
  acquisition_ad_id: string | null
  acquisition_placement: string | null
  acquisition_angle: string | null
  acquisition_quiz_profile: string | null
  signup_completed_at: string | null
  demo_started_at: string | null
  checkout_started_at: string | null
  payment_confirmed_at: string | null
  whatsapp_connected_event_at: string | null
  last_activity_at: string | null
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

export async function getPlatformBusiness(id: string) {
  return api.request<PlatformBusinessDetail>(`/admin/businesses/${id}`)
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
