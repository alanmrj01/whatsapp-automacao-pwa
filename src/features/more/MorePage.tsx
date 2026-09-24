import { Bot, Boxes, Building2, CalendarCog, CircleUserRound, Clock3, CreditCard, LockKeyhole, MessageCircleMore, PackageOpen, ShieldCheck, UsersRound } from 'lucide-react'
import { ListRow } from '../../components/ListRow'
import { Section } from '../../components/Section'
import { StatusBadge } from '../../components/StatusBadge'
import { SessionActions } from '../auth/SessionActions'
import { useEntitlements } from '../access/useEntitlements'
import { useUpgradePrompt } from '../access/upgradePromptContext'
import { useProductState } from '../product/productState'

export function MorePage(){
  const {state,membership,connection,setup}=useProductState()
  const entitlement=useEntitlements()
  const {openUpgrade}=useUpgradePrompt()
  const paid=entitlement.isPaid
  const whatsappReady=connection.data?.status==='connected'||setup.data?.whatsapp||state==='ACTIVE'
  const whatsappPending=paid&&setup.data?.onboarding_completed===true&&!whatsappReady
  const nonWhatsAppBlockingReasons=setup.data?.blocking_reasons.filter(reason=>!/WhatsApp/i.test(reason))??[]
  const needsReview=paid&&setup.data?.onboarding_completed===true&&nonWhatsAppBlockingReasons.length>0
  const connectionLabel=state==='FREE_DEMO'?'Disponível com assinatura':connection.isPending?'Consultando':connection.isError||connection.data?.status==='error'?'Atenção necessária':connection.data?.status==='pending'?'Conectando':whatsappReady?'Conectado':'Não conectado'
  const planLabel=paid?'Acesso liberado':entitlement.isReadOnlyRetained?'Acesso pausado':'Gratuito'
  const gated=(label:string)=>()=>openUpgrade(label)

  return <div className="page-stack operational-page compact-page">
    <section className="operational-heading"><div><span className="eyebrow">{membership?.business_name??'Sua empresa'}</span><h1>Mais</h1></div></section>

    {needsReview?<section className="setup-callout setup-callout--warning" role="status"><div><strong>Revise sua configuração</strong><span>{nonWhatsAppBlockingReasons.join(' ')}</span></div></section>:paid&&setup.data?.onboarding_completed&&!whatsappPending&&<section className="setup-callout setup-callout--complete"><div><strong>Configuração inicial concluída</strong><span>Você pode alterar os dados da operação a qualquer momento nas opções abaixo.</span></div></section>}

    <Section title="WhatsApp">
      <div className="list-surface"><ListRow icon={MessageCircleMore} title="Conexão do WhatsApp" subtitle={connectionLabel} to="/app/whatsapp" trailing={<StatusBadge tone={whatsappReady?'success':connection.isError||connection.data?.status==='error'?'danger':'info'}>{connectionLabel}</StatusBadge>}/></div>
    </Section>

    <Section title="Atendimento">
      <div className="list-surface"><ListRow icon={Bot} title="Assistente Virtual" subtitle="Mensagens, reconhecimento e contatos sem resposta automática" to={paid?'/app/mais/automacao':undefined} onClick={!paid?gated('Configurar o Assistente Virtual'):undefined}/></div>
    </Section>

    <Section title="Empresa">
      <div className="list-surface">
        <ListRow icon={Building2} title="Dados da empresa" subtitle="Nome, responsável, endereço e fuso horário" to={paid?'/app/mais/empresa':undefined} onClick={!paid?gated('Configurar os dados da empresa'):undefined}/>
        <ListRow icon={UsersRound} title="Técnicos e responsáveis" to={paid?'/app/mais/equipe':undefined} onClick={!paid?gated('Gerenciar técnicos e responsáveis'):undefined}/>
        <ListRow icon={Clock3} title="Horários de funcionamento" to={paid?'/app/mais/horarios':undefined} onClick={!paid?gated('Configurar horários de funcionamento'):undefined}/>
        <ListRow icon={Boxes} title="Catálogo de serviços" subtitle="Serviços, duração e preço" to={paid?'/app/mais/servicos':undefined} onClick={!paid?gated('Configurar catálogo de serviços'):undefined}/>
        <ListRow icon={PackageOpen} title="Catálogo de equipamentos e materiais" subtitle="Materiais e equipamentos cobrados à parte" to={paid?'/app/mais/catalogo':undefined} onClick={!paid?gated('Configurar catálogo da empresa'):undefined}/>
      </div>
    </Section>

    <Section title="Agenda">
      <div className="list-surface"><ListRow icon={CalendarCog} title="Agenda e disponibilidade" subtitle="Tempos automáticos ou definidos por você" to={paid?'/app/mais/agenda':undefined} onClick={!paid?gated('Configurar agenda e disponibilidade'):undefined}/></div>
    </Section>

    <Section title="Conta">
      <div className="list-surface">
        <ListRow icon={CreditCard} title="Plano" subtitle={planLabel} to="/app/mais/plano"/>
        <ListRow icon={CircleUserRound} title="Usuário" to="/app/mais/usuario"/>
        <ListRow icon={LockKeyhole} title="Segurança" to="/app/mais/seguranca"/>
        <ListRow icon={ShieldCheck} title="Privacidade" to="/app/mais/privacidade"/>
      </div>
    </Section>
    <SessionActions/>
  </div>
}
