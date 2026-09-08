import { Bot, Building2, CalendarCog, Check, CircleUserRound, Clock3, CreditCard, LockKeyhole, MessageCircleMore, ShieldCheck, UsersRound } from 'lucide-react'
import { InfoHelp } from '../../components/InfoHelp'
import { ListRow } from '../../components/ListRow'
import { Section } from '../../components/Section'
import { StatusBadge } from '../../components/StatusBadge'
import { SessionActions } from '../auth/SessionActions'
import { useProductState } from '../product/productState'

export function MorePage() {
  const {state,membership,connection} = useProductState()
  const whatsappReady = state==='ACTIVE'
  const completed = 1+(whatsappReady?1:0)
  const connectionLabel = state==='FREE_DEMO'?'Plano pago':state==='CONNECTION_PENDING'?'Preparando':whatsappReady?'Conectado':connection.isError?'Erro':'Não conectado'

  return <div className="page-stack operational-page compact-page">
    <section className="operational-heading"><div><span className="eyebrow">{membership?.business_name??'Sua empresa'}</span><h1>Mais</h1></div></section>

    <section className="setup-progress" id="configuracao" aria-labelledby="setup-title">
      <div className="section-title-row"><div><span className="eyebrow">Primeiros passos</span><h2 id="setup-title">Configuração {completed} de 5</h2></div><InfoHelp title="Progresso da configuração">O progresso usa somente dados confirmados pelo backend. Horários, automação e agenda dependem de APIs públicas futuras.</InfoHelp></div>
      <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={completed}><span style={{width:`${completed/5*100}%`}}/></div>
      <ol className="setup-steps">
        <li className="is-complete"><Check/>Dados da empresa</li>
        <li><span>2</span>Horários de funcionamento</li>
        <li><span>3</span>Automação de atendimento</li>
        <li><span>4</span>Configuração da agenda</li>
        <li className={whatsappReady?'is-complete':''}>{whatsappReady?<Check/>:<span>5</span>}Conectar WhatsApp</li>
      </ol>
    </section>

    <Section title="Empresa">
      <div className="list-surface"><ListRow icon={Building2} title="Dados da empresa" trailing={<StatusBadge tone="success">Concluído</StatusBadge>}/><ListRow icon={Clock3} title="Horários de funcionamento" trailing={<InfoHelp title="Horários">A edição depende do endpoint público de configurações da empresa.</InfoHelp>}/></div>
    </Section>
    <Section title="Atendimento">
      <div className="list-surface"><ListRow icon={Bot} title="Automação de atendimento" trailing={<InfoHelp title="Automação">Comportamento, transferência humana e respostas fora do horário ficarão concentrados aqui quando a API pública estiver disponível.</InfoHelp>}/><ListRow icon={UsersRound} title="Equipe e responsáveis" trailing={<InfoHelp title="Equipe">Cadastros e permissões operacionais dependem do backend público.</InfoHelp>}/></div>
    </Section>
    <Section title="WhatsApp">
      <div className="list-surface"><ListRow icon={MessageCircleMore} title="Conexão do WhatsApp" subtitle={connectionLabel} to="/app/whatsapp" trailing={<StatusBadge tone={whatsappReady?'success':state==='ERROR'?'danger':'info'}>{connectionLabel}</StatusBadge>}/></div>
    </Section>
    <Section title="Agenda">
      <div className="list-surface"><ListRow icon={CalendarCog} title="Agenda e disponibilidade" to="/app/agenda"/><ListRow icon={UsersRound} title="Técnicos e responsáveis" trailing={<InfoHelp title="Responsáveis">A gestão real de técnicos exige os endpoints públicos de agenda e equipe.</InfoHelp>}/></div>
    </Section>
    <Section title="Conta">
      <div className="list-surface"><ListRow icon={CreditCard} title="Plano" subtitle={membership?.access_mode==='free'?'Gratuito':'Pago'}/><ListRow icon={CircleUserRound} title="Usuário"/><ListRow icon={LockKeyhole} title="Segurança"/><ListRow icon={ShieldCheck} title="Privacidade"/></div>
    </Section>
    <SessionActions />
  </div>
}
