import { ArrowRight, CalendarClock, Cable, LockKeyhole, MessageCircleMore, Snowflake, Wrench } from 'lucide-react'
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
      <section className="connection-card connection-card--alovia">
        <div className="connection-card__illustration" aria-hidden="true">
          <MessageCircleMore size={34} />
          <span className="connection-card__indicator" />
        </div>
        <span className="eyebrow">Canal de entrada</span>
        <h1>WhatsApp</h1>
        <ConnectionStatusBadge status={status} />
        {mode && <p>{connectionModeLabels[mode]}</p>}
        <p>
          {status === 'connected' ? 'Seu número está conectado à Alovia.' :
            status === 'pending' ? 'Sua conexão está em preparação. Aguarde a configuração oficial.' :
            'Conecte seu número para transformar pedidos de atendimento em uma operação organizada dentro da Alovia.'}
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

      <section className="alovia-flow" aria-labelledby="alovia-flow-title">
        <div className="alovia-flow__heading">
          <span className="alovia-flow__mark"><Snowflake size={18}/></span>
          <div><span className="eyebrow">O diferencial da Alovia</span><h2 id="alovia-flow-title">Do pedido à visita técnica</h2></div>
        </div>
        <div className="alovia-flow__steps">
          <div><span><MessageCircleMore size={18}/></span><strong>1. Entende a demanda</strong><p>Organiza o contato por tipo de serviço e necessidade do cliente.</p></div>
          <div><span><Wrench size={18}/></span><strong>2. Estrutura o atendimento</strong><p>Relaciona serviço, equipamento, endereço e informações úteis para a equipe.</p></div>
          <div><span><CalendarClock size={18}/></span><strong>3. Leva para a agenda</strong><p>Direciona o próximo passo para a operação técnica, não apenas para uma conversa.</p></div>
        </div>
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
