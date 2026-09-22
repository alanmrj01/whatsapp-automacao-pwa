import { BotOff, Clock3, Plus, Save, Trash2, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { StatusBadge } from '../../components/StatusBadge'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { useAddAssistantExclusion, useAssistantExclusions, useAutomationSettings, useBusiness, useCreateEmployee, useCreateWorkingHours, useCustomers, useDeleteWorkingHours, useEmployees, useRemoveAssistantExclusion, useUpdateAutomation, useUpdateBusiness, useUpdateEmployee, useWorkingHours } from '../operations/api'
import type { AssistantExclusion, AutomationSettings, Business, Customer, Employee, OperationalRole } from '../operations/types'

const weekdays=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
const windowOptions=[5,10,20,30,60,120,240,360,720,1440,2160]
const operationalRoles:Record<OperationalRole,string>={technician:'Técnico',assistant:'Auxiliar',administrator:'Administrador'}

function useCanConfigure() {return canConfigureWhatsApp(useAuth().membership?.role)}
function PageHeading({eyebrow,title,help}:{eyebrow:string;title:string;help:string}) {return <section className="operational-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1></div><InfoHelp title={title}>{help}</InfoHelp></section>}

export function CompanySettingsPage() {
  const query=useBusiness(),canEdit=useCanConfigure()
  if(query.isPending)return <SettingsShell><LoadingState/></SettingsShell>
  if(query.isError)return <SettingsShell><ErrorState onRetry={()=>void query.refetch()}/></SettingsShell>
  return <SettingsShell><PageHeading eyebrow="Empresa" title="Dados da empresa" help="Mantenha somente os dados da própria empresa: identificação, responsável, endereço de saída e fuso horário."/>{query.data&&<CompanyForm business={query.data} canEdit={canEdit} key={JSON.stringify(query.data)}/>}</SettingsShell>
}

function CompanyForm({business,canEdit}:{business:Business;canEdit:boolean}) {
  const update=useUpdateBusiness()
  const [name,setName]=useState(business.name)
  const [responsible,setResponsible]=useState(business.responsible_name??'')
  const [address,setAddress]=useState(business.service_origin_configured?business.service_origin_address:'')
  const [timezone,setTimezone]=useState(business.timezone)
  const [saved,setSaved]=useState(false)
  const submit=()=>update.mutate({name,responsible_name:responsible,service_origin_address:address,timezone},{onSuccess:()=>setSaved(true)})
  return <form className="settings-form" onSubmit={event=>{event.preventDefault();setSaved(false);submit()}}>
    <label>Nome da empresa<input required minLength={2} maxLength={255} value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/></label>
    <label>Responsável pela empresa<input required minLength={2} maxLength={255} value={responsible} disabled={!canEdit} onChange={event=>setResponsible(event.target.value)}/></label>
    <label>Endereço de saída da equipe<input required minLength={5} maxLength={500} value={address} disabled={!canEdit} onChange={event=>setAddress(event.target.value)} placeholder="Rua, número, bairro, cidade - UF"/><small className="settings-field-help">Usado como origem do primeiro deslocamento do técnico no dia.</small></label>
    <label>Fuso horário<input required value={timezone} disabled={!canEdit} onChange={event=>setTimezone(event.target.value)}/></label>
    {update.isError&&<MutationError/>}{saved&&<p className="form-success">Dados salvos.</p>}
    {canEdit&&<button className="primary-button" disabled={update.isPending}><Save size={18}/>{update.isPending?'Salvando…':'Salvar'}</button>}
  </form>
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
  const employees=useEmployees(),create=useCreateEmployee(),canEdit=useCanConfigure()
  const [name,setName]=useState(''),[role,setRole]=useState<OperationalRole>('technician')
  return <SettingsShell><PageHeading eyebrow="Empresa" title="Técnicos e responsáveis" help="Qualquer técnico ativo pode ser alocado a um agendamento. Não é necessário vincular profissionais a serviços específicos."/>{employees.isPending&&<LoadingState/>}{employees.isError&&<ErrorState onRetry={()=>void employees.refetch()}/>} {employees.data&&<>{canEdit&&<form className="settings-form settings-form--inline" onSubmit={event=>{event.preventDefault();create.mutate({name,operational_role:role},{onSuccess:()=>{setName('');setRole('technician')}})}}><label>Novo profissional<input required minLength={2} value={name} onChange={event=>setName(event.target.value)}/></label><label>Função<select value={role} onChange={event=>setRole(event.target.value as OperationalRole)}>{Object.entries(operationalRoles).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>{create.isError&&<MutationError/>}<button className="primary-button" disabled={create.isPending}><Plus size={18}/>{create.isPending?'Adicionando…':'Adicionar'}</button></form>}<div className="settings-list">{employees.data.items.map(item=><EmployeeEditor employee={item} canEdit={canEdit} key={`${item.id}:${item.name}:${item.operational_role}:${item.active}`}/>)}{!employees.data.items.length&&<p className="settings-empty">Nenhum profissional cadastrado.</p>}</div></>}</SettingsShell>
}

function EmployeeEditor({employee,canEdit}:{employee:Employee;canEdit:boolean}) {
  const update=useUpdateEmployee()
  const [name,setName]=useState(employee.name),[role,setRole]=useState<OperationalRole>(employee.operational_role),[saved,setSaved]=useState(false)
  const save=()=>{setSaved(false);update.mutate({id:employee.id,values:{name,operational_role:role}},{onSuccess:()=>setSaved(true)})}
  return <article className="settings-editor"><div className="settings-editor__heading"><UsersRound/><input aria-label="Nome do profissional" value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/><StatusBadge tone={employee.active?'success':'neutral'}>{employee.active?'Ativo':'Inativo'}</StatusBadge></div><label>Função operacional<select aria-label="Função operacional" value={role} disabled={!canEdit} onChange={event=>setRole(event.target.value as OperationalRole)}>{Object.entries(operationalRoles).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><p className="settings-note">O ALOVIA considera todos os técnicos ativos ao procurar disponibilidade para qualquer serviço.</p>{update.isError&&<MutationError/>}{saved&&<p className="form-success">Profissional salvo.</p>}{canEdit&&<div className="settings-editor__actions"><button className="danger-button" type="button" disabled={update.isPending} onClick={()=>update.mutate({id:employee.id,values:{active:!employee.active}})}>{employee.active?'Desativar':'Ativar'}</button><button className="compact-button" type="button" disabled={update.isPending} onClick={save}><Save size={16}/>{update.isPending?'Salvando…':'Salvar'}</button></div>}</article>
}

export function AgendaSettingsPage() {
  const business=useBusiness(),canEdit=useCanConfigure()
  return <SettingsShell>
    <PageHeading eyebrow="Agenda" title="Agenda e disponibilidade" help="Defina apenas o que quiser controlar manualmente. Campos vazios ficam em Automático pelo ALOVIA."/>
    {business.isPending&&<LoadingState/>}
    {business.isError&&<ErrorState onRetry={()=>void business.refetch()}/>}
    {business.data&&<AgendaAvailabilityForm business={business.data} canEdit={canEdit} key={JSON.stringify(business.data)}/>}
  </SettingsShell>
}

function AgendaAvailabilityForm({business,canEdit}:{business:Business;canEdit:boolean}) {
  const update=useUpdateBusiness()
  const [gap,setGap]=useState(toInput(business.default_service_gap_minutes))
  const [preparation,setPreparation]=useState(toInput(business.default_preparation_minutes))
  const [completion,setCompletion]=useState(toInput(business.default_completion_minutes))
  const [notice,setNotice]=useState(toInput(business.minimum_booking_notice_minutes))
  const [saved,setSaved]=useState(false)
  const submit=()=>update.mutate({
    default_service_gap_minutes:toOptionalNumber(gap),
    default_preparation_minutes:toOptionalNumber(preparation),
    default_completion_minutes:toOptionalNumber(completion),
    minimum_booking_notice_minutes:toOptionalNumber(notice),
  },{onSuccess:()=>setSaved(true)})
  return <form className="settings-form" onSubmit={event=>{event.preventDefault();setSaved(false);submit()}}>
    <OptionalSetting label="Intervalo entre um serviço e outro" value={gap} setValue={setGap} help="Tempo adicional entre atendimentos. Em branco, o ALOVIA decide conforme o serviço e a logística."/>
    <OptionalSetting label="Tempo de preparação" value={preparation} setValue={setPreparation} help="Tempo para organizar ferramentas e materiais. Em branco, o ALOVIA calcula automaticamente."/>
    <OptionalSetting label="Tempo após finalizar o serviço" value={completion} setValue={setCompletion} help="Tempo para guardar equipamentos e encerrar o atendimento. Em branco, o ALOVIA calcula automaticamente."/>
    <OptionalSetting label="Antecedência mínima para um novo agendamento" value={notice} setValue={setNotice} max={10080} help="Em branco, o ALOVIA decide a antecedência adequada."/>
    <p className="settings-note">O deslocamento não é um campo manual: no primeiro atendimento o ALOVIA parte do endereço da empresa; nos seguintes, considera a localização do atendimento anterior e a agenda do técnico.</p>
    {update.isError&&<MutationError/>}{saved&&<p className="form-success">Configuração da agenda salva.</p>}
    {canEdit&&<button className="primary-button" disabled={update.isPending}><Save size={18}/>{update.isPending?'Salvando…':'Salvar agenda e disponibilidade'}</button>}
  </form>
}

function OptionalSetting({label,value,setValue,help,max=50}:{label:string;value:string;setValue:(value:string)=>void;help:string;max?:number}) {
  return <label>{label}<input type="number" min={0} max={max} value={value} disabled={false} onChange={event=>setValue(event.target.value)} placeholder="Automático pelo ALOVIA"/><small className="settings-field-help">{help}</small></label>
}

function toInput(value:number|null) {return value===null?'':String(value)}
function toOptionalNumber(value:string) {return value.trim()===''?null:Number(value)}

function SettingsShell({children}:{children:React.ReactNode}) {return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
function MutationError() {return <p className="form-error" role="alert">Não foi possível salvar. Tente novamente.</p>}
