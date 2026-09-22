import { CalendarDays, CalendarPlus2, ChevronLeft, ChevronRight, Clock3, List, UserRound } from 'lucide-react'
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
import { useAppointments, useAppointmentsRange, useBusiness, useCancelAppointment, useCreateCustomer, useCustomers, useEmployees, useSaveAppointment, useServices } from '../operations/api'
import type { Appointment, AppointmentStatus } from '../operations/types'
import { zonedDateTimeToIso } from '../operations/timezone'
import './agenda-calendar.css'

const statusLabels:Record<DemoAppointmentStatus,string> = {pending:'Pendente',confirmed:'Confirmado',completed:'Concluído',cancelled:'Cancelado'}
const statusTones:Record<DemoAppointmentStatus,'warning'|'success'|'info'|'danger'> = {pending:'warning',confirmed:'success',completed:'info',cancelled:'danger'}
const weekLabels=['Seg','Ter','Qua','Qui','Sex','Sáb','Dom']
type CalendarView='month'|'week'|'day'
type CalendarMode='month'|'week'

function moveDate(value:string,days:number) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate()+days)
  return localDateString(date)
}

function moveMonth(value:string,months:number) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(1)
  date.setMonth(date.getMonth()+months)
  return localDateString(date)
}

function localDateString(date:Date) {
  const year=date.getFullYear()
  const month=String(date.getMonth()+1).padStart(2,'0')
  const day=String(date.getDate()).padStart(2,'0')
  return `${year}-${month}-${day}`
}

function readableDate(value:string) {
  return new Intl.DateTimeFormat('pt-BR',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${value}T12:00:00`))
}

function monthLabel(value:string) {
  return new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(new Date(`${value.slice(0,7)}-01T12:00:00`))
}

function startOfWeek(value:string) {
  const date=new Date(`${value}T12:00:00`)
  const day=(date.getDay()+6)%7
  date.setDate(date.getDate()-day)
  return localDateString(date)
}

function monthGrid(value:string) {
  const first=`${value.slice(0,7)}-01`
  const start=startOfWeek(first)
  return Array.from({length:42},(_,index)=>moveDate(start,index))
}

function weekGrid(value:string) {
  const start=startOfWeek(value)
  return Array.from({length:7},(_,index)=>moveDate(start,index))
}

function monthRange(value:string) {
  const grid=monthGrid(value)
  return {start:grid[0],end:moveDate(grid[grid.length-1],1)}
}

function weekRange(value:string) {
  const start=startOfWeek(value)
  return {start,end:moveDate(start,7)}
}

export function AgendaPage() {
  const entitlement = useEntitlements()
  const {openUpgrade} = useUpgradePrompt()
  const demo = entitlement.usesDemoData
  const canMutate = entitlement.canMutateOperationalData
  const [searchParams,setSearchParams] = useSearchParams()
  const [selectedDate,setSelectedDate] = useState(demo?demoToday:new Date().toISOString().slice(0,10))
  const [view,setView]=useState<CalendarView>('month')
  const [calendarMode,setCalendarMode]=useState<CalendarMode>('month')
  const [selectedDemo,setSelectedDemo] = useState<DemoAppointment|null>(null)
  const dayAppointments = useMemo(()=>demoAppointments.filter(item=>item.date===selectedDate).sort((a,b)=>a.time.localeCompare(b.time)),[selectedDate])

  useEffect(()=>{
    if (!canMutate&&searchParams.get('action')==='new') {
      openUpgrade('Criar um novo agendamento')
      setSearchParams({}, {replace:true})
    }
  },[canMutate,openUpgrade,searchParams,setSearchParams])

  const openNew = () => openUpgrade('Criar um novo agendamento')

  if (!demo) return <RealAgenda selectedDate={selectedDate} setSelectedDate={setSelectedDate} canMutate={canMutate} initialView={view} setOuterView={setView}/>

  const demoDays=calendarMode==='month'?monthGrid(selectedDate):weekGrid(selectedDate)
  const demoByDate=new Map<string,DemoAppointment[]>()
  for(const item of demoAppointments) demoByDate.set(item.date,[...(demoByDate.get(item.date)??[]),item])

  return <div className="page-stack operational-page compact-page">
    <section className="operational-heading"><div><span className="eyebrow">Agenda demonstrativa</span><h1>Agenda</h1></div><button className="compact-button" type="button" onClick={openNew}><CalendarPlus2 size={18}/>Novo</button></section>
    <DemoDataNotice />

    {view!=='day'?<>
      <CalendarToolbar
        mode={calendarMode}
        selectedDate={selectedDate}
        onMode={mode=>{setCalendarMode(mode);setView(mode)}}
        onPrevious={()=>setSelectedDate(calendarMode==='month'?moveMonth(selectedDate,-1):moveDate(selectedDate,-7))}
        onNext={()=>setSelectedDate(calendarMode==='month'?moveMonth(selectedDate,1):moveDate(selectedDate,7))}
        onToday={()=>setSelectedDate(demoToday)}
      />
      <AgendaCalendar
        days={demoDays}
        month={selectedDate.slice(0,7)}
        selectedDate={selectedDate}
        appointmentsFor={date=>(demoByDate.get(date)??[]).map(item=>({id:item.id,time:item.time,service:item.service,status:item.status}))}
        onSelect={date=>{setSelectedDate(date);setView('day')}}
        mode={calendarMode}
      />
      <p className="agenda-calendar-note">Toque em um dia para abrir a lista completa de atendimentos.</p>
    </>:<>
      <DayHeader selectedDate={selectedDate} onBack={()=>setView(calendarMode)} onPrevious={()=>setSelectedDate(value=>moveDate(value,-1))} onNext={()=>setSelectedDate(value=>moveDate(value,1))}/>
      <div className="section-title-row"><h2>{dayAppointments.length} {dayAppointments.length===1?'atendimento':'atendimentos'}</h2><InfoHelp title="Agenda de demonstração">Os exemplos são somente leitura e nunca são enviados ao backend.</InfoHelp></div>
      {dayAppointments.length ? <section className="agenda-list">
        {dayAppointments.map(item=><article className={item.status==='cancelled'?'agenda-row is-cancelled':'agenda-row'} key={item.id}>
          <button type="button" onClick={()=>setSelectedDemo(item)} aria-label={`Ver agendamento fictício de ${item.customer}`}>
            <time>{item.time}</time>
            <div><strong>{item.customer}</strong><span>{item.service}</span><small><UserRound size={14}/>{item.technician||'Sem responsável'}</small></div>
            <StatusBadge tone={statusTones[item.status]}>{statusLabels[item.status]}</StatusBadge>
          </button>
        </article>)}
      </section> : <EmptyState icon={Clock3} title="Dia livre" description="Nenhum exemplo fictício nesta data." action={<button className="primary-button" type="button" onClick={openNew}>Conhecer planos</button>} />}
    </>}

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

type CalendarItem={id:string;time:string;service:string;status:DemoAppointmentStatus}

function CalendarToolbar({mode,selectedDate,onMode,onPrevious,onNext,onToday}:{mode:CalendarMode;selectedDate:string;onMode:(mode:CalendarMode)=>void;onPrevious:()=>void;onNext:()=>void;onToday:()=>void}) {
  return <section className="agenda-calendar-toolbar" aria-label="Controles do calendário">
    <div className="agenda-calendar-toolbar__period">
      <button type="button" aria-label={mode==='month'?'Mês anterior':'Semana anterior'} onClick={onPrevious}><ChevronLeft/></button>
      <strong>{mode==='month'?monthLabel(selectedDate):`${new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(new Date(`${startOfWeek(selectedDate)}T12:00:00`))} – ${new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(new Date(`${moveDate(startOfWeek(selectedDate),6)}T12:00:00`))}`}</strong>
      <button type="button" aria-label={mode==='month'?'Próximo mês':'Próxima semana'} onClick={onNext}><ChevronRight/></button>
    </div>
    <div className="agenda-calendar-toolbar__modes">
      <button type="button" className={mode==='month'?'is-active':''} onClick={()=>onMode('month')}><CalendarDays size={17}/>Mês</button>
      <button type="button" className={mode==='week'?'is-active':''} onClick={()=>onMode('week')}><List size={17}/>Semana</button>
      <button type="button" onClick={onToday}>Hoje</button>
    </div>
  </section>
}

function AgendaCalendar({days,month,selectedDate,appointmentsFor,onSelect,mode}:{days:string[];month:string;selectedDate:string;appointmentsFor:(date:string)=>CalendarItem[];onSelect:(date:string)=>void;mode:CalendarMode}) {
  const today=new Date().toISOString().slice(0,10)
  return <section className={`agenda-calendar agenda-calendar--${mode}`} aria-label={mode==='month'?'Calendário mensal':'Calendário semanal'}>
    <div className="agenda-calendar__weekdays">{weekLabels.map(label=><span key={label}>{label}</span>)}</div>
    <div className="agenda-calendar__grid">
      {days.map(date=>{
        const items=appointmentsFor(date).filter(item=>item.status!=='cancelled')
        const outside=mode==='month'&&!date.startsWith(month)
        return <button type="button" className={`agenda-calendar__day ${outside?'is-outside':''} ${date===today?'is-today':''} ${date===selectedDate?'is-selected':''}`} onClick={()=>onSelect(date)} key={date} aria-label={`${readableDate(date)}, ${items.length} atendimento(s)`}>
          <span className="agenda-calendar__date">{Number(date.slice(-2))}</span>
          <div className="agenda-calendar__events">
            {items.slice(0,mode==='week'?4:3).map(item=><span className="agenda-calendar__event" key={item.id}><time>{item.time}</time><strong>{item.service}</strong></span>)}
            {items.length>(mode==='week'?4:3)&&<span className="agenda-calendar__more">+{items.length-(mode==='week'?4:3)} atendimento(s)</span>}
          </div>
        </button>
      })}
    </div>
  </section>
}

function DayHeader({selectedDate,onBack,onPrevious,onNext}:{selectedDate:string;onBack:()=>void;onPrevious:()=>void;onNext:()=>void}) {
  return <section className="agenda-day-header">
    <button className="agenda-day-header__back" type="button" onClick={onBack}><CalendarDays size={18}/>Voltar ao calendário</button>
    <div className="agenda-date-picker" aria-label="Selecionar data">
      <button type="button" aria-label="Dia anterior" onClick={onPrevious}><ChevronLeft/></button>
      <label><span>{readableDate(selectedDate)}</span><input type="date" value={selectedDate} readOnly aria-readonly="true"/></label>
      <button type="button" aria-label="Próximo dia" onClick={onNext}><ChevronRight/></button>
    </div>
  </section>
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

function realDraft(date:string,timeZone:string,item?:Appointment,customerId=''):RealDraft {
  return item ? {
    id:item.id,customer_id:item.customer_id,new_customer_name:'',new_customer_phone:'',service_id:item.service_id,employee_id:item.employee_id,
    date:dateValue(item.starts_at,timeZone),time:timeValue(item.starts_at,timeZone),end_time:timeValue(item.ends_at,timeZone),status:item.status,notes:item.notes??'',
  } : {customer_id:customerId,new_customer_name:'',new_customer_phone:'',service_id:'',employee_id:'',date,time:'09:00',end_time:'10:00',status:'pending',notes:''}
}

function RealAgenda({selectedDate,setSelectedDate,canMutate,initialView,setOuterView}:{selectedDate:string;setSelectedDate:(value:string)=>void;canMutate:boolean;initialView:CalendarView;setOuterView:(value:CalendarView)=>void}) {
  const [searchParams,setSearchParams]=useSearchParams()
  const {membership}=useAuth()
  const canEdit=canMutate&&membership?.role!=='viewer'
  const business=useBusiness()
  const timezone=business.data?.timezone??'America/Sao_Paulo'
  const [calendarMode,setCalendarMode]=useState<CalendarMode>(initialView==='week'?'week':'month')
  const [view,setView]=useState<CalendarView>(searchParams.get('action')==='new'?'day':initialView)
  const range=useMemo(()=>calendarMode==='month'?monthRange(selectedDate):weekRange(selectedDate),[calendarMode,selectedDate])
  const rangeStarts=business.data?zonedDateTimeToIso(range.start,'00:00',timezone):''
  const rangeEnds=business.data?zonedDateTimeToIso(range.end,'00:00',timezone):''
  const calendarAppointments=useAppointmentsRange(rangeStarts,rangeEnds,view!=='day'&&!!business.data)
  const appointments=useAppointments(selectedDate)
  const customers=useCustomers()
  const services=useServices()
  const employees=useEmployees()
  const save=useSaveAppointment()
  const cancel=useCancelAppointment()
  const createCustomer=useCreateCustomer()
  const [draft,setDraft]=useState<RealDraft|null>(null)
  const [error,setError]=useState('')
  const items=appointments.data?.items??[]
  const requestedNew=canEdit&&searchParams.get('action')==='new'
  const requestedCustomer=searchParams.get('customer')??''
  const visibleDraft=draft??(requestedNew?realDraft(selectedDate,timezone,undefined,requestedCustomer):null)
  const closeDraft=()=>{setDraft(null);if(requestedNew)setSearchParams({}, {replace:true})}
  const update=<K extends keyof RealDraft>(key:K,value:RealDraft[K])=>setDraft(current=>({...((current??visibleDraft) as RealDraft),[key]:value}))
  const submit=async(event:FormEvent)=>{
    event.preventDefault()
    const draft=visibleDraft
    if(!draft||!canEdit)return
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
      setView('day')
    } catch {setError('Não foi possível salvar. Revise os dados e a disponibilidade.')}
  }

  const calendarDays=calendarMode==='month'?monthGrid(selectedDate):weekGrid(selectedDate)
  const realByDate=new Map<string,Appointment[]>()
  for(const item of calendarAppointments.data?.items??[]) {
    const date=dateValue(item.starts_at,timezone)
    realByDate.set(date,[...(realByDate.get(date)??[]),item])
  }
  const calendarItems=(date:string):CalendarItem[]=>(realByDate.get(date)??[]).map(item=>({
    id:item.id,
    time:timeValue(item.starts_at,timezone),
    service:item.service_name,
    status:item.status,
  }))

  const selectDay=(date:string)=>{setSelectedDate(date);setView('day');setOuterView('day')}
  const setCalendar=(mode:CalendarMode)=>{setCalendarMode(mode);setView(mode);setOuterView(mode)}

  return <div className="page-stack operational-page compact-page">
    <section className="operational-heading"><div><span className="eyebrow">Planejamento real</span><h1>Agenda</h1></div>{canEdit&&<button className="compact-button" type="button" onClick={()=>{setView('day');setOuterView('day');setDraft(realDraft(selectedDate,timezone))}}><CalendarPlus2 size={18}/>Novo</button>}</section>
    {!canMutate&&<section className="account-note" role="status"><strong>Agenda preservada</strong><span>Você pode consultar seus atendimentos. Alterações ficam disponíveis com uma assinatura ativa.</span></section>}

    {view!=='day'?<>
      <CalendarToolbar
        mode={calendarMode}
        selectedDate={selectedDate}
        onMode={setCalendar}
        onPrevious={()=>setSelectedDate(calendarMode==='month'?moveMonth(selectedDate,-1):moveDate(selectedDate,-7))}
        onNext={()=>setSelectedDate(calendarMode==='month'?moveMonth(selectedDate,1):moveDate(selectedDate,7))}
        onToday={()=>setSelectedDate(new Date().toISOString().slice(0,10))}
      />
      {(business.isPending||calendarAppointments.isPending)&&<LoadingState/>}
      {(business.isError||calendarAppointments.isError)&&<ErrorState onRetry={()=>{void business.refetch();void calendarAppointments.refetch()}}/>}
      {business.data&&calendarAppointments.data&&<>
        <AgendaCalendar days={calendarDays} month={selectedDate.slice(0,7)} selectedDate={selectedDate} appointmentsFor={calendarItems} onSelect={selectDay} mode={calendarMode}/>
        <p className="agenda-calendar-note">Toque em um dia para abrir a lista completa, editar ou criar atendimentos.</p>
      </>}
    </>:<>
      <DayHeader selectedDate={selectedDate} onBack={()=>setCalendar(calendarMode)} onPrevious={()=>setSelectedDate(moveDate(selectedDate,-1))} onNext={()=>setSelectedDate(moveDate(selectedDate,1))}/>
      {(appointments.isPending||business.isPending)&&<LoadingState/>}
      {(appointments.isError||business.isError)&&<ErrorState onRetry={()=>{void appointments.refetch();void business.refetch()}}/>}
      {appointments.data&&business.data&&<><div className="section-title-row"><h2>{items.length} {items.length===1?'atendimento':'atendimentos'}</h2><InfoHelp title="Agenda operacional">Os dados exibidos pertencem à empresa ativa e permanecem preservados mesmo quando o acesso operacional está pausado.</InfoHelp></div>
        {items.length?<section className="agenda-list">{items.map(item=><article className={item.status==='cancelled'?'agenda-row is-cancelled':'agenda-row'} key={item.id}><button type="button" onClick={()=>setDraft(realDraft(selectedDate,timezone,item))} aria-label={`Abrir agendamento de ${item.customer_name}`}><time>{timeValue(item.starts_at,timezone)}</time><div><strong>{item.customer_name}</strong><span>{item.service_name}</span><small><UserRound size={14}/>{item.employee_name}</small></div><StatusBadge tone={statusTones[item.status]}>{statusLabels[item.status]}</StatusBadge></button></article>)}</section>
        :<EmptyState icon={Clock3} title="Dia livre" description={canEdit?'Crie um agendamento para esta data.':'Nenhum atendimento nesta data.'} action={canEdit?<button className="primary-button" type="button" onClick={()=>setDraft(realDraft(selectedDate,timezone))}>Novo agendamento</button>:undefined}/>}</>}
    </>}

    <BottomSheet open={!!visibleDraft} title={canEdit?(visibleDraft?.id?'Editar agendamento':'Novo agendamento'):'Detalhes do agendamento'} description={canEdit?'Os dados serão salvos na empresa ativa.':'Consulta somente leitura.'} onClose={closeDraft}>
      {visibleDraft&&!canEdit&&<dl className="demo-detail-list">
        <div><dt>Data e horário</dt><dd>{readableDate(visibleDraft.date)} · {visibleDraft.time}–{visibleDraft.end_time}</dd></div>
        <div><dt>Status</dt><dd>{statusLabels[visibleDraft.status]}</dd></div>
        <div><dt>Observações</dt><dd>{visibleDraft.notes||'Sem observações.'}</dd></div>
      </dl>}
      {visibleDraft&&canEdit&&<form className="appointment-form" onSubmit={submit}>
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
