import { ArrowRight, CalendarClock, LockKeyhole, MessageCircleMore, Snowflake, Unplug, Wrench } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PrimaryButton } from '../../components/PrimaryButton'
import { LoadingState } from '../../components/LoadingState'
import { ErrorState } from '../../components/ErrorState'
import { StatusBadge } from '../../components/StatusBadge'
import { useEntitlements } from '../access/useEntitlements'
import { useUpgradePrompt } from '../access/upgradePromptContext'
import { useAuth } from '../auth/useAuth'
import { canConfigureWhatsApp } from '../auth/types'
import { useConnection, useDisconnectWhatsApp, useSetWhatsAppModePreference } from './useConnection'
import { connectionModeLabels } from './connectionPresentation'
import { loadWhatsAppBusinessPreparation } from './businessPreparation'
import { ConnectWhatsAppSheet } from './ConnectWhatsAppSheet'
import { ConnectionStatusBadge } from './ConnectionStatusBadge'

export function WhatsAppPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [confirmDisconnect,setConfirmDisconnect]=useState(false)
  const navigate=useNavigate()
  const [searchParams]=useSearchParams()
  const smartContinuationHandled=useRef(false)
  const {membership} = useAuth()
  const entitlement = useEntitlements()
  const {openUpgrade} = useUpgradePrompt()
  const demo = entitlement.usesDemoData
  const readOnly = entitlement.isReadOnlyRetained
  const connection = useConnection()
  const disconnect = useDisconnectWhatsApp()
  const modePreference = useSetWhatsAppModePreference()


  const continueConnection = useCallback((status:string, mode:string|null) => {
    if ((status === 'pending' || status === 'error') && mode === 'coexistence') {
      navigate('/app/whatsapp/business?auto=1')
      return
    }
    if ((status === 'pending' || status === 'error') && mode === 'api_only') {
      navigate('/app/whatsapp/exclusivo')
      return
    }
    if (
      status === 'disconnected'
      && loadWhatsAppBusinessPreparation(membership?.business_id)
    ) {
      navigate('/app/whatsapp/business?preparar=1')
      return
    }
    setIsSheetOpen(true)
  },[membership?.business_id,navigate])

  const status=connection.data?.status??'disconnected'
  const mode=connection.data?.mode??null
  const reviewStatus=connection.data?.review_status
  const preferredMode=connection.data?.preferred_mode??null
  const awaitingCoexistence=status==='connected'
    && mode==='api_only'
    && preferredMode==='coexistence'
  // A business review approval is not proof that a number supports coexistence.
  const coexistenceReviewReady=false
  const canConfigure = canConfigureWhatsApp(membership?.role)
  const canConnect = entitlement.isPaid && canConfigure && !!connection.data && (
    status === 'disconnected' || status === 'error' || status === 'pending'
  )
  const canDisconnect = entitlement.isPaid && canConfigure && status==='connected'
  const savedBusinessPreparation=status==='disconnected'
    ? loadWhatsAppBusinessPreparation(membership?.business_id)
    : null

  useEffect(()=>{
    if(connection.isPending||connection.isError||!connection.data)return
    if(smartContinuationHandled.current||searchParams.get('continuar')!=='1'||!canConnect)return
    smartContinuationHandled.current=true
    continueConnection(status,mode)
  },[canConnect,connection.data,connection.isError,connection.isPending,continueConnection,mode,searchParams,status])

  if (demo) {
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
          <p>Veja como o ALOVIA organiza pedidos, conversas e agendamentos. A conexão oficial está disponível com assinatura.</p>
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
  if (!connection.data) return null

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
          {status === 'connected' ? 'O número da empresa está conectado e pronto para organizar os atendimentos no ALOVIA.' :
            status === 'pending'
              ? 'A conexão foi iniciada, mas a Meta ainda não entregou a confirmação final. Você pode sair desta tela e retomar a autorização depois.' :
            status === 'error' ? 'Não foi possível manter a conexão. Revise a autorização e tente novamente quando estiver pronto.' :
            'Conecte o número que será usado pelo ALOVIA para receber pedidos, organizar conversas e gerar agendamentos.'}
        </p>
        {status==='connected'&&<dl className="connection-facts">
          {connection.data.display_phone_number&&<div><dt>Número conectado</dt><dd>{connection.data.display_phone_number}</dd></div>}
          {mode&&<div><dt>Forma de operação</dt><dd>{connectionModeLabels[mode]}</dd></div>}
          <div><dt>Situação</dt><dd>Conexão ativa</dd></div>
        </dl>}
        {awaitingCoexistence&&<div className="account-note">
          <strong>{coexistenceReviewReady
            ? 'Verifique a disponibilidade do uso conjunto'
            : reviewStatus==='rejected'
              ? 'Sua preferência está salva'
              : 'Você já pode usar a Alovia enquanto aguarda'}</strong>
          <span>{coexistenceReviewReady
            ? 'A Meta concluiu uma revisão da conta. Sua conexão atual continua ativa até você confirmar a tentativa de uso conjunto com o WhatsApp Business.'
            : reviewStatus==='rejected'
              ? 'A revisão mais recente da Meta não foi aprovada. Isso não desliga seu atendimento atual pela Alovia; a preferência por usar também o WhatsApp Business continua registrada.'
              : 'Seu número continua funcionando exclusivamente pela Alovia. Guardamos sua preferência por usar também o WhatsApp Business. A disponibilidade depende da Meta e não há prazo garantido; nenhuma mudança será feita sem sua confirmação.'}</span>
          {coexistenceReviewReady&&<PrimaryButton
            fullWidth
            icon={<ArrowRight size={19}/>}
            onClick={()=>navigate('/app/whatsapp/business?troca=1')}
          >
            Tentar ativar WhatsApp Business + Alovia
          </PrimaryButton>}
          <button
            className="compact-button"
            type="button"
            disabled={modePreference.isPending}
            onClick={()=>modePreference.mutate(null)}
          >
            {modePreference.isPending?'Atualizando…':'Não quero mais mudar agora'}
          </button>
          {modePreference.isError&&<p className="form-error" role="alert">Não foi possível atualizar sua preferência. Tente novamente.</p>}
        </div>}
        {!awaitingCoexistence&&reviewStatus==='rejected'&&<div className="account-note">
          <strong>Revisão da Meta não aprovada</strong>
          <span>Essa revisão é separada da conexão técnica. Se o WhatsApp aparece como conectado, ele continua ativo; não é necessário reconectar apenas por causa deste aviso.</span>
        </div>}
        {readOnly&&<div className="account-note">
          <strong>Dados da conexão preservados</strong>
          <span>Seu acesso operacional está pausado. Reative uma assinatura para alterar ou reconectar o WhatsApp.</span>
          <PrimaryButton fullWidth onClick={()=>openUpgrade('Reativar a operação do WhatsApp')}>Ver planos</PrimaryButton>
        </div>}
        {canConnect && <PrimaryButton
          fullWidth
          icon={<ArrowRight size={19} />}
          onClick={() => continueConnection(status,mode)}
        >
          {status==='pending'
            ? 'Retomar conexão'
            : status==='error'
              ? 'Tentar conectar novamente'
              : savedBusinessPreparation
                ? `Continuar preparação · passo ${savedBusinessPreparation.step} de 3`
                : 'Conectar WhatsApp'}
        </PrimaryButton>}
        {canDisconnect&&<PrimaryButton
          fullWidth
          icon={<ArrowRight size={19}/>}
          onClick={()=>setIsSheetOpen(true)}
        >
          Alterar forma de uso
        </PrimaryButton>}
        {canDisconnect&&!confirmDisconnect&&<button className="danger-outline-button" type="button" onClick={()=>setConfirmDisconnect(true)}><Unplug size={18}/>Desconectar WhatsApp</button>}
        {canDisconnect&&confirmDisconnect&&<div className="disconnect-confirm" role="alert">
          <strong>Desconectar este número do ALOVIA?</strong>
          <p>O ALOVIA deixará de receber e enviar mensagens por esta conexão. Isso não exclui sua conta do WhatsApp ou da Meta.</p>
          <div><button className="compact-button" type="button" onClick={()=>setConfirmDisconnect(false)}>Cancelar</button><button className="danger-button" type="button" disabled={disconnect.isPending} onClick={()=>disconnect.mutate(undefined,{onSuccess:()=>setConfirmDisconnect(false)})}>{disconnect.isPending?'Desconectando…':'Confirmar desconexão'}</button></div>
          {disconnect.isError&&<p className="form-error" role="alert">Não foi possível desconectar. Tente novamente.</p>}
        </div>}
        {!canConfigure && !readOnly && <p>Acesso de leitura. A configuração é gerenciada pelo administrador.</p>}
      </section>

      <section className="security-note">
        <span><LockKeyhole size={19} /></span>
        <div>
          <strong>Conexão oficial e segura</strong>
          <p>A autorização acontece com a Meta. Sua senha do WhatsApp não é solicitada pelo ALOVIA.</p>
        </div>
      </section>

      {(canConnect||canDisconnect) && <ConnectWhatsAppSheet open={isSheetOpen} currentMode={canDisconnect?mode:null} onClose={() => setIsSheetOpen(false)} />}
    </div>
  )
}
