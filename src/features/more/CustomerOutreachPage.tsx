import { CalendarCheck2, Clock3, HeartHandshake, History } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { StatusBadge } from '../../components/StatusBadge'
import { useBusiness, useCustomerOutreach } from '../operations/api'
import type { CustomerOutreach } from '../operations/types'

const statusLabels:Record<CustomerOutreach['status'],string>={
  pending:'Programado',
  sent:'Enviado',
  skipped:'Ignorado',
  responded:'Respondeu',
  accepted:'Aceitou',
  declined:'Recusou',
  failed:'Falhou',
}

export function CustomerOutreachPage(){
  const outreach=useCustomerOutreach('cleaning_6m')
  const business=useBusiness()
  if(outreach.isPending||business.isPending)return <Shell><LoadingState/></Shell>
  if(outreach.isError||business.isError||!outreach.data||!business.data)return <Shell><ErrorState onRetry={()=>{void outreach.refetch();void business.refetch()}}/></Shell>

  const timezone=business.data.timezone
  const items=outreach.data.items
  const upcoming=items.filter(item=>item.status==='pending').sort((a,b)=>a.due_at.localeCompare(b.due_at))
  const history=items.filter(item=>item.status!=='pending').sort((a,b)=>(b.sent_at??b.due_at).localeCompare(a.sent_at??a.due_at))

  return <Shell>
    <section className="operational-heading">
      <div><span className="eyebrow">Relacionamento</span><h1>Preventivas</h1><p>Contatos automáticos de manutenção preventiva após serviços concluídos</p></div>
      <HeartHandshake size={28}/>
    </section>

    <section>
      <div className="section-title-row"><div><span className="eyebrow">Próximos contatos</span><h2>Clientes programados</h2></div><StatusBadge tone="info">{upcoming.length}</StatusBadge></div>
      <div className="settings-list outreach-list">
        {upcoming.map(item=><OutreachRow item={item} timezone={timezone} key={item.id}/>)}
        {!upcoming.length&&<p className="settings-empty">Nenhuma preventiva programada no momento.</p>}
      </div>
    </section>

    <section>
      <div className="section-title-row"><div><span className="eyebrow">Histórico</span><h2>Ofertas automáticas</h2></div><History size={20}/></div>
      <div className="settings-list outreach-list">
        {history.map(item=><OutreachRow item={item} timezone={timezone} key={item.id}/>)}
        {!history.length&&<p className="settings-empty">O histórico aparecerá aqui após os primeiros contatos de preventiva.</p>}
      </div>
    </section>
  </Shell>
}

function OutreachRow({item,timezone}:{item:CustomerOutreach;timezone:string}){
  const tone=item.status==='accepted'?'success':item.status==='declined'||item.status==='failed'?'danger':item.status==='sent'||item.status==='responded'?'info':'warning'
  return <article className="settings-row outreach-row">
    <div className="outreach-row__icon"><Clock3 size={18}/></div>
    <div>
      <strong>{item.customer_name}</strong>
      <span>{item.service_label??'Limpeza de ar-condicionado'} · {formatMoment(item.sent_at??item.due_at,timezone)}</span>
      {item.customer_phone&&<small>{item.customer_phone}</small>}
    </div>
    <div className="outreach-row__result">
      <StatusBadge tone={tone}>{statusLabels[item.status]}</StatusBadge>
      {item.status==='accepted'&&item.result_appointment_path&&<Link className="compact-button" to={item.result_appointment_path}><CalendarCheck2 size={15}/>Ver agendamento</Link>}
    </div>
  </article>
}

function formatMoment(value:string,timezone:string){
  return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:timezone}).format(new Date(value))
}

function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
