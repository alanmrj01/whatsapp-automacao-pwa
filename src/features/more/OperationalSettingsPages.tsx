import { CalendarCog, Clock3, Plus, Save, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { StatusBadge } from '../../components/StatusBadge'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { useAutomationSettings, useBusiness, useCreateEmployee, useCreateService, useCreateWorkingHours, useDeleteWorkingHours, useEmployees, useServices, useUpdateAutomation, useUpdateBusiness, useUpdateEmployee, useUpdateEmployeeServices, useUpdateService, useWorkingHours } from '../operations/api'
import type { Employee, Service } from '../operations/types'

const weekdays=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
const windowOptions=[5,10,20,30,60,120,240,360,720,1440,2160]

function useCanConfigure() {return canConfigureWhatsApp(useAuth().membership?.role)}
function PageHeading({eyebrow,title,help}:{eyebrow:string;title:string;help:string}) {return <section className="operational-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div><InfoHelp title={title}>{help}</InfoHelp></section>}

export function CompanySettingsPage() {
  const query=useBusiness(),canEdit=useCanConfigure()
  if(query.isPending)return <SettingsShell><LoadingState/></SettingsShell>
  if(query.isError)return <SettingsShell><ErrorState onRetry={()=>void query.refetch()}/></SettingsShell>
  return <SettingsShell><PageHeading eyebrow="Empresa" title="Dados da empresa" help="Nome e fuso são aplicados somente à empresa ativa."/>{query.data&&<CompanyForm business={query.data} canEdit={canEdit} key={`${query.data.id}:${query.data.name}:${query.data.timezone}`}/>}</SettingsShell>
}

function CompanyForm({business,canEdit}:{business:{name:string;timezone:string};canEdit:boolean}) {
  const update=useUpdateBusiness(),[name,setName]=useState(business.name),[timezone,setTimezone]=useState(business.timezone),[saved,setSaved]=useState(false)
  return <form className="settings-form" onSubmit={event=>{event.preventDefault();setSaved(false);update.mutate({name,timezone},{onSuccess:()=>setSaved(true)})}}><label>Nome<input required minLength={2} maxLength={255} value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/></label><label>Fuso horário<input required value={timezone} disabled={!canEdit} onChange={event=>setTimezone(event.target.value)}/></label>{update.isError&&<MutationError/>}{saved&&<p className="form-success">Dados salvos.</p>}{canEdit&&<button className="primary-button" disabled={update.isPending}><Save size={18}/>Salvar</button>}</form>
}

export function WorkingHoursSettingsPage() {
  const hours=useWorkingHours(),employees=useEmployees(),create=useCreateWorkingHours(),remove=useDeleteWorkingHours(),canEdit=useCanConfigure()
  const [employeeId,setEmployeeId]=useState(''),[weekday,setWeekday]=useState(0),[start,setStart]=useState('08:00'),[end,setEnd]=useState('18:00')
  const pending=hours.isPending||employees.isPending,error=hours.isError||employees.isError
  return <SettingsShell><PageHeading eyebrow="Disponibilidade" title="Horários" help="Cada faixa pertence a um técnico da empresa ativa; ausência de faixa significa dia fechado."/>{pending&&<LoadingState/>}{error&&<ErrorState onRetry={()=>{void hours.refetch();void employees.refetch()}}/>}{hours.data&&employees.data&&<>{canEdit&&<form className="settings-form settings-form--inline" onSubmit={event=>{event.preventDefault();create.mutate({employee_id:employeeId,weekday,start_time:start,end_time:end})}}><label>Técnico<select required value={employeeId} onChange={event=>setEmployeeId(event.target.value)}><option value="">Selecione</option>{employees.data.items.filter(item=>item.active).map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Dia<select value={weekday} onChange={event=>setWeekday(Number(event.target.value))}>{weekdays.map((label,index)=><option value={index} key={label}>{label}</option>)}</select></label><div className="form-grid"><label>Início<input type="time" required value={start} onChange={event=>setStart(event.target.value)}/></label><label>Fim<input type="time" required value={end} onChange={event=>setEnd(event.target.value)}/></label></div>{create.isError&&<MutationError/>}<button className="primary-button" disabled={create.isPending}><Plus size={18}/>Adicionar faixa</button></form>} {remove.isError&&<MutationError/>}<div className="settings-list">{hours.data.items.map(item=><article className="settings-row" key={item.id}><Clock3/><div><strong>{weekdays[item.weekday]} · {item.start_time.slice(0,5)}–{item.end_time.slice(0,5)}</strong><span>{item.employee_name}</span></div>{canEdit&&<button className="danger-button" type="button" disabled={remove.isPending} onClick={()=>remove.mutate(item.id)}>Remover</button>}</article>)}{!hours.data.items.length&&<p className="settings-empty">Nenhum horário configurado.</p>}</div></>}</SettingsShell>
}

export function AutomationSettingsPage() {
  const query=useAutomationSettings(),canEdit=useCanConfigure()
  return <SettingsShell><PageHeading eyebrow="Atendimento" title="Automação" help="Esta tela expõe somente a janela de controle humano que o motor atual realmente suporta."/>{query.isPending&&<LoadingState/>}{query.isError&&<ErrorState onRetry={()=>void query.refetch()}/>} {query.data&&<AutomationForm minutesValue={query.data.human_control_window_minutes} canEdit={canEdit} key={query.data.human_control_window_minutes}/>}</SettingsShell>
}

function AutomationForm({minutesValue,canEdit}:{minutesValue:number;canEdit:boolean}) {
  const update=useUpdateAutomation(),[minutes,setMinutes]=useState(minutesValue),[saved,setSaved]=useState(false)
  return <form className="settings-form" onSubmit={event=>{event.preventDefault();setSaved(false);update.mutate(minutes,{onSuccess:()=>setSaved(true)})}}><label>Tempo de controle humano<select value={minutes} disabled={!canEdit} onChange={event=>setMinutes(Number(event.target.value))}>{windowOptions.map(value=><option value={value} key={value}>{value<60?`${value} minutos`:value%1440===0?`${value/1440} dia(s)`:`${value/60} hora(s)`}</option>)}</select></label><p className="settings-note">Uma nova ação manual renova esta janela. Depois dela, a automação pode retomar conforme as políticas existentes.</p>{update.isError&&<MutationError/>}{saved&&<p className="form-success">Configuração salva.</p>}{canEdit&&<button className="primary-button" disabled={update.isPending}><Save size={18}/>Salvar</button>}</form>
}

export function TeamSettingsPage() {
  const employees=useEmployees(),services=useServices(),create=useCreateEmployee(),canEdit=useCanConfigure()
  const [name,setName]=useState('')
  return <SettingsShell><PageHeading eyebrow="Operação" title="Equipe" help="Técnicos desativados permanecem no histórico, mas deixam de receber novos agendamentos."/>{(employees.isPending||services.isPending)&&<LoadingState/>}{(employees.isError||services.isError)&&<ErrorState onRetry={()=>{void employees.refetch();void services.refetch()}}/>}{employees.data&&services.data&&<>{canEdit&&<form className="settings-form settings-form--inline" onSubmit={event=>{event.preventDefault();create.mutate(name,{onSuccess:()=>setName('')})}}><label>Novo técnico<input required minLength={2} value={name} onChange={event=>setName(event.target.value)}/></label>{create.isError&&<MutationError/>}<button className="primary-button" disabled={create.isPending}><Plus size={18}/>Adicionar</button></form>}<div className="settings-list">{employees.data.items.map(item=><EmployeeEditor employee={item} services={services.data.items} canEdit={canEdit} key={`${item.id}:${item.name}:${item.active}:${item.service_ids.join(',')}`}/>)}{!employees.data.items.length&&<p className="settings-empty">Nenhum técnico cadastrado.</p>}</div></>}</SettingsShell>
}

function EmployeeEditor({employee,services,canEdit}:{employee:Employee;services:Service[];canEdit:boolean}) {
  const update=useUpdateEmployee(),updateServices=useUpdateEmployeeServices()
  const [name,setName]=useState(employee.name),[serviceIds,setServiceIds]=useState(employee.service_ids),[failed,setFailed]=useState(false)
  const save=async()=>{setFailed(false);try{await update.mutateAsync({id:employee.id,values:{name}});await updateServices.mutateAsync({id:employee.id,service_ids:serviceIds})}catch{setFailed(true)}}
  return <article className="settings-editor"><div className="settings-editor__heading"><UsersRound/><input aria-label="Nome do técnico" value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/><StatusBadge tone={employee.active?'success':'neutral'}>{employee.active?'Ativo':'Inativo'}</StatusBadge></div><fieldset disabled={!canEdit}><legend>Serviços atendidos</legend>{services.filter(item=>item.active).map(service=><label className="check-row" key={service.id}><input type="checkbox" checked={serviceIds.includes(service.id)} onChange={event=>setServiceIds(current=>event.target.checked?[...current,service.id]:current.filter(id=>id!==service.id))}/>{service.name}</label>)}</fieldset>{(failed||update.isError||updateServices.isError)&&<MutationError/>}{canEdit&&<div className="settings-editor__actions"><button className="danger-button" type="button" onClick={()=>update.mutate({id:employee.id,values:{active:!employee.active}})}>{employee.active?'Desativar':'Ativar'}</button><button className="compact-button" type="button" disabled={update.isPending||updateServices.isPending} onClick={()=>void save()}><Save size={16}/>Salvar</button></div>}</article>
}

export function AgendaSettingsPage() {
  const business=useBusiness(),services=useServices(),create=useCreateService(),canEdit=useCanConfigure()
  const [name,setName]=useState(''),[duration,setDuration]=useState(60)
  return <SettingsShell><PageHeading eyebrow="Catálogo e intervalos" title="Configurar agenda" help="Serviços novos começam com orçamento humano, sem inventar preço comercial."/>{(business.isPending||services.isPending)&&<LoadingState/>}{(business.isError||services.isError)&&<ErrorState onRetry={()=>{void business.refetch();void services.refetch()}}/>}{business.data&&services.data&&<><AgendaInterval intervalValue={business.data.slot_interval_minutes} canEdit={canEdit} key={business.data.slot_interval_minutes}/>{canEdit&&<form className="settings-form settings-form--inline" onSubmit={event=>{event.preventDefault();create.mutate({name,duration_minutes:duration},{onSuccess:()=>setName('')})}}><label>Novo serviço<input required minLength={2} value={name} onChange={event=>setName(event.target.value)}/></label><label>Duração (min)<input required type="number" min={1} max={1440} value={duration} onChange={event=>setDuration(Number(event.target.value))}/></label>{create.isError&&<MutationError/>}<button className="primary-button" disabled={create.isPending}><Plus size={18}/>Adicionar</button></form>}<div className="settings-list">{services.data.items.map(item=><ServiceEditor service={item} canEdit={canEdit} key={`${item.id}:${item.name}:${item.duration_minutes}:${item.active}`}/>)}</div></>}</SettingsShell>
}

function AgendaInterval({intervalValue,canEdit}:{intervalValue:number;canEdit:boolean}) {
  const update=useUpdateBusiness(),[interval,setInterval]=useState(intervalValue)
  return <form className="settings-form" onSubmit={event=>{event.preventDefault();update.mutate({slot_interval_minutes:interval})}}><label>Intervalo da grade (minutos)<input type="number" min={5} max={480} value={interval} disabled={!canEdit} onChange={event=>setInterval(Number(event.target.value))}/></label>{update.isError&&<MutationError/>}{canEdit&&<button className="primary-button" disabled={update.isPending}><Save size={18}/>Salvar intervalo</button>}</form>
}

function ServiceEditor({service,canEdit}:{service:Service;canEdit:boolean}) {
  const update=useUpdateService();const [name,setName]=useState(service.name),[duration,setDuration]=useState(service.duration_minutes)
  return <article className="settings-editor"><div className="settings-editor__heading"><CalendarCog/><input aria-label="Nome do serviço" value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/><StatusBadge tone={service.active?'success':'neutral'}>{service.active?'Ativo':'Inativo'}</StatusBadge></div><label>Duração (minutos)<input type="number" min={1} max={1440} value={duration} disabled={!canEdit} onChange={event=>setDuration(Number(event.target.value))}/></label>{update.isError&&<MutationError/>}{canEdit&&<div className="settings-editor__actions"><button className="danger-button" type="button" onClick={()=>update.mutate({id:service.id,values:{active:!service.active}})}>{service.active?'Desativar':'Ativar'}</button><button className="compact-button" type="button" onClick={()=>update.mutate({id:service.id,values:{name,duration_minutes:duration}})}><Save size={16}/>Salvar</button></div>}</article>
}

function SettingsShell({children}:{children:React.ReactNode}) {return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
function MutationError() {return <p className="form-error" role="alert">Não foi possível salvar. Tente novamente.</p>}
