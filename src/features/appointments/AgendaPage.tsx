import { CalendarDays, CalendarPlus2, ChevronLeft, ChevronRight, Clock3, UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BottomSheet } from '../../components/BottomSheet'
import { EmptyState } from '../../components/EmptyState'
import { InfoHelp } from '../../components/InfoHelp'
import { StatusBadge } from '../../components/StatusBadge'
import { cancelDemoAppointment, demoAppointments, demoToday, saveDemoAppointment, type DemoAppointment, type DemoAppointmentStatus } from '../../demo/operationalDemo'
import { useProductState } from '../product/productState'

const statusLabels:Record<DemoAppointmentStatus,string> = {pending:'Pendente',confirmed:'Confirmado',completed:'Concluído',cancelled:'Cancelado'}
const statusTones:Record<DemoAppointmentStatus,'warning'|'success'|'info'|'danger'> = {pending:'warning',confirmed:'success',completed:'info',cancelled:'danger'}

function moveDate(value:string,days:number) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate()+days)
  return date.toISOString().slice(0,10)
}

function readableDate(value:string) {
  return new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${value}T12:00:00`))
}

function blankAppointment(id:string,date:string):DemoAppointment {
  return {id,date,time:'09:00',customer:'',phone:'',service:'Visita técnica',technician:'',status:'pending',notes:''}
}

export function AgendaPage() {
  const {state} = useProductState()
  const demo = state==='FREE_DEMO'
  const [searchParams,setSearchParams] = useSearchParams()
  const [selectedDate,setSelectedDate] = useState(demo?demoToday:new Date().toISOString().slice(0,10))
  const [appointments,setAppointments] = useState(()=>demoAppointments)
  const [draft,setDraft] = useState<DemoAppointment|null>(null)
  const nextId = useRef(1)
  const dayAppointments = useMemo(()=>appointments.filter(item=>item.date===selectedDate).sort((a,b)=>a.time.localeCompare(b.time)),[appointments,selectedDate])

  useEffect(()=>{
    if (demo&&searchParams.get('action')==='new') {
      setDraft(blankAppointment(`demo-new-${nextId.current++}`,selectedDate))
      setSearchParams({}, {replace:true})
    }
  },[demo,searchParams,selectedDate,setSearchParams])

  const openNew = () => setDraft(blankAppointment(`demo-new-${nextId.current++}`,selectedDate))
  const submit = (event:FormEvent) => {
    event.preventDefault()
    if (!draft) return
    setAppointments(current=>saveDemoAppointment(current,draft))
    setSelectedDate(draft.date)
    setDraft(null)
  }
  const update = <K extends keyof DemoAppointment>(key:K,value:DemoAppointment[K]) => setDraft(current=>current?{...current,[key]:value}:current)

  if (!demo) return <div className="page-stack operational-page compact-page">
    <section className="operational-heading"><div><span className="eyebrow">Planejamento</span><h1>Agenda</h1></div></section>
    <EmptyState icon={CalendarDays} title={state==='ACTIVE'?'Agenda real aguardando integração':'Configure sua operação'} description={state==='ACTIVE'?'A API pública de agendamentos ainda não está disponível. A interface não cria dados fictícios em uma conta ativa.':'Conclua as etapas em Mais antes de iniciar a agenda.'} action={<Link className="primary-button" to="/app/mais#configuracao">Abrir configuração</Link>} />
  </div>

  return <div className="page-stack operational-page compact-page">
    <section className="operational-heading"><div><span className="eyebrow">Dados de demonstração</span><h1>Agenda</h1></div><button className="compact-button" type="button" onClick={openNew}><CalendarPlus2 size={18}/>Novo</button></section>

    <section className="agenda-date-picker" aria-label="Selecionar data">
      <button type="button" aria-label="Dia anterior" onClick={()=>setSelectedDate(value=>moveDate(value,-1))}><ChevronLeft/></button>
      <label><span>{readableDate(selectedDate)}</span><input type="date" value={selectedDate} onChange={event=>setSelectedDate(event.target.value)}/></label>
      <button type="button" aria-label="Próximo dia" onClick={()=>setSelectedDate(value=>moveDate(value,1))}><ChevronRight/></button>
    </section>

    <div className="section-title-row"><h2>{dayAppointments.length} {dayAppointments.length===1?'atendimento':'atendimentos'}</h2><InfoHelp title="Agenda de demonstração">Você pode criar, editar, alterar o status e cancelar compromissos localmente. Nada é enviado ao backend.</InfoHelp></div>
    {dayAppointments.length ? <section className="agenda-list">
      {dayAppointments.map(item=><article className={item.status==='cancelled'?'agenda-row is-cancelled':'agenda-row'} key={item.id}>
        <button type="button" onClick={()=>setDraft({...item})} aria-label={`Editar agendamento de ${item.customer}`}>
          <time>{item.time}</time>
          <div><strong>{item.customer}</strong><span>{item.service}</span><small><UserRound size={14}/>{item.technician||'Sem responsável'}</small></div>
          <StatusBadge tone={statusTones[item.status]}>{statusLabels[item.status]}</StatusBadge>
        </button>
      </article>)}
    </section> : <EmptyState icon={Clock3} title="Dia livre" description="Crie um agendamento demonstrativo para esta data." action={<button className="primary-button" type="button" onClick={openNew}>Novo agendamento</button>} />}

    <BottomSheet open={!!draft} title={draft&&appointments.some(item=>item.id===draft.id)?'Editar agendamento':'Novo agendamento'} description="Dados de demonstração; sem envio ao backend." onClose={()=>setDraft(null)}>
      {draft&&<form className="appointment-form" onSubmit={submit}>
        <label>Cliente<input required value={draft.customer} onChange={event=>update('customer',event.target.value)}/></label>
        <label>Telefone<input required inputMode="tel" value={draft.phone} onChange={event=>update('phone',event.target.value)}/></label>
        <div className="form-grid"><label>Data<input required type="date" value={draft.date} onChange={event=>update('date',event.target.value)}/></label><label>Horário<input required type="time" value={draft.time} onChange={event=>update('time',event.target.value)}/></label></div>
        <label>Serviço<input required value={draft.service} onChange={event=>update('service',event.target.value)}/></label>
        <label>Responsável/técnico<input required value={draft.technician} onChange={event=>update('technician',event.target.value)}/></label>
        <label>Status<select value={draft.status} onChange={event=>update('status',event.target.value as DemoAppointmentStatus)}>{Object.entries(statusLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
        <label>Observações<textarea rows={3} value={draft.notes} onChange={event=>update('notes',event.target.value)}/></label>
        <div className="form-actions">
          {appointments.some(item=>item.id===draft.id)&&draft.status!=='cancelled'&&<button className="danger-button" type="button" onClick={()=>{setAppointments(current=>cancelDemoAppointment(current,draft.id));setDraft(null)}}>Cancelar agendamento</button>}
          <button className="primary-button" type="submit">Salvar</button>
        </div>
      </form>}
    </BottomSheet>
  </div>
}
