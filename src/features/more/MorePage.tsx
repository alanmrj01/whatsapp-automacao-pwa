import { Bot, Building2, CalendarCog, Check, CircleUserRound, Clock3, CreditCard, LockKeyhole, MessageCircleMore, ShieldCheck, UsersRound } from 'lucide-react'
import { InfoHelp } from '../../components/InfoHelp'
import { Link } from 'react-router-dom'
import { ListRow } from '../../components/ListRow'
import { Section } from '../../components/Section'
import { StatusBadge } from '../../components/StatusBadge'
import { SessionActions } from '../auth/SessionActions'
import { useEntitlements } from '../access/useEntitlements'
import { useUpgradePrompt } from '../access/upgradePromptContext'
import { useProductState } from '../product/productState'

export function MorePage() {
  const {state,membership,connection,setup} = useProductState()
  const entitlement = useEntitlements()
  const {openUpgrade} = useUpgradePrompt()
  const whatsappReady = connection.data?.status==='connected'||setup.data?.whatsapp||state==='ACTIVE'
  const paid = entitlement.isPaid
  const completed = state==='FREE_DEMO'?1:setup.data?.completed??0
  const connectionLabel = state==='FREE_DEMO'?'Disponível no plano pago':connection.isPending?'Consultando':connection.isError||connection.data?.status==='error'?'Atenção necessária':connection.data?.status==='pending'?'Conectando':whatsappReady?'Conectado':'Não conectado'

  return <div className="page-stack operational-page compact-page">
    <section className="operational-heading"><div><span className="eyebrow">{membership?.business_name??'Sua empresa'}</span><h1>Mais</h1></div></section>

    <section className="setup-progress" id="configuracao" aria-labelledby="setup-title">
      <div className="section-title-row"><div><span className="eyebrow">Primeiros passos</span><h2 id="setup-title">Configuração {completed} de 5</h2></div><InfoHelp title="Progresso da configuração">Em contas pagas, cada etapa é confirmada pelos dados reais da empresa ativa.</InfoHelp></div>
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={completed}><span style={{width:`${completed/5*100}%`}}/></div>
      <ol className="setup-steps">
        <SetupStep ready={state==='FREE_DEMO'||!!setup.data?.company} number={1}>Dados da empresa</SetupStep>
        <SetupStep ready={!!setup.data?.automation} number={2}>Assistente de atendimento</SetupStep>
        <li className={whatsappReady?'is-complete':''}>{whatsappReady?<Check/>:<span>3</span>}Conectar WhatsApp</li>
        <SetupStep ready={!!setup.data?.business_hours} number={4}>Horários de funcionamento</SetupStep>
        <SetupStep ready={!!setup.data?.agenda} number={5}>Configuração da agenda</SetupStep>
      </ol>
      {paid&&setup.data?.next_step&&setup.data.next_step!=='complete'&&<Link className="compact-button setup-next" to={setupRoute[setup.data.next_step]}>Continuar configuração</Link>}
    </section>

    <Section title="WhatsApp">
      <div className="list-surface"><ListRow icon={MessageCircleMore} title="Conexão do WhatsApp" subtitle={connectionLabel} to="/app/whatsapp" trailing={<StatusBadge tone={whatsappReady?'success':connection.isError||connection.data?.status==='error'?'danger':'info'}>{connectionLabel}</StatusBadge>}/></div>
    </Section>
    <Section title="Atendimento">
      <div className="list-surface"><ListRow icon={Bot} title="Assistente e automação" to={paid?'/app/mais/automacao':undefined} onClick={!paid?()=>openUpgrade('Configurar o assistente de atendimento'):undefined}/><ListRow icon={UsersRound} title="Equipe e responsáveis" to={paid?'/app/mais/equipe':undefined} onClick={!paid?()=>openUpgrade('Gerenciar equipe e responsáveis'):undefined}/></div>
    </Section>
    <Section title="Empresa">
      <div className="list-surface"><ListRow icon={Building2} title="Dados da empresa" to={paid?'/app/mais/empresa':undefined} onClick={!paid?()=>openUpgrade('Configurar os dados operacionais da empresa'):undefined} trailing={<StatusBadge tone={setup.data?.company||state==='FREE_DEMO'?'success':'warning'}>{setup.data?.company||state==='FREE_DEMO'?'Concluído':'Pendente'}</StatusBadge>}/><ListRow icon={Clock3} title="Horários de funcionamento" to={paid?'/app/mais/horarios':undefined} onClick={!paid?()=>openUpgrade('Configurar horários de funcionamento'):undefined}/></div>
    </Section>
    <Section title="Agenda">
      <div className="list-surface"><ListRow icon={CalendarCog} title="Agenda e disponibilidade" to={paid?'/app/mais/agenda':undefined} onClick={!paid?()=>openUpgrade('Configurar agenda e disponibilidade'):undefined}/><ListRow icon={UsersRound} title="Técnicos e responsáveis" to={paid?'/app/mais/equipe':undefined} onClick={!paid?()=>openUpgrade('Gerenciar técnicos e responsáveis'):undefined}/></div>
    </Section>
    <Section title="Conta">
      <div className="list-surface"><ListRow icon={CreditCard} title="Plano" subtitle={paid?'Pago':'Gratuito'} onClick={!paid?()=>openUpgrade('Recursos do plano pago'):undefined}/><ListRow icon={CircleUserRound} title="Usuário"/><ListRow icon={LockKeyhole} title="Segurança"/><ListRow icon={ShieldCheck} title="Privacidade"/></div>
    </Section>
    <SessionActions />
  </div>
}

function SetupStep({ready,number,children}:{ready:boolean;number:number;children:React.ReactNode}) {return <li className={ready?'is-complete':''}>{ready?<Check/>:<span>{number}</span>}{children}</li>}

const setupRoute={company:'/app/mais/empresa',business_hours:'/app/mais/horarios',automation:'/app/mais/automacao',agenda:'/app/mais/agenda',whatsapp:'/app/whatsapp'} as const
