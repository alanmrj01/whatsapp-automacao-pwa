import { StatusBadge, type StatusTone } from '../../components/StatusBadge'
import type { WhatsAppConnectionStatus } from './types'

const statusPresentation: Record<WhatsAppConnectionStatus, { label: string; tone: StatusTone }> = {
  disconnected: { label: 'Não conectado', tone: 'neutral' },
  pending: { label: 'Conectando', tone: 'warning' },
  connected: { label: 'Conectado', tone: 'success' },
  error: { label: 'Atenção necessária', tone: 'danger' },
}

export function ConnectionStatusBadge({
  status,
  errorReason,
}: {
  status: WhatsAppConnectionStatus
  errorReason?: 'authorization_incomplete'
}) {
  const presentation = status === 'error' && errorReason === 'authorization_incomplete'
    ? {label:'Autorização incompleta', tone:'danger' as StatusTone}
    : statusPresentation[status]
  return <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
}
