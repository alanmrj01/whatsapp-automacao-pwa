import { ArrowRight, CalendarClock, LockKeyhole, MessageCircleMore, Snowflake, Wrench } from 'lucide-react'
import { useState } from 'react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { LoadingState } from '../../components/LoadingState'
import { ErrorState } from '../../components/ErrorState'
import { StatusBadge } from '../../components/StatusBadge'
import { useEntitlements } from '../access/useEntitlements'
import { useUpgradePrompt } from '../access/upgradePromptContext'
import { useAuth } from '../auth/useAuth'
import { canConfigureWhatsApp } from '../auth/types'
import { useConnection } from './useConnection'
import { connectionModeLabels } from './connectionPresentation'
import { ConnectWhatsAppSheet } from './ConnectWhatsAppSheet'
import { ConnectionStatusBadge } from './ConnectionStatusBadge'

export function WhatsAppPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const {membership} = useAuth()
  const entitlement = useEntitlements()
  const {openUpgrade} = useUpgradePrompt()
  const free = entitlement.isFree
  const connection = useConnection()

  if (free) {
    return (
      <div className="page-stack whatsapp-page">
        <section className="connection-card connection-card--alovia">
          <div className="connection-card__illustration" aria-hidden="true">
            <MessageCircleMore size={34} />
            <span className="connection-card__indicator" />
          </div>
          <span className="eyebrow">Canal principal de atendimento</span>
          <h1>WhatsApp</h1>
          <StatusBadge tone="info">Modo demonstração</StatusBadge>
          <p>Veja como o ALOVIA organiza pedidos, conversas e agendamentos. A conexão oficial com o WhatsApp Business está disponível no plano pago.</p>
          <PrimaryButton fullWidth icon={<ArrowRight size={19}/>} onClick={()=>openUpgrade('Conectar o WhatsApp')}>
            Conectar WhatsApp
          </PrimaryButton>
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
      </div>
    )
  }

  if (connection.isPending) return <div className="page-stack whatsapp-page"><section className="operational-heading"><div><span className="eyebrow">Canal principal</span><h1>WhatsApp</h1></div></section><LoadingState /></div>
  if (connection.isError) return <div className="page-stack whatsapp-page"><section className="operational-heading"><div><span className="eyebrow">Canal principal</span><h1>WhatsApp</h1></div></section><ErrorState onRetry={()=>void connection.refetch()} /></div>
  const {status,mode} = connection.data
  const canConnect = canConfigureWhatsApp(membership?.role) && (status === 'disconnected' || status === 'error')

  return (
    <div className="page-stack whatsapp-page">
      <section className="connection-card connection-card--alovia">
        <div className="connection-card__illustration" aria-hidden="true">
          <MessageCircleMore size={34} />
          <span className="connection-card__indicator" />
        </div>
        <span className="eyebrow">Canal principal de atendimento</span>
        <h1>WhatsApp</h1>
        <ConnectionStatusBadge status={status} />
        <p>
          {status === 'connected' ? 'O WhatsApp da empresa está conectado e pronto para organizar os atendimentos no ALOVIA.' :
            status === 'pending' ? 'Estamos concluindo a autorização. Você pode sair desta tela e acompanhar o status depois.' :
            status === 'error' ? 'Não foi possível manter a conexão. Revise a autorização e tente novamente quando estiver pronto.' :
            'Conecte o WhatsApp Business oficial para receber pedidos, organizar conversas e gerar agendamentos.'}
        </p>
        {status==='connected'&&<dl className="connection-facts">
          {connection.data.display_phone_number&&<div><dt>Número conectado</dt><dd>{connection.data.display_phone_number}</dd></div>}
          {mode&&<div><dt>Forma de operação</dt><dd>{connectionModeLabels[mode]}</dd></div>}
          <div><dt>Situação</dt><dd>Conexão ativa</dd></div>
        </dl>}
        {canConnect && <PrimaryButton
          fullWidth
          icon={<ArrowRight size={19} />}
          onClick={() => setIsSheetOpen(true)}
        >
          {status==='error'?'Tentar conectar novamente':'Conectar WhatsApp'}
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
          <strong>Conexão oficial e segura</strong>
          <p>A autorização acontece com a Meta. Sua senha do WhatsApp não é solicitada pelo ALOVIA.</p>
        </div>
      </section>

      {canConnect && <ConnectWhatsAppSheet open={isSheetOpen} onClose={() => setIsSheetOpen(false)} />}
    </div>
  )
}
