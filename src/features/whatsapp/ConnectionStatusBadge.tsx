import { StatusBadge, type StatusTone } from '../../components/StatusBadge'
import type { WhatsAppConnectionPendingState, WhatsAppConnectionStatus } from './types'

const statusPresentation: Record<WhatsAppConnectionStatus, { label: string; tone: StatusTone }> = {
  disconnected: { label: 'Não conectado', tone: 'neutral' },
  pending: { label: 'Conectando', tone: 'warning' },
  connected: { label: 'Conectado', tone: 'success' },
  error: { label: 'Atenção necessária', tone: 'danger' },
}

export function ConnectionStatusBadge({
  status,
  pendingState,
}: {
  status: WhatsAppConnectionStatus
  pendingState?: WhatsAppConnectionPendingState
}) {
  const presentation = status==='pending'&&pendingState==='meta_review_pending'
    ? {label:'Aguardando Meta',tone:'warning' as StatusTone}
    : statusPresentation[status]
  return <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
}
