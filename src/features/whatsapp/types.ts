export type WhatsAppConnectionStatus = 'disconnected' | 'pending' | 'connected' | 'error'
export type WhatsAppConnectionMode = 'coexistence' | 'api_only'
export type WhatsAppConnectionPendingState =
  | 'authorization_pending'
  | 'review_approved'
  | 'review_rejected'

export type WhatsAppConnection = {
  status: WhatsAppConnectionStatus
  mode: WhatsAppConnectionMode | null
  display_phone_number?: string
  pending_state?: WhatsAppConnectionPendingState
}
