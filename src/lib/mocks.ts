export type WhatsAppConnectionStatus =
  | 'disconnected'
  | 'pending'
  | 'connected'
  | 'error'

export type WhatsAppConnectionMode = 'coexistence' | 'api_only'

export const mockBusiness = {
  name: 'Studio Aurora',
  initials: 'SA',
}

export const mockDashboard = {
  automationLabel: 'Aguardando conexão',
  appointmentsToday: 0,
  conversationsToday: 0,
}

export const mockWhatsAppConnection: {
  status: WhatsAppConnectionStatus
  mode: WhatsAppConnectionMode | null
} = {
  status: 'disconnected',
  mode: null,
}

export const connectionStateExamples: WhatsAppConnectionStatus[] = [
  'disconnected',
  'pending',
  'connected',
  'error',
]
