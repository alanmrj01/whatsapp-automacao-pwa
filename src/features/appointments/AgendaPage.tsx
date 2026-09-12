import { CalendarPlus2, ChevronLeft, ChevronRight, Clock3, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BottomSheet } from '../../components/BottomSheet'
import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { StatusBadge } from '../../components/StatusBadge'
import { demoAppointments, demoToday, type DemoAppointment, type DemoAppointmentStatus } from '../../demo/operationalDemo'
import { DemoDataNotice } from '../access/DemoDataNotice'
import { useEntitlements } from '../access/useEntitlements'
import { useUpgradePrompt } from '../access/upgradePromptContext'
import { useAuth } from '../auth/useAuth'
import { useAppointments, useBusiness, useCancelAppointment, useCreateCustomer, useCustomers, useEmployees, useSaveAppointment, useServices } from '../operations/api'
import type { Appointment, AppointmentStatus } from '../operations/types'
import { zonedDateTimeToIso } from '../operations/timezone'

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

export function AgendaPage() {
  const entitlement = useEntitlements()
  const {openUpgrade} = useUpgradePrompt()
  const demo = entitlement.usesDemoData
  const [searchParams,setSearchParams] = useSearchParams()
  const [selectedDate,setSelectedDate] = useState(demo?demoToday:new Date().toISOString().slice(0,10))
  const [selectedDemo,setSelectedDemo] = useState<DemoAppointment|null>(null)
  const dayAppointments = useMemo(()=>demoAppointments.filter(item=>item.date===selectedDate).sort((a,b)=>a.time.localeCompare(b.time)),[selectedDate])

  useEffect(()=>{
    if (demo&&searchParams.get('action')==='new') {
      openUpgrade('Criar um novo agendamento')
      setSearchParams({}, {replace:true})
    }
  },[demo,openUpgrade,searchParams,setSearchParams])

  const openNew = () => openUpgrade('Criar um novo agendamento')

  if (!demo) return <RealAgenda selectedDate={selectedDate} setSelectedDate={setSelectedDate} />

  return <div className="page-stack operational-page compact-page">
    <section className="operational-heading"><div><span className="eyebrow">Agenda demonstrativa</span><h1>Agenda</h1></div><button className="compact-button" type="button" onClick={openNew}><CalendarPlus2 size={18}/>Novo</button></section>

    <DemoDataNotice />

    <section className="agenda-date-picker" aria-label="Selecionar data">
      <button type="button" aria-label="Dia anterior" onClick={()=>setSelectedDate(value=>moveDate(value,-1))}><ChevronLeft/></button>
      <label><span>{readableDate(selectedDate)}</span><input type="date" value={selectedDate} onChange={event=>setSelectedDate(event.target.value)}/></label>
      <button type="button" aria-label="Próximo dia" onClick={()=>setSelectedDate(value=>moveDate(value,1))}><ChevronRight/></button>
    </section>

    <div className="section-title-row"><h2>{dayAppointments.length} {dayAppointments.length===1?'atendimento':'atendimentos'}</h2><InfoHelp title="Agenda de demonstração">Os exemplos são somente leitura e nunca são enviados ao backend.</InfoHelp></div>
    {dayAppointments.length ? <section className="agenda-list">
      {dayAppointments.map(item=><article className={item.status==='cancelled'?'agenda-row is-cancelled':'agenda-row'} key={item.id}>
        <button type="button" onClick={()=>setSelectedDemo(item)} aria-label={`Ver agendamento fictício de ${item.customer}`}>
          <time>{item.time}</time>
          <div><strong>{item.customer}</strong><span>{item.service}</span><small><UserRound size={14}/>{item.technician||'Sem responsável'}</small></div>
          <StatusBadge tone={statusTones[item.status]}>{statusLabels[item.status]}</StatusBadge>
        </button>
      </article>)}
    </section> : <EmptyState icon={Clock3} title="Dia livre" description="Nenhum exemplo fictício nesta data." action={<button className="primary-button" type="button" onClick={openNew}>Conhecer plano pago</button>} />}

    <BottomSheet open={!!selectedDemo} title={selectedDemo?.service??'Agendamento fictício'} description="Exemplo somente para visualização." onClose={()=>setSelectedDemo(null)}>
      {selectedDemo&&<dl className="demo-detail-list">
        <div><dt>Cliente</dt><dd>{selectedDemo.customer}</dd></div>
        <div><dt>Data e horário</dt><dd>{readableDate(selectedDemo.date)} às {selectedDemo.time}</dd></div>
        <div><dt>Responsável</dt><dd>{selectedDemo.technician}</dd></div>
        <div><dt>Status</dt><dd>{statusLabels[selectedDemo.status]}</dd></div>
        <div><dt>Observações</dt><dd>{selectedDemo.notes}</dd></div>
      </dl>}
      {selectedDemo&&<div className="demo-detail-actions">
        <Link className="compact-button" to={`/app/conversas?conversation=${selectedDemo.conversationId}`}>Ver conversa relacionada</Link>
        <button className="demo-locked-action" type="button" onClick={()=>{setSelectedDemo(null);openUpgrade('Alterar ou reagendar um atendimento')}}>Alterar agendamento</button>
      </div>}
    </BottomSheet>
  </div>
}

type RealDraft = {
  id?:string
  customer_id:string
  new_customer_name:string
  new_customer_phone:string
  service_id:string
  employee_id:string
  date:string
  time:string
  end_time:string
  status:AppointmentStatus
  notes:string
}

function timeValue(value:string,timeZone?:string) {
  return new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone}).format(new Date(value))
}

function dateValue(value:string,timeZone:string) {
  const parts=new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',day:'2-digit',timeZone}).formatToParts(new Date(value))
  const part=(type:string)=>parts.find(item=>item.type===type)?.value??''
  return `${part('year')}-${part('month')}-${part('day')}`
}

function realDraft(date:string,timeZone:string,item?:Appointment):RealDraft {
  return item ? {
    id:item.id,customer_id:item.customer_id,new_customer_name:'',new_customer_phone:'',service_id:item.service_id,employee_id:item.employee_id,
    date:dateValue(item.starts_at,timeZone),time:timeValue(item.starts_at,timeZone),end_time:timeValue(item.ends_at,timeZone),status:item.status,notes:item.notes??'',
  } : {customer_id:'',new_customer_name:'',new_customer_phone:'',service_id:'',employee_id:'',date,time:'09:00',end_time:'10:00',status:'pending',notes:''}
}

function RealAgenda({selectedDate,setSelectedDate}:{selectedDate:string;setSelectedDate:(value:string)=>void}) {
  const [searchParams,setSearchParams]=useSearchParams()
  const {membership}=useAuth()
  const canEdit=membership?.role!=='viewer'
  const appointments=useAppointments(selectedDate)
  const customers=useCustomers()
  const services=useServices()
  const employees=useEmployees()
  const business=useBusiness()
  const save=useSaveAppointment()
  const cancel=useCancelAppointment()
  const createCustomer=useCreateCustomer()
  const [draft,setDraft]=useState<RealDraft|null>(null)
  const [error,setError]=useState('')
  const items=appointments.data?.items??[]

  const timezone=business.data?.timezone??'America/Sao_Paulo'
  const requestedNew=canEdit&&searchParams.get('action')==='new'
  const visibleDraft=draft??(requestedNew?realDraft(selectedDate,timezone):null)
  const closeDraft=()=>{setDraft(null);if(requestedNew)setSearchParams({}, {replace:true})}
  const update=<K extends keyof RealDraft>(key:K,value:RealDraft[K])=>setDraft(current=>({...((current??visibleDraft) as RealDraft),[key]:value}))
  const submit=async(event:FormEvent)=>{
    event.preventDefault()
    const draft=visibleDraft
    if(!draft)return
    setError('')
    try {
      let customerId=draft.customer_id
      if(customerId==='new') customerId=(await createCustomer.mutateAsync({name:draft.new_customer_name,phone:draft.new_customer_phone})).id
      await save.mutateAsync({id:draft.id,values:{
        customer_id:customerId,service_id:draft.service_id,employee_id:draft.employee_id,
        starts_at:zonedDateTimeToIso(draft.date,draft.time,timezone),ends_at:zonedDateTimeToIso(draft.date,draft.end_time,timezone),
        status:draft.status,notes:draft.notes||null,
      }})
      setSelectedDate(draft.date)
      closeDraft()
    } catch {setError('Não foi possível salvar. Revise os dados e a disponibilidade.')}
  }

  return <div className="page-stack operational-page compact-page">
    <section className="operational-heading"><div><span className="eyebrow">Planejamento real</span><h1>Agenda</h1></div>{canEdit&&<button className="compact-button" type="button" onClick={()=>setDraft(realDraft(selectedDate,timezone))}><CalendarPlus2 size={18}/>Novo</button>}</section>
    <section className="agenda-date-picker" aria-label="Selecionar data">
      <button type="button" aria-label="Dia anterior" onClick={()=>setSelectedDate(moveDate(selectedDate,-1))}><ChevronLeft/></button>
      <label><span>{readableDate(selectedDate)}</span><input type="date" value={selectedDate} onChange={event=>setSelectedDate(event.target.value)}/></label>
      <button type="button" aria-label="Próximo dia" onClick={()=>setSelectedDate(moveDate(selectedDate,1))}><ChevronRight/></button>
    </section>
    {(appointments.isPending||business.isPending)&&<LoadingState/>}
    {(appointments.isError||business.isError)&&<ErrorState onRetry={()=>{void appointments.refetch();void business.refetch()}}/>}
    {appointments.data&&business.data&&<><div className="section-title-row"><h2>{items.length} {items.length===1?'atendimento':'atendimentos'}</h2><InfoHelp title="Agenda operacional">Alterações são persistidas na empresa ativa e respeitam técnico, serviço e conflitos de horário.</InfoHelp></div>
      {items.length?<section className="agenda-list">{items.map(item=><article className={item.status==='cancelled'?'agenda-row is-cancelled':'agenda-row'} key={item.id}><button type="button" onClick={()=>canEdit&&setDraft(realDraft(selectedDate,timezone,item))} aria-label={`Abrir agendamento de ${item.customer_name}`}><time>{timeValue(item.starts_at,timezone)}</time><div><strong>{item.customer_name}</strong><span>{item.service_name}</span><small><UserRound size={14}/>{item.employee_name}</small></div><StatusBadge tone={statusTones[item.status]}>{statusLabels[item.status]}</StatusBadge></button></article>)}</section>
      :<EmptyState icon={Clock3} title="Dia livre" description={canEdit?'Crie um agendamento para esta data.':'Nenhum atendimento nesta data.'} action={canEdit?<button className="primary-button" type="button" onClick={()=>setDraft(realDraft(selectedDate,timezone))}>Novo agendamento</button>:undefined}/>}</>}

    <BottomSheet open={!!visibleDraft} title={visibleDraft?.id?'Editar agendamento':'Novo agendamento'} description="Os dados serão salvos na empresa ativa." onClose={closeDraft}>
      {visibleDraft&&<form className="appointment-form" onSubmit={submit}>
        <label>Cliente<select required value={visibleDraft.customer_id} onChange={event=>update('customer_id',event.target.value)}><option value="">Selecione</option>{customers.data?.items.map(item=><option value={item.id} key={item.id}>{item.name}{item.phone?` · ${item.phone}`:''}</option>)}<option value="new">Novo cliente</option></select></label>
        {visibleDraft.customer_id==='new'&&<><label>Nome do cliente<input required value={visibleDraft.new_customer_name} onChange={event=>update('new_customer_name',event.target.value)}/></label><label>Telefone E.164<input required placeholder="+5512999999999" value={visibleDraft.new_customer_phone} onChange={event=>update('new_customer_phone',event.target.value)}/></label></>}
        <div className="form-grid"><label>Data<input required type="date" value={visibleDraft.date} onChange={event=>update('date',event.target.value)}/></label><label>Início<input required type="time" value={visibleDraft.time} onChange={event=>update('time',event.target.value)}/></label></div>
        <label>Fim<input required type="time" value={visibleDraft.end_time} onChange={event=>update('end_time',event.target.value)}/></label>
        <label>Serviço<select required value={visibleDraft.service_id} onChange={event=>update('service_id',event.target.value)}><option value="">Selecione</option>{services.data?.items.filter(item=>item.active).map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Responsável/técnico<select required value={visibleDraft.employee_id} onChange={event=>update('employee_id',event.target.value)}><option value="">Selecione</option>{employees.data?.items.filter(item=>item.active&&(!visibleDraft.service_id||item.service_ids.includes(visibleDraft.service_id))).map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Status<select value={visibleDraft.status} onChange={event=>update('status',event.target.value as AppointmentStatus)}>{Object.entries(statusLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
        <label>Observações<textarea rows={3} maxLength={2000} value={visibleDraft.notes} onChange={event=>update('notes',event.target.value)}/></label>
        {error&&<p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">{visibleDraft.id&&visibleDraft.status!=='cancelled'&&<button className="danger-button" type="button" disabled={cancel.isPending} onClick={()=>cancel.mutate(visibleDraft.id!,{onSuccess:closeDraft,onError:()=>setError('Não foi possível cancelar o agendamento.')})}>Cancelar agendamento</button>}<button className="primary-button" type="submit" disabled={save.isPending||createCustomer.isPending}>Salvar</button></div>
      </form>}
    </BottomSheet>
  </div>
}
