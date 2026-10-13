import { StatusBadge, type StatusTone } from '../../components/StatusBadge'
import type {
  WhatsAppConnectionErrorReason,
  WhatsAppConnectionStatus,
} from './types'

const statusPresentation: Record<WhatsAppConnectionStatus, { label: string; tone: StatusTone }> = {
  disconnected: { label: 'Não conectado', tone: 'neutral' },
  pending: { label: 'Conectando', tone: 'warning' },
  connected: { label: 'Conectado', tone: 'success' },
  error: { label: 'Atenção necessária', tone: 'danger' },
}

const errorPresentation: Record<WhatsAppConnectionErrorReason, string> = {
  authorization_incomplete: 'Autorização incompleta',
  onboarding_expired: 'Tentativa expirada',
  provider_rejected: 'Autorização recusada',
  provider_unavailable: 'Meta indisponível',
  onboarding_failed: 'Conexão não concluída',
}

export function ConnectionStatusBadge({
  status,
  errorReason,
}: {
  status: WhatsAppConnectionStatus
  errorReason?: WhatsAppConnectionErrorReason
}) {
  const presentation = status === 'error' && errorReason
    ? {label:errorPresentation[errorReason], tone:'danger' as StatusTone}
    : statusPresentation[status]
  return <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
}
