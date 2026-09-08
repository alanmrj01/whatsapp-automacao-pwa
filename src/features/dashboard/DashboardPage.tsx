import { CalendarCheck2, CalendarPlus2, CheckCircle2, Clock3, MessagesSquare, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActionCard } from '../../components/ActionCard'
import { InfoHelp } from '../../components/InfoHelp'
import { StatusBadge } from '../../components/StatusBadge'
import { demoAppointments, demoOverview, demoToday } from '../../demo/operationalDemo'
import { useProductState } from '../product/productState'

const stateLabels = {
  FREE_DEMO: 'Dados de demonstração',
  SETUP_PENDING: 'Configuração pendente',
  ACTIVE: 'Operação ativa',
  CONNECTION_PENDING: 'Conexão em andamento',
  ERROR: 'Atenção necessária',
} as const

export function DashboardPage() {
  const {state,membership} = useProductState()
  const demo = state === 'FREE_DEMO'
  const active = state === 'ACTIVE'
  const metrics = demo ? demoOverview : {waiting:'—',inProgress:'—',appointmentsToday:'—',completed:'—'}
  const appointments = demo ? demoAppointments.filter(item=>item.date===demoToday).slice(0,3) : []
  const date = new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(new Date())

  return <div className="page-stack operational-page dashboard-page">
    <section className="operational-heading">
      <div><span className="eyebrow">{date}</span><h1>Visão do dia</h1></div>
      <StatusBadge tone={active?'success':state==='ERROR'?'danger':'info'}>{stateLabels[state]}</StatusBadge>
    </section>

    {demo && <aside className="demo-banner">
      <span>Dados fictícios para você explorar o produto.</span>
      <InfoHelp title="Dados de demonstração">Nada desta tela pertence a clientes reais. A demonstração não envia dados nem faz chamadas para APIs operacionais.</InfoHelp>
    </aside>}

    {!demo && !active && <section className="setup-callout">
      <div><strong>{state==='CONNECTION_PENDING'?'Estamos preparando sua conexão':state==='ERROR'?'Revise a configuração':'Complete a configuração da operação'}</strong><span>Próxima etapa disponível em Mais.</span></div>
      <Link className="compact-button" to="/app/mais#configuracao">Continuar</Link>
    </section>}

    <section aria-labelledby="today-overview">
      <div className="section-title-row"><h2 id="today-overview">Agora</h2><InfoHelp title="Indicadores do dia">Mostram somente itens que pedem ação: fila, atendimentos em curso, agenda e concluídos.</InfoHelp></div>
      <div className="operational-metrics">
        <article><MessagesSquare/><span>Aguardando</span><strong>{metrics.waiting}</strong></article>
        <article><Clock3/><span>Em atendimento</span><strong>{metrics.inProgress}</strong></article>
        <article><CalendarCheck2/><span>Agenda hoje</span><strong>{metrics.appointmentsToday}</strong></article>
        <article><CheckCircle2/><span>Concluídos</span><strong>{metrics.completed}</strong></article>
      </div>
    </section>

    <section aria-labelledby="next-appointments">
      <div className="section-title-row"><h2 id="next-appointments">Próximos atendimentos</h2><Link to="/app/agenda">Ver agenda</Link></div>
      {appointments.length ? <div className="appointment-surface">
        {appointments.map(item=><article className="appointment-compact" key={item.id}>
          <time>{item.time}</time><div><strong>{item.customer}</strong><span>{item.service} · {item.technician}</span></div><StatusBadge tone={item.status==='confirmed'?'success':'warning'}>{item.status==='confirmed'?'Confirmado':'Pendente'}</StatusBadge>
        </article>)}
      </div> : <div className="inline-empty"><CalendarCheck2/><span>{active?'A agenda real depende do endpoint operacional ainda não publicado.':'Nenhum compromisso disponível neste estado.'}</span></div>}
    </section>

    <section aria-labelledby="quick-actions-title">
      <div className="section-title-row"><h2 id="quick-actions-title">Ações rápidas</h2></div>
      <div className="quick-actions quick-actions--operational">
        <ActionCard icon={MessagesSquare} title="Abrir fila" description="Conversas prioritárias" to="/app/conversas" />
        <ActionCard icon={CalendarPlus2} title="Novo agendamento" description="Criar na agenda" to="/app/agenda?action=new" />
        <ActionCard icon={CalendarCheck2} title="Ver agenda" description="Dia e próximos horários" to="/app/agenda" />
        <ActionCard icon={Settings2} title="Configurar empresa" description={membership?.business_name??'Sua operação'} to="/app/mais#configuracao" />
      </div>
    </section>
  </div>
}
