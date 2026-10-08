export type WhatsAppConnectionStatus = 'disconnected' | 'pending' | 'connected' | 'error'
export type WhatsAppConnectionMode = 'coexistence' | 'api_only'
export type WhatsAppConnectionPendingState = 'authorization_pending'
export type WhatsAppMetaReviewStatus = 'approved' | 'rejected'

export type WhatsAppConnection = {
  status: WhatsAppConnectionStatus
  mode: WhatsAppConnectionMode | null
  display_phone_number?: string
  pending_state?: WhatsAppConnectionPendingState
  review_status?: WhatsAppMetaReviewStatus
  preferred_mode?: WhatsAppConnectionMode
  mode_switch_requested_at?: string
  mode_switch_last_checked_at?: string
  mode_switch_next_check_at?: string
}
