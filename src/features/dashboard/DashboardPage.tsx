import { CalendarCheck2, CalendarPlus2, CheckCircle2, Clock3, MessagesSquare, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActionCard } from '../../components/ActionCard'
import { InfoHelp } from '../../components/InfoHelp'
import { StatusBadge } from '../../components/StatusBadge'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { demoAppointments, demoOverview, demoToday } from '../../demo/operationalDemo'
import { useBusiness, useDashboardToday } from '../operations/api'
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
  const dashboard = useDashboardToday()
  const business = useBusiness()
  const demo = state === 'FREE_DEMO'
  const active = state === 'ACTIVE'
  const metrics = demo ? demoOverview : dashboard.data ? {
    waiting:dashboard.data.metrics.waiting_count,
    inProgress:dashboard.data.metrics.in_progress_count,
    appointmentsToday:dashboard.data.metrics.appointments_today_count,
    completed:dashboard.data.metrics.completed_today_count,
  } : {waiting:'—',inProgress:'—',appointmentsToday:'—',completed:'—'}
  const appointments = demo ? demoAppointments.filter(item=>item.date===demoToday).slice(0,3) : dashboard.data?.upcoming_appointments??[]
  const timezone=demo?undefined:business.data?.timezone
  const date = new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long',timeZone:timezone}).format(new Date())

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

    {!demo&&(dashboard.isPending||business.isPending)&&<LoadingState/>}
    {!demo&&(dashboard.isError||business.isError)&&<ErrorState onRetry={()=>{void dashboard.refetch();void business.refetch()}}/>}

    {(demo||(dashboard.data&&business.data))&&<section aria-labelledby="today-overview">
      <div className="section-title-row"><h2 id="today-overview">Agora</h2><InfoHelp title="Indicadores do dia">Mostram somente itens que pedem ação: fila, atendimentos em curso, agenda e concluídos.</InfoHelp></div>
      <div className="operational-metrics">
        <article><MessagesSquare/><span>Aguardando</span><strong>{metrics.waiting}</strong></article>
        <article><Clock3/><span>Em atendimento</span><strong>{metrics.inProgress}</strong></article>
        <article><CalendarCheck2/><span>Agenda hoje</span><strong>{metrics.appointmentsToday}</strong></article>
        <article><CheckCircle2/><span>Concluídos</span><strong>{metrics.completed}</strong></article>
      </div>
    </section>}

    {(demo||(dashboard.data&&business.data))&&<section aria-labelledby="next-appointments">
      <div className="section-title-row"><h2 id="next-appointments">Próximos atendimentos</h2><Link to="/app/agenda">Ver agenda</Link></div>
      {appointments.length ? <div className="appointment-surface">
        {appointments.map(item=><article className="appointment-compact" key={item.id}>
          <time>{'time' in item?item.time:new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:timezone}).format(new Date(item.starts_at))}</time><div><strong>{'customer' in item?item.customer:item.customer_name}</strong><span>{'service' in item?item.service:item.service_name} · {'technician' in item?item.technician:item.employee_name}</span></div><StatusBadge tone={item.status==='confirmed'?'success':item.status==='completed'?'info':item.status==='cancelled'?'danger':'warning'}>{item.status==='confirmed'?'Confirmado':item.status==='completed'?'Concluído':item.status==='cancelled'?'Cancelado':'Pendente'}</StatusBadge>
        </article>)}
      </div> : <div className="inline-empty"><CalendarCheck2/><span>Nenhum atendimento futuro para hoje.</span></div>}
    </section>}

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
