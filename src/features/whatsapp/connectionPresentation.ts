import type { WhatsAppConnectionMode } from './types'

export const connectionModeLabels: Record<WhatsAppConnectionMode, string> = {
  coexistence: 'WhatsApp Business + Alovia',
  api_only: 'Somente na Alovia',
}
