import { StatusBadge, type StatusTone } from '../../components/StatusBadge'
import type { WhatsAppConnectionStatus } from '../../lib/mocks'

const statusPresentation: Record<WhatsAppConnectionStatus, { label: string; tone: StatusTone }> = {
  disconnected: { label: 'Não conectado', tone: 'neutral' },
  pending: { label: 'Conectando', tone: 'warning' },
  connected: { label: 'Conectado', tone: 'success' },
  error: { label: 'Atenção necessária', tone: 'danger' },
}

export function ConnectionStatusBadge({ status }: { status: WhatsAppConnectionStatus }) {
  const presentation = statusPresentation[status]
  return <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
}
