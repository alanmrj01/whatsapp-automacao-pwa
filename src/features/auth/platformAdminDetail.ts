import { api } from '../../lib/api'
import type { PlatformBusiness } from './platformAdmin'

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

export async function getPlatformBusiness(id: string) {
  return api.request<PlatformBusinessDetail>(`/admin/businesses/${id}`)
}
