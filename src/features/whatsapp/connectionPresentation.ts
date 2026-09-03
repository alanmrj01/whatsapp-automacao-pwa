import type { WhatsAppConnectionMode } from './types'

export const connectionModeLabels: Record<WhatsAppConnectionMode, string> = {
  coexistence: 'WhatsApp Business + Automação',
  api_only: 'Atendimento pela plataforma',
}
