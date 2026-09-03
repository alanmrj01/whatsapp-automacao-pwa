import { ArrowRight, Cable, LockKeyhole, MessageCircleMore } from 'lucide-react'
import { useState } from 'react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { LoadingState } from '../../components/LoadingState'
import { ErrorState } from '../../components/ErrorState'
import { useAuth } from '../auth/useAuth'
import { canConfigureWhatsApp } from '../auth/types'
import { useConnection } from './useConnection'
import { connectionModeLabels } from './connectionPresentation'
import { ConnectWhatsAppSheet } from './ConnectWhatsAppSheet'
import { ConnectionStatusBadge } from './ConnectionStatusBadge'

export function WhatsAppPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const {membership} = useAuth()
  const connection = useConnection()
  if (connection.isPending) return <LoadingState />
  if (connection.isError) return <ErrorState onRetry={()=>void connection.refetch()} />
  const {status,mode} = connection.data
  const canConnect = canConfigureWhatsApp(membership?.role) && (status === 'disconnected' || status === 'error')

  return (
    <div className="page-stack whatsapp-page">
      <section className="connection-card">
        <div className="connection-card__illustration" aria-hidden="true">
          <MessageCircleMore size={34} />
          <span className="connection-card__indicator" />
        </div>
        <span className="eyebrow">Canal de atendimento</span>
        <h1>WhatsApp</h1>
        <ConnectionStatusBadge status={status} />
        {mode && <p>{connectionModeLabels[mode]}</p>}
        <p>
          {status === 'connected' ? 'Seu canal está conectado à plataforma.' :
            status === 'pending' ? 'Sua conexão está em preparação. Aguarde a configuração oficial.' :
            'Conecte seu número para ativar automação de atendimento e agendamentos.'}
        </p>
        {canConnect && <PrimaryButton
          fullWidth
          icon={<ArrowRight size={19} />}
          onClick={() => setIsSheetOpen(true)}
        >
          Conectar WhatsApp
        </PrimaryButton>}
        {!canConfigureWhatsApp(membership?.role) && <p>Acesso de leitura. A configuração é gerenciada pelo administrador.</p>}
      </section>

      <section className="security-note">
        <span><LockKeyhole size={19} /></span>
        <div>
          <strong>Conexão segura</strong>
          <p>A conexão oficial será disponibilizada após a configuração do serviço.</p>
        </div>
      </section>

      <section className="feature-note">
        <Cable size={20} />
        <p>Esta etapa não realiza conexões nem envia dados à Meta.</p>
      </section>

      {canConnect && <ConnectWhatsAppSheet open={isSheetOpen} onClose={() => setIsSheetOpen(false)} />}
    </div>
  )
}
