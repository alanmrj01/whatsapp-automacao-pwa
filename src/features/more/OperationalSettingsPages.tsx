import { BotOff, CalendarCog, Clock3, Plus, Save, Trash2, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { StatusBadge } from '../../components/StatusBadge'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { useAddAssistantExclusion, useAssistantExclusions, useAutomationSettings, useBusiness, useCreateEmployee, useCreateService, useCreateWorkingHours, useCustomers, useDeleteWorkingHours, useEmployees, useRemoveAssistantExclusion, useServices, useUpdateAutomation, useUpdateBusiness, useUpdateEmployee, useUpdateEmployeeServices, useUpdateService, useWorkingHours } from '../operations/api'
import type { AssistantExclusion, AutomationSettings, Business, Customer, Employee, OperationalRole, Service } from '../operations/types'

const weekdays=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
const windowOptions=[5,10,20,30,60,120,240,360,720,1440,2160]
const operationalRoles:Record<OperationalRole,string>={technician:'Técnico',assistant:'Auxiliar',administrator:'Administrador'}

function useCanConfigure() {return canConfigureWhatsApp(useAuth().membership?.role)}
function PageHeading({eyebrow,title,help}:{eyebrow:string;title:string;help:string}) {return <section className="operational-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div><InfoHelp title={title}>{help}</InfoHelp></section>}

export function CompanySettingsPage() {
  const query=useBusiness(),services=useServices(),canEdit=useCanConfigure()
  const pending=query.isPending||services.isPending,error=query.isError||services.isError
  if(pending)return <SettingsShell><LoadingState/></SettingsShell>
  if(error)return <SettingsShell><ErrorState onRetry={()=>{void query.refetch();void services.refetch()}}/></SettingsShell>
  return <SettingsShell><PageHeading eyebrow="Empresa" title="Dados da empresa" help="Dados operacionais e serviços pertencem somente à empresa ativa."/>{query.data&&<CompanyForm business={query.data} canEdit={canEdit} key={`${query.data.id}:${query.data.name}:${query.data.timezone}`}/>} {services.data&&<ServicesSettings services={services.data.items} canEdit={canEdit}/>}</SettingsShell>
}

function CompanyForm({business,canEdit}:{business:{name:string;timezone:string};canEdit:boolean}) {
  const update=useUpdateBusiness(),[name,setName]=useState(business.name),[timezone,setTimezone]=useState(business.timezone),[saved,setSaved]=useState(false)
  return <form className="settings-form" onSubmit={event=>{event.preventDefault();setSaved(false);update.mutate({name,timezone},{onSuccess:()=>setSaved(true)})}}><label>Nome<input required minLength={2} maxLength={255} value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/></label><label>Fuso horário<input required value={timezone} disabled={!canEdit} onChange={event=>setTimezone(event.target.value)}/></label>{update.isError&&<MutationError/>}{saved&&<p className="form-success">Dados salvos.</p>}{canEdit&&<button className="primary-button" disabled={update.isPending}><Save size={18}/>Salvar</button>}</form>
}

function ServicesSettings({services,canEdit}:{services:Service[];canEdit:boolean}) {
  const create=useCreateService(),[name,setName]=useState(''),[duration,setDuration]=useState(60)
  return <section aria-labelledby="company-services-title"><div className="section-title-row"><div><span className="eyebrow">Catálogo operacional</span><h2 id="company-services-title">Serviços oferecidos</h2></div><InfoHelp title="Serviços oferecidos">Estes serviços alimentam a agenda, a disponibilidade dos técnicos e o atendimento do Assistente Virtual.</InfoHelp></div>{canEdit&&<form className="settings-form settings-form--inline" onSubmit={event=>{event.preventDefault();create.mutate({name,duration_minutes:duration},{onSuccess:()=>setName('')})}}><label>Novo serviço<input required minLength={2} value={name} onChange={event=>setName(event.target.value)}/></label><label>Duração padrão (min)<input required type="number" min={1} max={1440} value={duration} onChange={event=>setDuration(Number(event.target.value))}/></label>{create.isError&&<MutationError/>}<button className="primary-button" disabled={create.isPending}><Plus size={18}/>Adicionar serviço</button></form>}<div className="settings-list">{services.map(item=><ServiceEditor service={item} canEdit={canEdit} key={`${item.id}:${item.name}:${item.duration_minutes}:${item.active}`}/>)}{!services.length&&<p className="settings-empty">Nenhum serviço cadastrado.</p>}</div></section>
}

export function WorkingHoursSettingsPage() {
  const hours=useWorkingHours(),employees=useEmployees(),create=useCreateWorkingHours(),remove=useDeleteWorkingHours(),canEdit=useCanConfigure()
  const [employeeId,setEmployeeId]=useState(''),[weekday,setWeekday]=useState(0),[start,setStart]=useState('08:00'),[end,setEnd]=useState('18:00')
  const pending=hours.isPending||employees.isPending,error=hours.isError||employees.isError
  return <SettingsShell><PageHeading eyebrow="Disponibilidade" title="Horários" help="Cada faixa pertence a um técnico da empresa ativa; ausência de faixa significa dia fechado."/>{pending&&<LoadingState/>}{error&&<ErrorState onRetry={()=>{void hours.refetch();void employees.refetch()}}/>}{hours.data&&employees.data&&<>{canEdit&&<form className="settings-form settings-form--inline" onSubmit={event=>{event.preventDefault();create.mutate({employee_id:employeeId,weekday,start_time:start,end_time:end})}}><label>Técnico<select required value={employeeId} onChange={event=>setEmployeeId(event.target.value)}><option value="">Selecione</option>{employees.data.items.filter(item=>item.active).map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Dia<select value={weekday} onChange={event=>setWeekday(Number(event.target.value))}>{weekdays.map((label,index)=><option value={index} key={label}>{label}</option>)}</select></label><div className="form-grid"><label>Início<input type="time" required value={start} onChange={event=>setStart(event.target.value)}/></label><label>Fim<input type="time" required value={end} onChange={event=>setEnd(event.target.value)}/></label></div>{create.isError&&<MutationError/>}<button className="primary-button" disabled={create.isPending}><Plus size={18}/>Adicionar faixa</button></form>} {remove.isError&&<MutationError/>}<div className="settings-list">{hours.data.items.map(item=><article className="settings-row" key={item.id}><Clock3/><div><strong>{weekdays[item.weekday]} · {item.start_time.slice(0,5)}–{item.end_time.slice(0,5)}</strong><span>{item.employee_name}</span></div>{canEdit&&<button className="danger-button" type="button" disabled={remove.isPending} onClick={()=>remove.mutate(item.id)}>Remover</button>}</article>)}{!hours.data.items.length&&<p className="settings-empty">Nenhum horário configurado.</p>}</div></>}</SettingsShell>
}

export function AutomationSettingsPage() {
  const query=useAutomationSettings(),customers=useCustomers(),exclusions=useAssistantExclusions(),canEdit=useCanConfigure()
  const pending=query.isPending||customers.isPending||exclusions.isPending
  const error=query.isError||customers.isError||exclusions.isError
  return <SettingsShell>
    <PageHeading eyebrow="Atendimento" title="Assistente Virtual" help="Configure o atendimento automático e defina contatos que devem ser atendidos somente por pessoas da equipe."/>
    {pending&&<LoadingState/>}
    {error&&<ErrorState onRetry={()=>{void query.refetch();void customers.refetch();void exclusions.refetch()}}/>}
    {query.data&&customers.data&&exclusions.data&&<>
      <AutomationForm settings={query.data} canEdit={canEdit} key={JSON.stringify(query.data)}/>
      <AssistantExclusions customers={customers.data.items} exclusions={exclusions.data} canEdit={canEdit}/>
    </>}
  </SettingsShell>
}

function AutomationForm({settings,canEdit}:{settings:AutomationSettings;canEdit:boolean}) {
  const update=useUpdateAutomation(),[enabled,setEnabled]=useState(settings.assistant_enabled),[minutes,setMinutes]=useState(settings.human_control_window_minutes),[greeting,setGreeting]=useState(settings.greeting_message),[fallback,setFallback]=useState(settings.fallback_message),[handoff,setHandoff]=useState(settings.handoff_message),[saved,setSaved]=useState(false)
  const submit=()=>update.mutate({assistant_enabled:enabled,human_control_window_minutes:minutes,greeting_message:greeting,fallback_message:fallback,handoff_message:handoff},{onSuccess:()=>setSaved(true)})
  return <form className="settings-form" onSubmit={event=>{event.preventDefault();setSaved(false);submit()}}>
    <label className="check-row"><input type="checkbox" checked={enabled} disabled={!canEdit} onChange={event=>setEnabled(event.target.checked)}/>Assistente Virtual ativo</label>
    <label>Tempo antes do Assistente retomar após atendimento humano
      <select value={minutes} disabled={!canEdit} onChange={event=>setMinutes(Number(event.target.value))}>{windowOptions.map(value=><option value={value} key={value}>{value<60?`${value} minutos`:value%1440===0?`${value/1440} dia(s)`:`${value/60} hora(s)`}</option>)}</select>
    </label>
    <label>Mensagem inicial<textarea required maxLength={1000} rows={3} value={greeting} disabled={!canEdit} onChange={event=>setGreeting(event.target.value)}/></label>
    <label>Mensagem quando não entende o pedido<textarea required maxLength={1000} rows={3} value={fallback} disabled={!canEdit} onChange={event=>setFallback(event.target.value)}/></label>
    <label>Mensagem ao encaminhar para atendimento humano<textarea required maxLength={1000} rows={3} value={handoff} disabled={!canEdit} onChange={event=>setHandoff(event.target.value)}/></label>
    <p className="settings-note">Quando alguém da equipe responde manualmente, o Assistente fica pausado nessa conversa pelo período acima. Contatos da lista abaixo nunca recebem respostas automáticas.</p>
    {update.isError&&<MutationError/>}{saved&&<p className="form-success">Configuração salva.</p>}
    {canEdit&&<button className="primary-button" disabled={update.isPending}><Save size={18}/>Salvar configurações</button>}
  </form>
}

function AssistantExclusions({customers,exclusions,canEdit}:{customers:Customer[];exclusions:AssistantExclusion[];canEdit:boolean}) {
  const add=useAddAssistantExclusion(),remove=useRemoveAssistantExclusion()
  const [customerId,setCustomerId]=useState(''),[reason,setReason]=useState('')
  const excludedCustomerIds=new Set(exclusions.map(item=>item.customer_id).filter((value):value is string=>!!value))
  const available=customers.filter(item=>!excludedCustomerIds.has(item.id))
  const submit=()=>{if(!customerId)return;add.mutate({customer_id:customerId,reason:reason.trim()||null},{onSuccess:()=>{setCustomerId('');setReason('')}})}
  return <section aria-labelledby="assistant-exclusions-title">
    <div className="section-title-row"><div><span className="eyebrow">Exceções permanentes</span><h2 id="assistant-exclusions-title">Contatos sem resposta automática</h2></div><InfoHelp title="Contatos sem resposta automática">Mensagens desses contatos continuam aparecendo normalmente em Conversas, mas o Assistente Virtual nunca responde sozinho. A equipe assume o atendimento manual.</InfoHelp></div>
    {canEdit&&<form className="settings-form settings-form--inline" onSubmit={event=>{event.preventDefault();submit()}}>
      <label>Contato
        <select required value={customerId} onChange={event=>setCustomerId(event.target.value)}>
          <option value="">Selecione um contato</option>
          {available.map(item=><option value={item.id} key={item.id}>{item.name}{item.phone?` · ${item.phone}`:''}</option>)}
        </select>
      </label>
      <label>Motivo (opcional)<input maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)} placeholder="Ex.: cliente VIP, atendimento interno, fornecedor"/></label>
      <p className="settings-note">Use esta lista para clientes, fornecedores ou contatos que devem ser tratados exclusivamente por uma pessoa.</p>
      {add.isError&&<MutationError/>}
      <button className="primary-button" disabled={add.isPending||!customerId}><BotOff size={18}/>Nunca responder automaticamente</button>
    </form>}
    <div className="settings-list">
      {exclusions.map(item=><article className="settings-row" key={item.id}><BotOff/><div><strong>{item.customer_name}</strong><span>{item.customer_phone??'Sem telefone'}{item.reason?` · ${item.reason}`:''}</span></div>{canEdit&&<button className="danger-button" type="button" disabled={remove.isPending} onClick={()=>remove.mutate(item.id)}><Trash2 size={16}/>Remover</button>}</article>)}
      {!exclusions.length&&<p className="settings-empty">Nenhum contato está bloqueado para respostas automáticas.</p>}
      {remove.isError&&<MutationError/>}
    </div>
  </section>
}

export function TeamSettingsPage() {
  const employees=useEmployees(),services=useServices(),create=useCreateEmployee(),canEdit=useCanConfigure()
  const [name,setName]=useState(''),[role,setRole]=useState<OperationalRole>('technician')
  return <SettingsShell><PageHeading eyebrow="Empresa" title="Técnicos e responsáveis" help="A função operacional organiza a equipe, mas não concede acesso ao sistema. Profissionais desativados permanecem no histórico."/>{(employees.isPending||services.isPending)&&<LoadingState/>}{(employees.isError||services.isError)&&<ErrorState onRetry={()=>{void employees.refetch();void services.refetch()}}/>}{employees.data&&services.data&&<>{canEdit&&<form className="settings-form settings-form--inline" onSubmit={event=>{event.preventDefault();create.mutate({name,operational_role:role},{onSuccess:()=>{setName('');setRole('technician')}})}}><label>Novo profissional<input required minLength={2} value={name} onChange={event=>setName(event.target.value)}/></label><label>Função<select value={role} onChange={event=>setRole(event.target.value as OperationalRole)}>{Object.entries(operationalRoles).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>{create.isError&&<MutationError/>}<button className="primary-button" disabled={create.isPending}><Plus size={18}/>Adicionar</button></form>}<div className="settings-list">{employees.data.items.map(item=><EmployeeEditor employee={item} services={services.data.items} canEdit={canEdit} key={`${item.id}:${item.name}:${item.operational_role}:${item.active}:${item.service_ids.join(',')}`}/>)}{!employees.data.items.length&&<p className="settings-empty">Nenhum profissional cadastrado.</p>}</div></>}</SettingsShell>
}

function EmployeeEditor({employee,services,canEdit}:{employee:Employee;services:Service[];canEdit:boolean}) {
  const update=useUpdateEmployee(),updateServices=useUpdateEmployeeServices()
  const [name,setName]=useState(employee.name),[role,setRole]=useState<OperationalRole>(employee.operational_role),[serviceIds,setServiceIds]=useState(employee.service_ids),[failed,setFailed]=useState(false)
  const save=async()=>{setFailed(false);try{await update.mutateAsync({id:employee.id,values:{name,operational_role:role}});await updateServices.mutateAsync({id:employee.id,service_ids:serviceIds})}catch{setFailed(true)}}
  return <article className="settings-editor"><div className="settings-editor__heading"><UsersRound/><input aria-label="Nome do profissional" value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/><StatusBadge tone={employee.active?'success':'neutral'}>{employee.active?'Ativo':'Inativo'}</StatusBadge></div><label>Função operacional<select aria-label="Função operacional" value={role} disabled={!canEdit} onChange={event=>setRole(event.target.value as OperationalRole)}>{Object.entries(operationalRoles).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><fieldset disabled={!canEdit}><legend>Serviços atendidos</legend>{services.filter(item=>item.active).map(service=><label className="check-row" key={service.id}><input type="checkbox" checked={serviceIds.includes(service.id)} onChange={event=>setServiceIds(current=>event.target.checked?[...current,service.id]:current.filter(id=>id!==service.id))}/>{service.name}</label>)}</fieldset>{(failed||update.isError||updateServices.isError)&&<MutationError/>}{canEdit&&<div className="settings-editor__actions"><button className="danger-button" type="button" onClick={()=>update.mutate({id:employee.id,values:{active:!employee.active}})}>{employee.active?'Desativar':'Ativar'}</button><button className="compact-button" type="button" disabled={update.isPending||updateServices.isPending} onClick={()=>void save()}><Save size={16}/>Salvar</button></div>}</article>
}

export function AgendaSettingsPage() {
  const business=useBusiness(),canEdit=useCanConfigure()
  return <SettingsShell>
    <PageHeading eyebrow="Agenda" title="Agenda e disponibilidade" help="Defina como os horários são oferecidos, de onde o técnico parte e quanto tempo deve ser reservado para deslocamento entre atendimentos."/>
    {business.isPending&&<LoadingState/>}
    {business.isError&&<ErrorState onRetry={()=>void business.refetch()}/>}
    {business.data&&<AgendaAvailabilityForm business={business.data} canEdit={canEdit} key={JSON.stringify(business.data)}/>}
  </SettingsShell>
}

function AgendaAvailabilityForm({business,canEdit}:{business:Business;canEdit:boolean}) {
  const update=useUpdateBusiness()
  const [interval,setInterval]=useState(business.slot_interval_minutes)
  const [origin,setOrigin]=useState(business.service_origin_address)
  const [fallbackEnabled,setFallbackEnabled]=useState(business.travel_fallback_allowed)
  const [travelMinutes,setTravelMinutes]=useState(business.default_travel_minutes??30)
  const [beforeBuffer,setBeforeBuffer]=useState(business.travel_before_buffer_minutes)
  const [afterBuffer,setAfterBuffer]=useState(business.travel_after_buffer_minutes)
  const [saved,setSaved]=useState(false)
  const submit=()=>update.mutate({
    slot_interval_minutes:interval,
    service_origin_address:origin,
    travel_fallback_allowed:fallbackEnabled,
    default_travel_minutes:fallbackEnabled?travelMinutes:business.default_travel_minutes,
    travel_before_buffer_minutes:beforeBuffer,
    travel_after_buffer_minutes:afterBuffer,
  },{onSuccess:()=>setSaved(true)})
  return <form className="settings-form" onSubmit={event=>{event.preventDefault();setSaved(false);submit()}}>
    <label>Intervalo entre horários oferecidos
      <input type="number" min={5} max={480} value={interval} disabled={!canEdit} onChange={event=>setInterval(Number(event.target.value))}/>
      <small className="settings-field-help">Define de quantos em quantos minutos podem começar novos atendimentos. Ex.: 30 min permite 08:00, 08:30, 09:00. Não altera a duração de cada serviço.</small>
    </label>

    <label>Local de saída dos técnicos
      <input required minLength={3} maxLength={500} value={origin} disabled={!canEdit} onChange={event=>setOrigin(event.target.value)} placeholder="Ex.: Rua da Oficina, 100, São José dos Campos - SP"/>
      <small className="settings-field-help">É a origem usada como referência para reservar tempo de deslocamento até o cliente.</small>
    </label>

    <label className="check-row"><input type="checkbox" checked={fallbackEnabled} disabled={!canEdit} onChange={event=>setFallbackEnabled(event.target.checked)}/>Usar tempo padrão de deslocamento quando não houver cálculo de rota disponível</label>

    {fallbackEnabled&&<label>Tempo padrão de deslocamento
      <div className="settings-number-with-unit"><input type="number" min={0} max={480} value={travelMinutes} disabled={!canEdit} onChange={event=>setTravelMinutes(Number(event.target.value))}/><span>min</span></div>
      <small className="settings-field-help">Esse tempo é reservado antes e depois do serviço para evitar agendamentos que se sobreponham ao deslocamento.</small>
    </label>}

    <div className="form-grid">
      <label>Margem antes do serviço
        <div className="settings-number-with-unit"><input type="number" min={0} max={240} value={beforeBuffer} disabled={!canEdit} onChange={event=>setBeforeBuffer(Number(event.target.value))}/><span>min</span></div>
      </label>
      <label>Margem depois do serviço
        <div className="settings-number-with-unit"><input type="number" min={0} max={240} value={afterBuffer} disabled={!canEdit} onChange={event=>setAfterBuffer(Number(event.target.value))}/><span>min</span></div>
      </label>
    </div>
    <p className="settings-note">A duração de cada atendimento continua sendo definida em Dados da empresa → Serviços oferecidos. Para o agendamento automático funcionar, o serviço também precisa estar associado a um técnico ativo com horário de trabalho configurado.</p>
    {update.isError&&<MutationError/>}{saved&&<p className="form-success">Configuração da agenda salva.</p>}
    {canEdit&&<button className="primary-button" disabled={update.isPending}><Save size={18}/>Salvar agenda e disponibilidade</button>}
  </form>
}

function ServiceEditor({service,canEdit}:{service:Service;canEdit:boolean}) {
  const update=useUpdateService();const [name,setName]=useState(service.name),[duration,setDuration]=useState(service.duration_minutes)
  return <article className="settings-editor"><div className="settings-editor__heading"><CalendarCog/><input aria-label="Nome do serviço" value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/><StatusBadge tone={service.active?'success':'neutral'}>{service.active?'Ativo':'Inativo'}</StatusBadge></div><label>Duração (minutos)<input type="number" min={1} max={1440} value={duration} disabled={!canEdit} onChange={event=>setDuration(Number(event.target.value))}/></label>{update.isError&&<MutationError/>}{canEdit&&<div className="settings-editor__actions"><button className="danger-button" type="button" onClick={()=>update.mutate({id:service.id,values:{active:!service.active}})}>{service.active?'Desativar':'Ativar'}</button><button className="compact-button" type="button" onClick={()=>update.mutate({id:service.id,values:{name,duration_minutes:duration}})}><Save size={16}/>Salvar</button></div>}</article>
}

function SettingsShell({children}:{children:React.ReactNode}) {return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
function MutationError() {return <p className="form-error" role="alert">Não foi possível salvar. Tente novamente.</p>}
