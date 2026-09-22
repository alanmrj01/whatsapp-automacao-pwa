import { Bot, Boxes, Building2, CalendarCog, Check, CircleUserRound, Clock3, CreditCard, LockKeyhole, MessageCircleMore, ShieldCheck, UsersRound, Wrench } from 'lucide-react'
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
  const connectionLabel = state==='FREE_DEMO'?'Disponível com assinatura':connection.isPending?'Consultando':connection.isError||connection.data?.status==='error'?'Atenção necessária':connection.data?.status==='pending'?'Conectando':whatsappReady?'Conectado':'Não conectado'
  const planLabel = paid?'Acesso liberado':entitlement.isReadOnlyRetained?'Acesso pausado':'Gratuito'

  return <div className="page-stack operational-page compact-page">
    <section className="operational-heading"><div><span className="eyebrow">{membership?.business_name??'Sua empresa'}</span><h1>Mais</h1></div></section>

    <section className="setup-progress" id="configuracao" aria-labelledby="setup-title">
      <div className="section-title-row"><div><span className="eyebrow">Configuração inicial</span><h2 id="setup-title">Configuração {completed} de 7</h2></div><InfoHelp title="Progresso da configuração">As sete etapas garantem os dados mínimos para o Assistente Virtual atender e agendar com segurança.</InfoHelp></div>
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={7} aria-valuenow={completed}><span style={{width:`${completed/7*100}%`}}/></div>
      <ol className="setup-steps">
        <SetupStep ready={state==='FREE_DEMO'||!!setup.data?.company} number={1}>Dados da empresa</SetupStep>
        <SetupStep ready={!!setup.data?.team} number={2}>Técnico responsável</SetupStep>
        <SetupStep ready={!!setup.data?.business_hours} number={3}>Horários de funcionamento</SetupStep>
        <SetupStep ready={!!setup.data?.services} number={4}>Catálogo de serviços</SetupStep>
        <SetupStep ready={!!setup.data?.materials} number={5}>Materiais e equipamentos</SetupStep>
        <SetupStep ready={!!setup.data?.agenda} number={6}>Agenda e disponibilidade</SetupStep>
        <li className={whatsappReady?'is-complete':''}>{whatsappReady?<Check/>:<span>7</span>}Conectar WhatsApp</li>
      </ol>
      {paid&&setup.data&&!setup.data.onboarding_completed&&<Link className="compact-button setup-next" to="/app/onboarding">Continuar configuração</Link>}
    </section>

    <Section title="WhatsApp">
      <div className="list-surface"><ListRow icon={MessageCircleMore} title="Conexão do WhatsApp" subtitle={connectionLabel} to="/app/whatsapp" trailing={<StatusBadge tone={whatsappReady?'success':connection.isError||connection.data?.status==='error'?'danger':'info'}>{connectionLabel}</StatusBadge>}/></div>
    </Section>
    <Section title="Atendimento">
      <div className="list-surface"><ListRow icon={Bot} title="Assistente Virtual" to={paid?'/app/mais/automacao':undefined} onClick={!paid?()=>openUpgrade('Configurar o Assistente Virtual'):undefined}/></div>
    </Section>
    <Section title="Empresa">
      <div className="list-surface">
        <ListRow icon={Building2} title="Dados da empresa" to={paid?'/app/mais/empresa':undefined} onClick={!paid?()=>openUpgrade('Configurar os dados operacionais da empresa'):undefined} trailing={<StatusBadge tone={setup.data?.company||state==='FREE_DEMO'?'success':'warning'}>{setup.data?.company||state==='FREE_DEMO'?'Concluído':'Pendente'}</StatusBadge>}/>
        <ListRow icon={UsersRound} title="Técnicos e responsáveis" to={paid?'/app/mais/equipe':undefined} onClick={!paid?()=>openUpgrade('Gerenciar técnicos e responsáveis'):undefined}/>
        <ListRow icon={Clock3} title="Horários de funcionamento" to={paid?'/app/mais/horarios':undefined} onClick={!paid?()=>openUpgrade('Configurar horários de funcionamento'):undefined}/>
        <ListRow icon={Wrench} title="Catálogo de serviços" subtitle="Serviços, duração e preços" to={paid?'/app/mais/servicos':undefined} onClick={!paid?()=>openUpgrade('Configurar o catálogo de serviços'):undefined}/>
        <ListRow icon={Boxes} title="Catálogo da empresa" subtitle="Somente materiais e equipamentos" to={paid?'/app/mais/catalogo':undefined} onClick={!paid?()=>openUpgrade('Configurar materiais e equipamentos'):undefined}/>
      </div>
    </Section>
    <Section title="Agenda">
      <div className="list-surface"><ListRow icon={CalendarCog} title="Agenda e disponibilidade" to={paid?'/app/mais/agenda':undefined} onClick={!paid?()=>openUpgrade('Configurar agenda e disponibilidade'):undefined}/></div>
    </Section>
    <Section title="Conta">
      <div className="list-surface">
        <ListRow icon={CreditCard} title="Plano" subtitle={planLabel} to="/app/mais/plano"/>
        <ListRow icon={CircleUserRound} title="Usuário" to="/app/mais/usuario"/>
        <ListRow icon={LockKeyhole} title="Segurança" to="/app/mais/seguranca"/>
        <ListRow icon={ShieldCheck} title="Privacidade" to="/app/mais/privacidade"/>
      </div>
    </Section>
    <SessionActions />
  </div>
}

function SetupStep({ready,number,children}:{ready:boolean;number:number;children:React.ReactNode}) {return <li className={ready?'is-complete':''}>{ready?<Check/>:<span>{number}</span>}{children}</li>}

