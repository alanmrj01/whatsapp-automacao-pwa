export type WhatsAppConnectionStatus = 'disconnected' | 'pending' | 'connected' | 'error'
export type WhatsAppConnectionMode = 'coexistence' | 'api_only'
export type WhatsAppConnectionPendingState = 'authorization_pending' | 'meta_review_pending'
export type WhatsAppMetaReviewStatus = 'approved' | 'rejected'
export type WhatsAppConnectionJourneyState = 'not_started' | 'authorization_pending' | 'meta_review_pending' | 'connected' | 'error'
export type WhatsAppConnectionNextAction = 'choose_mode' | 'continue_authorization' | 'wait_for_meta_review' | 'resolve_connection' | 'none'

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
  journey_state?: WhatsAppConnectionJourneyState
  requires_user_action?: boolean
  next_action?: WhatsAppConnectionNextAction
}
