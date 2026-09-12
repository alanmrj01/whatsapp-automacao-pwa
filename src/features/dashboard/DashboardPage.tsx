import { CalendarCheck2, CalendarPlus2, CheckCircle2, Clock3, MessageCircleMore, MessagesSquare, Settings2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ActionCard } from '../../components/ActionCard'
import { InfoHelp } from '../../components/InfoHelp'
import { StatusBadge } from '../../components/StatusBadge'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { demoAppointments, demoOverview, demoToday } from '../../demo/operationalDemo'
import { DemoDataNotice } from '../access/DemoDataNotice'
import { useEntitlements } from '../access/useEntitlements'
import { useUpgradePrompt } from '../access/upgradePromptContext'
import { useBusiness, useDashboardToday } from '../operations/api'
import { useProductState } from '../product/productState'

const stateLabels = {
  FREE_DEMO: 'Modo demonstração',
  SETUP_PENDING: 'Configuração pendente',
  ACTIVE: 'Operação ativa',
  CONNECTION_PENDING: 'Conexão em andamento',
  ERROR: 'Atenção necessária',
} as const

export function DashboardPage() {
  const {state,membership,connection} = useProductState()
  const entitlement = useEntitlements()
  const {openUpgrade} = useUpgradePrompt()
  const dashboard = useDashboardToday()
  const business = useBusiness()
  const demo = entitlement.usesDemoData
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
  const whatsappStatus = demo ? 'demo' : connection.isError ? 'error' : connection.isPending ? 'loading' : connection.data?.status??'disconnected'
  const whatsappPresentation = {
    demo:{title:'Conheça o fluxo conectado',label:'Demonstração',tone:'info' as const,description:'Veja como o WhatsApp organiza conversas e agendamentos antes de ativar a operação.'},
    loading:{title:'Atualizando a conexão',label:'Consultando',tone:'neutral' as const,description:'Atualizando o estado da conexão da empresa.'},
    disconnected:{title:'Conecte o canal da empresa',label:'Não conectado',tone:'neutral' as const,description:'Conecte o WhatsApp Business oficial para começar a receber atendimentos.'},
    pending:{title:'Autorização em andamento',label:'Conectando',tone:'warning' as const,description:'A autorização está sendo concluída. Você pode acompanhar o status sem interromper o processo.'},
    connected:{title:'Canal pronto para atender',label:'Conectado',tone:'success' as const,description:'O canal está pronto para organizar as conversas da sua empresa.'},
    error:{title:'Revise a conexão',label:'Atenção necessária',tone:'danger' as const,description:'A conexão precisa ser revisada antes de continuar a operação.'},
  }[whatsappStatus]

  return <div className="page-stack operational-page dashboard-page">
    <section className="operational-heading">
      <div><span className="eyebrow">{membership?.business_name??'Sua empresa'}</span><h1>Visão do dia</h1><p>{date}</p></div>
      <StatusBadge tone={active?'success':state==='ERROR'?'danger':'info'}>{stateLabels[state]}</StatusBadge>
    </section>

    {demo && <DemoDataNotice />}

    <section className={`whatsapp-summary whatsapp-summary--${whatsappStatus}`} aria-labelledby="whatsapp-summary-title">
      <span className="whatsapp-summary__icon"><MessageCircleMore size={22}/></span>
      <div><span className="eyebrow">WhatsApp</span><h2 id="whatsapp-summary-title">{whatsappPresentation.title}</h2><p>{whatsappPresentation.description}</p></div>
      <StatusBadge tone={whatsappPresentation.tone}>{whatsappPresentation.label}</StatusBadge>
      {demo
        ? <button className="compact-button" type="button" onClick={()=>openUpgrade('Conectar o WhatsApp')}>Conectar WhatsApp</button>
        : <Link className="compact-button" to="/app/whatsapp">{whatsappStatus==='disconnected'?'Conectar':whatsappStatus==='error'?'Revisar':'Ver conexão'}</Link>}
    </section>

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
        <ActionCard icon={CalendarPlus2} title="Novo agendamento" description={demo?'Disponível no plano pago':'Criar na agenda'} to={demo?undefined:'/app/agenda?action=new'} onClick={demo?()=>openUpgrade('Criar um novo agendamento'):undefined} />
        <ActionCard icon={CalendarCheck2} title="Ver agenda" description="Dia e próximos horários" to="/app/agenda" />
        <ActionCard icon={Settings2} title="Configurar empresa" description={demo?'Disponível no plano pago':membership?.business_name??'Sua operação'} to={demo?undefined:'/app/mais#configuracao'} onClick={demo?()=>openUpgrade('Configurar a operação'):undefined} />
      </div>
    </section>
  </div>
}
