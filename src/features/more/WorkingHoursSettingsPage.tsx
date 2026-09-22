import { Clock3, Plus } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { useCreateWorkingHours, useDeleteWorkingHours, useEmployees, useWorkingHours } from '../operations/api'

const weekdays=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']

export function WorkingHoursSettingsPage(){
  const hours=useWorkingHours(),employees=useEmployees()
  const create=useCreateWorkingHours(),remove=useDeleteWorkingHours()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  const [employeeId,setEmployeeId]=useState('')
  const [weekday,setWeekday]=useState(0)
  const [start,setStart]=useState('08:00')
  const [end,setEnd]=useState('18:00')
  const technicians=employees.data?.items.filter(item=>item.active&&item.operational_role==='technician')??[]
  const pending=hours.isPending||employees.isPending
  const error=hours.isError||employees.isError
  return <Shell>
    <section className="operational-heading"><div><span className="eyebrow">Disponibilidade</span><h1>Horários de funcionamento</h1></div><InfoHelp title="Horários de funcionamento">O ALOVIA só oferece horários dentro das faixas cadastradas para técnicos ativos.</InfoHelp></section>
    {pending&&<LoadingState/>}
    {error&&<ErrorState onRetry={()=>{void hours.refetch();void employees.refetch()}}/>}
    {hours.data&&employees.data&&<>
      {canEdit&&<form className="settings-form settings-form--inline" onSubmit={event=>{event.preventDefault();create.mutate({employee_id:employeeId,weekday,start_time:start,end_time:end})}}>
        <label>Técnico<select required value={employeeId} onChange={event=>setEmployeeId(event.target.value)}><option value="">Selecione</option>{technicians.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Dia<select value={weekday} onChange={event=>setWeekday(Number(event.target.value))}>{weekdays.map((label,index)=><option value={index} key={label}>{label}</option>)}</select></label>
        <div className="form-grid"><label>Início<input type="time" required value={start} onChange={event=>setStart(event.target.value)}/></label><label>Fim<input type="time" required value={end} onChange={event=>setEnd(event.target.value)}/></label></div>
        {create.isError&&<MutationError/>}
        <button className="primary-button" disabled={create.isPending||!employeeId}><Plus size={18}/>{create.isPending?'Adicionando…':'Adicionar horário'}</button>
      </form>}
      <div className="settings-list">{hours.data.items.map(item=><article className="settings-row" key={item.id}><Clock3/><div><strong>{weekdays[item.weekday]} · {item.start_time.slice(0,5)}–{item.end_time.slice(0,5)}</strong><span>{item.employee_name}</span></div>{canEdit&&<button className="danger-button" type="button" disabled={remove.isPending} onClick={()=>remove.mutate(item.id)}>Remover</button>}</article>)}{!hours.data.items.length&&<p className="settings-empty">Nenhum horário configurado.</p>}</div>
      {remove.isError&&<MutationError/>}
    </>}
  </Shell>
}

function MutationError(){return <p className="form-error" role="alert">Não foi possível salvar. Tente novamente.</p>}
function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
