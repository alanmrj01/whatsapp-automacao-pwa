import { Clock3, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { useBusinessHours, useUpdateBusinessHours } from '../operations/api'

const weekdays=['Segunda','Terça','Quarta','Quinta','Sexta']

export function WorkingHoursSettingsPage(){
  const hours=useBusinessHours()
  const update=useUpdateBusinessHours()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  const [selectedDays,setSelectedDays]=useState<number[]>([0,1,2,3,4])
  const [start,setStart]=useState('08:00')
  const [end,setEnd]=useState('18:00')
  const [weekendEnabled,setWeekendEnabled]=useState(false)
  const [weekendStart,setWeekendStart]=useState('08:00')
  const [weekendEnd,setWeekendEnd]=useState('12:00')

  useEffect(()=>{
    if(!hours.data)return
    if(hours.data.weekdays.length)setSelectedDays(hours.data.weekdays)
    if(hours.data.weekday_start_time)setStart(hours.data.weekday_start_time.slice(0,5))
    if(hours.data.weekday_end_time)setEnd(hours.data.weekday_end_time.slice(0,5))
    setWeekendEnabled(hours.data.weekend_holiday_enabled)
    if(hours.data.weekend_holiday_start_time)setWeekendStart(hours.data.weekend_holiday_start_time.slice(0,5))
    if(hours.data.weekend_holiday_end_time)setWeekendEnd(hours.data.weekend_holiday_end_time.slice(0,5))
  },[hours.data])

  if(hours.isPending)return <Shell><LoadingState/></Shell>
  if(hours.isError||!hours.data)return <Shell><ErrorState onRetry={()=>void hours.refetch()}/></Shell>

  const toggle=(day:number)=>setSelectedDays(current=>current.includes(day)?current.filter(item=>item!==day):[...current,day].sort())
  const valid=selectedDays.length>0&&end>start&&(!weekendEnabled||weekendEnd>weekendStart)

  return <Shell>
    <section className="operational-heading"><div><span className="eyebrow">Disponibilidade</span><h1>Horários de funcionamento</h1></div><InfoHelp title="Horários de funcionamento">Este é o horário da empresa. Técnicos ativos podem ser alocados dentro destas janelas, respeitando compromissos e bloqueios individuais.</InfoHelp></section>
    {canEdit?<form className="settings-form" onSubmit={event=>{
      event.preventDefault()
      if(!valid)return
      update.mutate({
        weekdays:selectedDays,
        weekday_start_time:start,
        weekday_end_time:end,
        weekend_holiday_enabled:weekendEnabled,
        weekend_holiday_start_time:weekendEnabled?weekendStart:null,
        weekend_holiday_end_time:weekendEnabled?weekendEnd:null,
      })
    }}>
      <fieldset className="settings-fieldset">
        <legend>Dias da semana</legend>
        <div className="settings-weekday-grid">
          {weekdays.map((label,index)=><label className={selectedDays.includes(index)?'settings-day-chip is-selected':'settings-day-chip'} key={label}><input type="checkbox" checked={selectedDays.includes(index)} onChange={()=>toggle(index)}/><span>{label}</span></label>)}
        </div>
        <button className="text-button" type="button" onClick={()=>setSelectedDays([0,1,2,3,4])}>Selecionar segunda a sexta</button>
      </fieldset>
      <div className="form-grid"><label>Início<input type="time" value={start} onChange={event=>setStart(event.target.value)}/></label><label>Fim<input type="time" value={end} onChange={event=>setEnd(event.target.value)}/></label></div>
      <label className="settings-checkbox"><input type="checkbox" checked={weekendEnabled} onChange={event=>setWeekendEnabled(event.target.checked)}/><span><strong>Atendemos em finais de semana e feriados nacionais</strong><small>Defina um horário específico para sábados, domingos e feriados nacionais reconhecidos pelo ALOVIA.</small></span></label>
      {weekendEnabled&&<div className="form-grid"><label>Início — finais de semana/feriados<input type="time" value={weekendStart} onChange={event=>setWeekendStart(event.target.value)}/></label><label>Fim — finais de semana/feriados<input type="time" value={weekendEnd} onChange={event=>setWeekendEnd(event.target.value)}/></label></div>}
      {update.isError&&<MutationError/>}
      {update.isSuccess&&<p className="form-success">Horários salvos.</p>}
      <button className="primary-button" disabled={!valid||update.isPending}><Save size={18}/>{update.isPending?'Salvando…':'Salvar horários'}</button>
    </form>:<div className="settings-list">
      <article className="settings-row"><Clock3/><div><strong>{hours.data.weekdays.map(day=>weekdays[day]).filter(Boolean).join(', ')||'Não configurado'}</strong><span>{hours.data.weekday_start_time?.slice(0,5)??'--:--'}–{hours.data.weekday_end_time?.slice(0,5)??'--:--'}</span></div></article>
    </div>}
  </Shell>
}

function MutationError(){return <p className="form-error" role="alert">Não foi possível salvar. Revise os horários e tente novamente.</p>}
function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
