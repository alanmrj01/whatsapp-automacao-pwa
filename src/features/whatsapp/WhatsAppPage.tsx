import { ArrowRight, CalendarClock, LockKeyhole, MessageCircleMore, Snowflake, Unplug, Wrench } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PrimaryButton } from '../../components/PrimaryButton'
import { LoadingState } from '../../components/LoadingState'
import { ErrorState } from '../../components/ErrorState'
import { StatusBadge } from '../../components/StatusBadge'
import { useEntitlements } from '../access/useEntitlements'
import { useUpgradePrompt } from '../access/upgradePromptContext'
import { useAuth } from '../auth/useAuth'
import { canConfigureWhatsApp } from '../auth/types'
import { useConnection, useDisconnectWhatsApp } from './useConnection'
import { connectionModeLabels } from './connectionPresentation'
import { ConnectWhatsAppSheet } from './ConnectWhatsAppSheet'
import { ConnectionStatusBadge } from './ConnectionStatusBadge'

export function WhatsAppPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [confirmDisconnect,setConfirmDisconnect]=useState(false)
  const navigate=useNavigate()
  const [searchParams]=useSearchParams()
  const automaticContinuationHandled=useRef(false)
  const {membership} = useAuth()
  const entitlement = useEntitlements()
  const {openUpgrade} = useUpgradePrompt()
  const demo = entitlement.usesDemoData
  const readOnly = entitlement.isReadOnlyRetained
  const connection = useConnection()
  const disconnect = useDisconnectWhatsApp()

  useEffect(()=>{
    if(
      automaticContinuationHandled.current
      || connection.isPending
      || connection.isError
      || !connection.data
    )return
    const shouldContinue=searchParams.get('continuar')==='1'
    const changeTo=searchParams.get('alterar')
    if(!shouldContinue&&!changeTo)return
    automaticContinuationHandled.current=true
    const data=connection.data
    if(changeTo==='coexistence'){
      navigate('/app/whatsapp/business?autostart=1',{replace:true})
      return
    }
    if(changeTo==='api_only'){
      navigate('/app/whatsapp/exclusivo?autostart=1',{replace:true})
      return
    }
    const preferred=data.status==='pending'
      ? data.mode
      : data.desired_mode
    if(data.status!=='connected'&&preferred){
      navigate(
        preferred==='coexistence'
          ? '/app/whatsapp/business?autostart=1'
          : '/app/whatsapp/exclusivo?autostart=1',
        {replace:true},
      )
      return
    }
    setIsSheetOpen(true)
  },[connection.data,connection.isError,connection.isPending,navigate,searchParams])

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
  const {status,mode,review_status:reviewStatus} = connection.data
  const canConfigure = canConfigureWhatsApp(membership?.role)
  const canConnect = entitlement.isPaid && canConfigure && (
    status === 'disconnected' || status === 'error' || status === 'pending'
  )
  const canDisconnect = entitlement.isPaid && canConfigure && status==='connected'
  const continueConnection=()=>{
    const preferred=status==='pending'?mode:connection.data.desired_mode
    if(status!=='connected'&&preferred){
      navigate(
        preferred==='coexistence'
          ? '/app/whatsapp/business?autostart=1'
          : '/app/whatsapp/exclusivo?autostart=1',
      )
      return
    }
    setIsSheetOpen(true)
  }

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
        {reviewStatus==='rejected'&&<div className="account-note">
          <strong>Revisão da Meta requer atenção</strong>
          <span>A conexão está registrada na Alovia, mas a Meta informou que a revisão desta conta não foi aprovada. Verifique o painel da Meta antes de alterar ou reconectar o número.</span>
        </div>}
        {readOnly&&<div className="account-note">
          <strong>Dados da conexão preservados</strong>
          <span>Seu acesso operacional está pausado. Reative uma assinatura para alterar ou reconectar o WhatsApp.</span>
          <PrimaryButton fullWidth onClick={()=>openUpgrade('Reativar a operação do WhatsApp')}>Ver planos</PrimaryButton>
        </div>}
        {canConnect && <PrimaryButton
          fullWidth
          icon={<ArrowRight size={19} />}
          onClick={continueConnection}
        >
          {status==='pending'
            ? 'Retomar conexão'
            : status==='error'
              ? 'Tentar conectar novamente'
              : 'Conectar WhatsApp'}
        </PrimaryButton>}
        {status==='connected'&&canConfigure&&<button className="compact-button whatsapp-change-mode" type="button" onClick={()=>setIsSheetOpen(true)}>Alterar forma de uso</button>}
        {status==='connected'&&mode==='api_only'&&connection.data.desired_mode==='coexistence'&&connection.data.review_status!=='approved'&&<div className="account-note settings-note--important">
          <strong>Você já pode usar a Alovia normalmente</strong>
          <span>A Meta ainda não concluiu a análise necessária para tentar usar este número também no WhatsApp Business. A Alovia verificará essa situação periodicamente e avisará quando houver uma nova etapa disponível.</span>
        </div>}
        {status==='connected'&&mode==='api_only'&&connection.data.desired_mode==='coexistence'&&connection.data.review_status==='approved'&&<div className="account-note settings-note--important">
          <strong>A Meta concluiu a análise desta conta</strong>
          <span>Você já pode tentar ativar o uso simultâneo na Alovia e no WhatsApp Business.</span>
          <PrimaryButton fullWidth onClick={()=>navigate('/app/whatsapp/business?autostart=1')}>Tentar usar os dois juntos</PrimaryButton>
        </div>}
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

      {canConnect && <ConnectWhatsAppSheet open={isSheetOpen} onClose={() => setIsSheetOpen(false)} />}
    </div>
  )
}
