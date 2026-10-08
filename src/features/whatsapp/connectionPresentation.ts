import type { WhatsAppConnectionMode } from './types'

export const connectionModeLabels: Record<WhatsAppConnectionMode, string> = {
  coexistence: 'Alovia + WhatsApp Business',
  api_only: 'Somente pela Alovia',
}
