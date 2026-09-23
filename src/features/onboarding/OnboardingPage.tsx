import { ArrowLeft, ArrowRight, Check, MapPin, MessageCircleMore, Pencil, Plus, Save, Trash2, Wrench } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { PrimaryButton } from '../../components/PrimaryButton'
import { canConfigureWhatsApp } from '../auth/types'
import { SessionActions } from '../auth/SessionActions'
import { useAuth } from '../auth/useAuth'
import {
  useBusiness,
  useBusinessHours,
  useCatalogItems,
  useCompleteOnboarding,
  useCreateCatalogItem,
  useCreateEmployee,
  useCreateService,
  useDeleteCatalogItem,
  useDeleteEmployee,
  useDeleteService,
  useEmployees,
  lookupPostalCode,
  useServices,
  useSetupStatus,
  useUpdateBusiness,
  useUpdateBusinessHours,
  useUpdateCatalogItem,
  useUpdateEmployee,
  useUpdateService,
} from '../operations/api'
import type { CatalogItem } from '../operations/types'
import { ConnectWhatsAppSheet } from '../whatsapp/ConnectWhatsAppSheet'
import { ConnectionStatusBadge } from '../whatsapp/ConnectionStatusBadge'
import { useConnection } from '../whatsapp/useConnection'
import './onboarding.css'

const TOTAL_STEPS=7
const weekdays=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
const regularWeekdays=weekdays.slice(0,5)
const stepNumber={company:1,team:2,business_hours:3,services:4,materials:5,agenda:6,whatsapp:7,complete:7} as const
const unitOptions=[
  {value:'metro',label:'Por metro'},
  {value:'unidade',label:'Por unidade'},
  {value:'kit',label:'Por kit'},
  {value:'valor fixo',label:'Valor fixo'},
] as const

export function OnboardingPage(){
  const auth=useAuth()
  const setup=useSetupStatus()
  const canConfigure=canConfigureWhatsApp(auth.membership?.role)
  const [started,setStarted]=useState(false)
  const [step,setStep]=useState(1)
  const [finished,setFinished]=useState(false)
  const navigate=useNavigate()

  useEffect(()=>{
    if(setup.data&&!setup.data.onboarding_completed)setStep(stepNumber[setup.data.next_step])
  },[setup.data])

  if(setup.isPending)return <OnboardingShell><LoadingState/></OnboardingShell>
  if(setup.isError||!setup.data)return <OnboardingShell><ErrorState onRetry={()=>void setup.refetch()}/></OnboardingShell>
  if(setup.data.onboarding_completed&&!finished)return <Navigate to="/app" replace/>
  if(!canConfigure)return <OnboardingShell><div className="onboarding-message"><h1>Configuração pendente</h1><p>Um proprietário ou administrador da empresa precisa concluir a configuração inicial antes de liberar a operação.</p></div></OnboardingShell>

  if(!started&&!finished)return <OnboardingShell>
    <div className="onboarding-welcome">
      <span className="onboarding-mark"><Check/></span>
      <span className="eyebrow">Conta liberada</span>
      <h1>As funcionalidades da sua conta estão liberadas.</h1>
      <p>Complete suas informações para usar o ALOVIA com segurança no atendimento e nos agendamentos.</p>
      <strong>7 etapas · leva poucos minutos</strong>
      <PrimaryButton fullWidth icon={<ArrowRight size={19}/>} onClick={()=>setStarted(true)}>Continuar</PrimaryButton>
    </div>
  </OnboardingShell>

  if(finished)return <OnboardingShell>
    <div className="onboarding-welcome">
      <span className="onboarding-mark"><Check/></span>
      <span className="eyebrow">Configuração concluída</span>
      <h1>Tudo pronto para usar o ALOVIA.</h1>
      <p>Sua configuração inicial foi concluída. Você pode alterar qualquer uma dessas informações depois em <strong>Mais</strong>.</p>
      <PrimaryButton fullWidth onClick={()=>navigate('/app',{replace:true})}>Entrar no ALOVIA</PrimaryButton>
    </div>
  </OnboardingShell>

  return <OnboardingShell>
    <OnboardingProgress step={step}/>
    {step===1&&<CompanyStep onNext={()=>setStep(2)}/>}
    {step===2&&<TeamStep onBack={()=>setStep(1)} onNext={()=>setStep(3)}/>}
    {step===3&&<HoursStep onBack={()=>setStep(2)} onNext={()=>setStep(4)}/>}
    {step===4&&<ServicesStep onBack={()=>setStep(3)} onNext={()=>setStep(5)}/>}
    {step===5&&<MaterialsStep onBack={()=>setStep(4)} onNext={()=>setStep(6)}/>}
    {step===6&&<AgendaStep onBack={()=>setStep(5)} onNext={()=>setStep(7)}/>}
    {step===7&&<WhatsAppStep onBack={()=>setStep(6)} onFinished={()=>setFinished(true)}/>}
  </OnboardingShell>
}

function OnboardingProgress({step}:{step:number}){
  return <header className="onboarding-progress">
    <div><span className="eyebrow">Configuração inicial</span><strong>Etapa {step} de {TOTAL_STEPS}</strong></div>
    <div className="progress-track" role="progressbar" aria-valuemin={1} aria-valuemax={TOTAL_STEPS} aria-valuenow={step}><span style={{width:String(step/TOTAL_STEPS*100)+'%'}}/></div>
  </header>
}

function CompanyStep({onNext}:{onNext:()=>void}){
  const business=useBusiness(),update=useUpdateBusiness(),setup=useSetupStatus()
  const data=business.data
  const [name,setName]=useState('')
  const [responsible,setResponsible]=useState('')
  const [postalCode,setPostalCode]=useState('')
  const [street,setStreet]=useState('')
  const [neighborhood,setNeighborhood]=useState('')
  const [number,setNumber]=useState('')
  const [city,setCity]=useState('')
  const [state,setState]=useState('')
  const [timezone,setTimezone]=useState('America/Sao_Paulo')
  const [validatedPostalCode,setValidatedPostalCode]=useState('')
  const [postalStatus,setPostalStatus]=useState<'idle'|'loading'|'valid'|'invalid'>('idle')
  const [postalMessage,setPostalMessage]=useState('')
  const [attempted,setAttempted]=useState(false)

  useEffect(()=>{
    if(!data)return
    setName(data.name)
    setResponsible(data.responsible_name??'')
    setPostalCode(data.service_origin_postal_code??'')
    setStreet(data.service_origin_street??'')
    setNeighborhood(data.service_origin_neighborhood??'')
    setNumber(data.service_origin_number??'')
    setCity(data.service_origin_city??'')
    setState(data.service_origin_state??'')
    setTimezone(data.timezone)
    if(data.service_origin_postal_code&&data.service_origin_validated_at){
      setValidatedPostalCode(data.service_origin_postal_code)
      setPostalStatus('valid')
    }
  },[data])

  if(business.isPending)return <LoadingState/>
  if(business.isError||!data)return <ErrorState onRetry={()=>void business.refetch()}/>

  const postalDigits=postalCode.replace(/\D/g,'')
  const missing={
    name:name.trim().length<2,
    responsible:responsible.trim().length<2,
    postal:postalDigits.length!==8||validatedPostalCode!==postalDigits||postalStatus!=='valid',
    street:street.trim().length<2,
    neighborhood:neighborhood.trim().length<2,
    number:number.trim().length<1,
    city:city.trim().length<2,
  }

  const resolvePostalCode=async()=>{
    const digits=postalCode.replace(/\D/g,'')
    if(digits.length!==8){
      setPostalStatus('invalid')
      setValidatedPostalCode('')
      setPostalMessage('Informe um CEP com 8 números.')
      return null
    }
    setPostalStatus('loading')
    setPostalMessage('Validando CEP…')
    try{
      const address=await lookupPostalCode(digits)
      setPostalCode(formatPostalCode(address.postal_code))
      if(address.street)setStreet(address.street)
      if(address.neighborhood)setNeighborhood(address.neighborhood)
      setCity(address.city)
      setState(address.state)
      setValidatedPostalCode(address.postal_code)
      setPostalStatus('valid')
      setPostalMessage('CEP validado. Confira o número antes de continuar.')
      return address
    }catch{
      setPostalStatus('invalid')
      setValidatedPostalCode('')
      setPostalMessage('CEP não encontrado ou indisponível para validação.')
      return null
    }
  }

  return <StepCard number={1} title="Dados da empresa" description="Preencha as informações básicas que o ALOVIA usa para identificar sua operação e calcular o primeiro deslocamento do dia.">
    <form className="onboarding-form" noValidate onSubmit={async event=>{
      event.preventDefault()
      setAttempted(true)
      const lookup=validatedPostalCode===postalDigits&&postalStatus==='valid'?null:await resolvePostalCode()
      const finalPostal=lookup?.postal_code??postalDigits
      const finalStreet=(lookup?.street||street).trim()
      const finalNeighborhood=(lookup?.neighborhood||neighborhood).trim()
      const finalCity=(lookup?.city||city).trim()
      const finalState=(lookup?.state||state).trim().toUpperCase()
      if(name.trim().length<2||responsible.trim().length<2||finalPostal.length!==8||finalStreet.length<2||finalNeighborhood.length<2||!number.trim()||finalCity.length<2||finalState.length!==2)return
      await update.mutateAsync({
        name:name.trim(),
        responsible_name:responsible.trim(),
        service_origin_postal_code:finalPostal,
        service_origin_street:finalStreet,
        service_origin_neighborhood:finalNeighborhood,
        service_origin_number:number.trim(),
        service_origin_city:finalCity,
        service_origin_state:finalState,
        timezone,
      })
      await setup.refetch()
      onNext()
    }}>
      <label><RequiredLabel>Nome da empresa</RequiredLabel><input className={attempted&&missing.name?'field-invalid':''} aria-invalid={attempted&&missing.name} value={name} onChange={event=>setName(event.target.value)}/>{attempted&&missing.name&&<FieldError>Informe o nome da empresa.</FieldError>}</label>
      <label><RequiredLabel>Responsável pela empresa</RequiredLabel><input className={attempted&&missing.responsible?'field-invalid':''} aria-invalid={attempted&&missing.responsible} value={responsible} onChange={event=>setResponsible(event.target.value)}/>{attempted&&missing.responsible&&<FieldError>Informe o responsável pela empresa.</FieldError>}</label>

      <section className="company-address-section">
        <div className="company-address-heading"><MapPin size={19}/><div><strong>Endereço da Empresa</strong><span>Endereço de saída dos técnicos</span></div></div>
        <label><RequiredLabel>CEP</RequiredLabel><input inputMode="numeric" maxLength={9} className={attempted&&missing.postal?'field-invalid':''} aria-invalid={attempted&&missing.postal} value={postalCode} onChange={event=>{setPostalCode(formatPostalCode(event.target.value));setPostalStatus('idle');setValidatedPostalCode('');setPostalMessage('')}} onBlur={()=>void resolvePostalCode()} placeholder="00000-000"/>{postalMessage&&<small className={postalStatus==='invalid'?'field-error':'field-help'}>{postalMessage}</small>}</label>
        <div className="address-grid">
          <label><RequiredLabel>Rua</RequiredLabel><input className={attempted&&missing.street?'field-invalid':''} aria-invalid={attempted&&missing.street} value={street} onChange={event=>setStreet(event.target.value)}/>{attempted&&missing.street&&<FieldError>Informe a rua.</FieldError>}</label>
          <label><RequiredLabel>Bairro</RequiredLabel><input className={attempted&&missing.neighborhood?'field-invalid':''} aria-invalid={attempted&&missing.neighborhood} value={neighborhood} onChange={event=>setNeighborhood(event.target.value)}/>{attempted&&missing.neighborhood&&<FieldError>Informe o bairro.</FieldError>}</label>
          <label><RequiredLabel>Número</RequiredLabel><input className={attempted&&missing.number?'field-invalid':''} aria-invalid={attempted&&missing.number} value={number} onChange={event=>setNumber(event.target.value)} placeholder="Ex.: 160"/>{attempted&&missing.number&&<FieldError>Informe o número.</FieldError>}</label>
          <label><RequiredLabel>Cidade</RequiredLabel><input className={attempted&&missing.city?'field-invalid':''} aria-invalid={attempted&&missing.city} value={city} onChange={event=>setCity(event.target.value)}/>{attempted&&missing.city&&<FieldError>Informe a cidade.</FieldError>}</label>
        </div>
        {state&&<small className="field-help">UF identificada pelo CEP: <strong>{state}</strong></small>}
        <div className="onboarding-info onboarding-info--important"><strong>Validação do endereço</strong><span>O CEP é validado antes do salvamento e os campos de rua, bairro, cidade e UF precisam permanecer coerentes com ele. O número também é obrigatório para reduzir erros no cálculo de deslocamento.</span></div>
      </section>

      <label><RequiredLabel>Fuso horário</RequiredLabel><input value={timezone} readOnly aria-readonly="true"/></label>
      {update.isError&&<MutationError/>}
      <StepActions nextLabel={update.isPending?'Salvando…':'Salvar e ir para a próxima etapa'} nextDisabled={update.isPending||postalStatus==='loading'}/>
    </form>
  </StepCard>
}

function TeamStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}){
  const employees=useEmployees(),create=useCreateEmployee(),update=useUpdateEmployee(),remove=useDeleteEmployee(),setup=useSetupStatus()
  const [name,setName]=useState('')
  const [editingId,setEditingId]=useState<string|null>(null)
  const [editingName,setEditingName]=useState('')
  const [attempted,setAttempted]=useState(false)
  const technicians=employees.data?.items.filter(item=>item.active&&item.operational_role==='technician')??[]
  if(employees.isPending)return <LoadingState/>
  if(employees.isError||!employees.data)return <ErrorState onRetry={()=>void employees.refetch()}/>

  const add=async()=>{
    setAttempted(true)
    if(name.trim().length<2)return
    await create.mutateAsync({name:name.trim(),operational_role:'technician'})
    setName('')
    setAttempted(false)
    await setup.refetch()
  }
  const saveEdit=async(id:string)=>{
    if(editingName.trim().length<2)return
    await update.mutateAsync({id,values:{name:editingName.trim()}})
    setEditingId(null);setEditingName('')
  }
  const deleteTechnician=async(id:string)=>{
    await remove.mutateAsync(id)
    if(editingId===id){setEditingId(null);setEditingName('')}
    await setup.refetch()
  }

  return <StepCard number={2} title="Técnico responsável" description="Cadastre pelo menos um técnico. Ele poderá ser alocado a qualquer serviço; não é necessário vincular serviços ao profissional.">
    <div className="onboarding-form">
      <label><RequiredLabel>Nome do técnico</RequiredLabel><div className="inline-create"><input className={attempted&&name.trim().length<2?'field-invalid':''} aria-invalid={attempted&&name.trim().length<2} value={name} onChange={event=>setName(event.target.value)} placeholder="Nome do profissional"/><button className="compact-button" type="button" disabled={create.isPending} onClick={()=>void add()}><Plus size={16}/>Adicionar</button></div>{attempted&&name.trim().length<2&&<FieldError>Informe o nome do técnico.</FieldError>}</label>
      {technicians.length>0&&<div className="technician-list">{technicians.map(item=><div className="technician-row" key={item.id}>
        {editingId===item.id?<input className={editingName.trim().length<2?'field-invalid':''} value={editingName} onChange={event=>setEditingName(event.target.value)} autoFocus/>:<span><Check size={16}/><strong>{item.name}</strong></span>}
        <div className="row-icon-actions">
          {editingId===item.id?<button className="icon-edit-button" type="button" aria-label={`Salvar nome de ${item.name}`} disabled={update.isPending||editingName.trim().length<2} onClick={()=>void saveEdit(item.id)}><Check size={17}/></button>:<button className="icon-edit-button" type="button" aria-label={`Editar ${item.name}`} onClick={()=>{setEditingId(item.id);setEditingName(item.name)}}><Pencil size={17}/></button>}
          <button className="icon-danger-button" type="button" aria-label={`Excluir ${item.name}`} disabled={remove.isPending} onClick={()=>void deleteTechnician(item.id)}><Trash2 size={17}/></button>
        </div>
      </div>)}</div>}
      {attempted&&!technicians.length&&<p className="form-error" role="alert">Adicione pelo menos um técnico para continuar.</p>}
      {(create.isError||update.isError||remove.isError)&&<MutationError/>}
      <StepActions onBack={onBack} onNext={()=>{setAttempted(true);if(technicians.length)onNext()}} nextDisabled={create.isPending||update.isPending||remove.isPending} nextLabel="Próxima etapa"/>
    </div>
  </StepCard>
}

function HoursStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}){
  const hours=useBusinessHours(),update=useUpdateBusinessHours(),setup=useSetupStatus()
  const [selectedDays,setSelectedDays]=useState<number[]>([0,1,2,3,4])
  const [start,setStart]=useState('08:00')
  const [end,setEnd]=useState('18:00')
  const [weekendEnabled,setWeekendEnabled]=useState(false)
  const [weekendStart,setWeekendStart]=useState('08:00')
  const [weekendEnd,setWeekendEnd]=useState('12:00')
  const [attempted,setAttempted]=useState(false)

  useEffect(()=>{
    if(!hours.data)return
    if(hours.data.weekdays.length)setSelectedDays(hours.data.weekdays)
    if(hours.data.weekday_start_time)setStart(hours.data.weekday_start_time.slice(0,5))
    if(hours.data.weekday_end_time)setEnd(hours.data.weekday_end_time.slice(0,5))
    setWeekendEnabled(hours.data.weekend_holiday_enabled)
    if(hours.data.weekend_holiday_start_time)setWeekendStart(hours.data.weekend_holiday_start_time.slice(0,5))
    if(hours.data.weekend_holiday_end_time)setWeekendEnd(hours.data.weekend_holiday_end_time.slice(0,5))
  },[hours.data])

  if(hours.isPending)return <LoadingState/>
  if(hours.isError)return <ErrorState onRetry={()=>void hours.refetch()}/>

  const toggleDay=(day:number)=>setSelectedDays(current=>current.includes(day)?current.filter(item=>item!==day):[...current,day].sort())
  const valid=selectedDays.length>0&&!!start&&!!end&&end>start&&(!weekendEnabled||!!weekendStart&&!!weekendEnd&&weekendEnd>weekendStart)
  const save=async()=>{
    setAttempted(true)
    if(!valid)return
    await update.mutateAsync({
      weekdays:selectedDays,
      weekday_start_time:start,
      weekday_end_time:end,
      weekend_holiday_enabled:weekendEnabled,
      weekend_holiday_start_time:weekendEnabled?weekendStart:null,
      weekend_holiday_end_time:weekendEnabled?weekendEnd:null,
    })
    await setup.refetch()
    onNext()
  }

  return <StepCard number={3} title="Horários de funcionamento" description="Defina quando a empresa atende. Esta etapa representa o horário da operação — não a escala individual de cada técnico.">
    <div className="onboarding-form">
      <fieldset className={attempted&&!selectedDays.length?'onboarding-fieldset fieldset-invalid':'onboarding-fieldset'}>
        <legend><RequiredLabel>Dias da semana</RequiredLabel></legend>
        <div className="weekday-selector">
          {regularWeekdays.map((label,index)=><label className={selectedDays.includes(index)?'weekday-chip is-selected':'weekday-chip'} key={label}><input type="checkbox" checked={selectedDays.includes(index)} onChange={()=>toggleDay(index)}/><span>{label}</span></label>)}
        </div>
        <button className="text-button" type="button" onClick={()=>setSelectedDays([0,1,2,3,4])}>Selecionar segunda a sexta</button>
        {attempted&&!selectedDays.length&&<FieldError>Selecione pelo menos um dia.</FieldError>}
      </fieldset>
      <div className="form-grid"><label><RequiredLabel>Início do atendimento</RequiredLabel><input className={attempted&&!start?'field-invalid':''} type="time" value={start} onChange={event=>setStart(event.target.value)}/></label><label><RequiredLabel>Fim do atendimento</RequiredLabel><input className={attempted&&(!end||end<=start)?'field-invalid':''} type="time" value={end} onChange={event=>setEnd(event.target.value)}/>{attempted&&end<=start&&<FieldError>O fim precisa ser depois do início.</FieldError>}</label></div>
      <label className="onboarding-choice">
        <input type="checkbox" checked={weekendEnabled} onChange={event=>setWeekendEnabled(event.target.checked)}/>
        <span><strong>Também atendemos em finais de semana e feriados nacionais</strong><small>Use um horário específico para sábados, domingos e feriados nacionais reconhecidos pelo ALOVIA.</small></span>
      </label>
      {weekendEnabled&&<div className="form-grid"><label><RequiredLabel>Início — finais de semana/feriados</RequiredLabel><input className={attempted&&!weekendStart?'field-invalid':''} type="time" value={weekendStart} onChange={event=>setWeekendStart(event.target.value)}/></label><label><RequiredLabel>Fim — finais de semana/feriados</RequiredLabel><input className={attempted&&(!weekendEnd||weekendEnd<=weekendStart)?'field-invalid':''} type="time" value={weekendEnd} onChange={event=>setWeekendEnd(event.target.value)}/>{attempted&&weekendEnd<=weekendStart&&<FieldError>O fim precisa ser depois do início.</FieldError>}</label></div>}
      {update.isError&&<MutationError/>}
      <StepActions onBack={onBack} onNext={save} nextDisabled={update.isPending} nextLabel={update.isPending?'Salvando…':'Salvar e continuar'}/>
    </div>
  </StepCard>
}

type ServiceDraft

type ServiceDraft={name:string;duration:string;price:string}
function ServicesStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}){
  const services=useServices(),create=useCreateService(),update=useUpdateService(),remove=useDeleteService(),setup=useSetupStatus()
  const [drafts,setDrafts]=useState<Record<string,ServiceDraft>>({})
  const [adding,setAdding]=useState(false)
  const [newName,setNewName]=useState('')
  const [newDuration,setNewDuration]=useState('60')
  const [newPrice,setNewPrice]=useState('')
  const activeServices=useMemo(()=>services.data?.items.filter(item=>item.active)??[],[services.data])

  useEffect(()=>{
    if(!services.data)return
    setDrafts(Object.fromEntries(services.data.items.filter(item=>item.active).map(item=>[item.id,{name:item.name,duration:String(item.duration_minutes),price:item.price==null?'':String(item.price)}])))
  },[services.data])

  if(services.isPending)return <LoadingState/>
  if(services.isError||!services.data)return <ErrorState onRetry={()=>void services.refetch()}/>

  const add=async()=>{
    const duration=Number(newDuration)
    const price=parseMoney(newPrice)
    if(!newName.trim()||!Number.isFinite(duration)||duration<=0||price===null)return
    await create.mutateAsync({name:newName.trim(),duration_minutes:duration,price})
    setNewName('');setNewDuration('60');setNewPrice('');setAdding(false)
  }
  const save=async()=>{
    for(const service of activeServices){
      const draft=drafts[service.id]
      if(!draft)continue
      const duration=Number(draft.duration),price=parseMoney(draft.price)
      if(!draft.name.trim()||!Number.isFinite(duration)||duration<=0||price===null)continue
      await update.mutateAsync({id:service.id,values:{name:draft.name.trim(),duration_minutes:duration,price}})
    }
    await setup.refetch()
  }

  return <StepCard number={4} title="Catálogo de serviços" description="Revise os serviços que sua empresa realmente oferece. Nome, preço e duração média ajudam o ALOVIA a entender o pedido e montar a agenda corretamente.">
    <div className="catalog-toolbar"><button className="compact-button" type="button" onClick={()=>setAdding(value=>!value)}><Plus size={16}/>Adicionar serviço</button></div>
    {adding&&<div className="catalog-add-card">
      <label>Serviço<input value={newName} onChange={event=>setNewName(event.target.value)} placeholder="Ex.: Instalação de split"/></label>
      <label>Duração média<div className="input-with-unit"><input type="number" min={1} value={newDuration} onChange={event=>setNewDuration(event.target.value)}/><span>min</span></div></label>
      <label>Preço (R$)<input inputMode="decimal" value={newPrice} onChange={event=>setNewPrice(event.target.value)} placeholder="0,00"/></label>
      <button className="primary-button" type="button" disabled={create.isPending||!newName.trim()||!newPrice.trim()} onClick={()=>void add()}>{create.isPending?'Adicionando…':'Adicionar à lista'}</button>
    </div>}
    <div className="onboarding-info"><strong>Reconhecimento automático</strong><span>Ao salvar, o ALOVIA gera e atualiza frases de referência para reconhecer como clientes podem pedir cada serviço.</span></div>
    <div className="onboarding-service-list">
      {activeServices.map(service=>{
        const draft=drafts[service.id]??{name:service.name,duration:String(service.duration_minutes),price:service.price==null?'':String(service.price)}
        return <article className="onboarding-item-row onboarding-item-row--editable" key={service.id}>
          <label>Serviço<input value={draft.name} onChange={event=>setDrafts(current=>({...current,[service.id]:{...draft,name:event.target.value}}))}/></label>
          <label>Duração média<div className="input-with-unit"><input type="number" min={1} max={1440} value={draft.duration} onChange={event=>setDrafts(current=>({...current,[service.id]:{...draft,duration:event.target.value}}))}/><span>min</span></div></label>
          <label>Preço (R$)<input inputMode="decimal" value={draft.price} onChange={event=>setDrafts(current=>({...current,[service.id]:{...draft,price:event.target.value}}))} placeholder="0,00"/></label>
          <button className="icon-danger-button" type="button" aria-label={`Excluir ${service.name}`} disabled={remove.isPending} onClick={()=>remove.mutate(service.id)}><Trash2 size={18}/></button>
        </article>
      })}
      {!activeServices.length&&<p className="settings-empty">Adicione pelo menos um serviço oferecido pela empresa.</p>}
    </div>
    {(create.isError||update.isError||remove.isError)&&<MutationError/>}
    <button className="primary-button onboarding-save-all" type="button" disabled={update.isPending||!activeServices.length} onClick={()=>void save()}><Save size={17}/>{update.isPending?'Salvando…':'Salvar serviços'}</button>
    <StepActions onBack={onBack} onNext={onNext} nextDisabled={!setup.data?.services}/>
  </StepCard>
}

type MaterialDraft={name:string;description:string;price:string;unit:string;kind:'material'|'equipment'}
function MaterialsStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}){
  const items=useCatalogItems(),business=useBusiness(),create=useCreateCatalogItem(),update=useUpdateCatalogItem(),remove=useDeleteCatalogItem(),updateBusiness=useUpdateBusiness(),setup=useSetupStatus()
  const [drafts,setDrafts]=useState<Record<string,MaterialDraft>>({})
  const [adding,setAdding]=useState(false)
  const [newKind,setNewKind]=useState<'material'|'equipment'>('material')
  const [newName,setNewName]=useState('')
  const [newDescription,setNewDescription]=useState('')
  const [newPrice,setNewPrice]=useState('')
  const [newUnit,setNewUnit]=useState('unidade')
  const activeItems=useMemo(()=>items.data?.items.filter(item=>item.active)??[],[items.data])

  useEffect(()=>{
    if(!items.data)return
    setDrafts(Object.fromEntries(items.data.items.filter(item=>item.active).map(item=>[item.id,{name:item.name,description:item.description??'',price:item.price==null?'':String(item.price),unit:item.unit_label??'unidade',kind:item.kind}])))
  },[items.data])

  if(items.isPending||business.isPending)return <LoadingState/>
  if(items.isError||business.isError||!items.data||!business.data)return <ErrorState onRetry={()=>{void items.refetch();void business.refetch()}}/>
  const optedOut=business.data.materials_catalog_reviewed&&!activeItems.length

  const toggleOptOut=async(checked:boolean)=>{
    if(checked){
      for(const item of activeItems)await remove.mutateAsync(item.id)
      await updateBusiness.mutateAsync({materials_catalog_reviewed:true})
    }else{
      await updateBusiness.mutateAsync({materials_catalog_reviewed:false})
    }
    await items.refetch();await setup.refetch()
  }
  const add=async()=>{
    const price=parseMoney(newPrice)
    if(!newName.trim()||price===null)return
    await create.mutateAsync({kind:newKind,name:newName.trim(),description:newDescription.trim()||null,price,unit_label:newUnit})
    setNewName('');setNewDescription('');setNewPrice('');setNewUnit('unidade');setAdding(false)
    await setup.refetch()
  }
  const save=async()=>{
    for(const item of activeItems){
      const draft=drafts[item.id]
      if(!draft)continue
      const price=parseMoney(draft.price)
      if(!draft.name.trim()||price===null)continue
      await update.mutateAsync({id:item.id,values:{kind:draft.kind,name:draft.name.trim(),description:draft.description.trim()||null,price,unit_label:draft.unit}})
    }
    await updateBusiness.mutateAsync({materials_catalog_reviewed:true})
    await setup.refetch()
  }

  return <StepCard number={5} title="Materiais e equipamentos" description="Mantenha aqui somente o que sua empresa cobra separadamente. Você pode editar os itens sugeridos, excluir o que não usa e criar novos itens.">
    <label className="onboarding-choice">
      <input type="checkbox" checked={optedOut} disabled={updateBusiness.isPending||remove.isPending} onChange={event=>void toggleOptOut(event.target.checked)}/>
      <span><strong>Minha empresa não cobra materiais adicionais separadamente</strong><small>Ao selecionar, a lista fica vazia. A opção de adicionar materiais e equipamentos continuará disponível depois.</small></span>
    </label>
    <div className="catalog-toolbar"><button className="compact-button" type="button" onClick={()=>setAdding(value=>!value)}><Plus size={16}/>Adicionar material ou equipamento</button></div>
    {adding&&<div className="catalog-add-card">
      <label>Tipo<select value={newKind} onChange={event=>setNewKind(event.target.value as 'material'|'equipment')}><option value="material">Material</option><option value="equipment">Equipamento</option></select></label>
      <label>Nome<input value={newName} onChange={event=>setNewName(event.target.value)} placeholder="Ex.: Tubulação adicional"/></label>
      <label>Descrição<input value={newDescription} onChange={event=>setNewDescription(event.target.value)} placeholder="Quando é usado ou cobrado"/></label>
      <label>Preço (R$)<input inputMode="decimal" value={newPrice} onChange={event=>setNewPrice(event.target.value)} placeholder="0,00"/></label>
      <label>Unidade<select value={newUnit} onChange={event=>setNewUnit(event.target.value)}>{unitOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      <button className="primary-button" type="button" disabled={create.isPending||!newName.trim()||!newPrice.trim()} onClick={()=>void add()}>{create.isPending?'Adicionando…':'Adicionar à lista'}</button>
    </div>}
    <div className="onboarding-service-list">
      {activeItems.map(item=>{
        const draft=drafts[item.id]??materialDraft(item)
        return <article className="onboarding-item-row onboarding-item-row--material" key={item.id}>
          <label>Item<input value={draft.name} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,name:event.target.value}}))}/><small>{draft.kind==='material'?'Material':'Equipamento'}</small></label>
          <label>Descrição<input value={draft.description} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,description:event.target.value}}))}/></label>
          <label>Preço (R$)<input inputMode="decimal" value={draft.price} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,price:event.target.value}}))} placeholder="0,00"/></label>
          <label>Unidade<select value={draft.unit} onChange={event=>setDrafts(current=>({...current,[item.id]:{...draft,unit:event.target.value}}))}>{unitOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <button className="icon-danger-button" type="button" aria-label={`Excluir ${item.name}`} disabled={remove.isPending} onClick={()=>remove.mutate(item.id)}><Trash2 size={18}/></button>
        </article>
      })}
      {!activeItems.length&&<p className="settings-empty">{optedOut?'Nenhum material é cobrado separadamente. Você ainda pode adicionar um item quando precisar.':'Nenhum material ou equipamento na lista.'}</p>}
    </div>
    {(create.isError||update.isError||remove.isError||updateBusiness.isError)&&<MutationError/>}
    {!!activeItems.length&&<button className="primary-button onboarding-save-all" type="button" disabled={update.isPending} onClick={()=>void save()}><Save size={17}/>{update.isPending?'Salvando…':'Salvar itens'}</button>}
    <StepActions onBack={onBack} onNext={onNext} nextDisabled={!setup.data?.materials}/>
  </StepCard>
}

function AgendaStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}){
  const business=useBusiness(),update=useUpdateBusiness()
  const [interval,setInterval]=useState('')
  const [preparation,setPreparation]=useState('')
  const [finishing,setFinishing]=useState('')
  const [noticeHours,setNoticeHours]=useState('')
  useEffect(()=>{
    if(!business.data)return
    setInterval(numberOrBlank(business.data.interval_between_services_minutes))
    setPreparation(numberOrBlank(business.data.preparation_minutes))
    setFinishing(numberOrBlank(business.data.finishing_minutes))
    setNoticeHours(business.data.minimum_booking_notice_minutes==null?'':String(business.data.minimum_booking_notice_minutes/60))
  },[business.data])
  if(business.isPending)return <LoadingState/>
  return <StepCard number={6} title="Agenda e disponibilidade" description="Você pode deixar estes campos em branco. Nesse caso, o ALOVIA calcula automaticamente margens operacionais com base no serviço e na logística.">
    <form className="onboarding-form" onSubmit={async event=>{
      event.preventDefault()
      const hours=optionalNumber(noticeHours)
      await update.mutateAsync({
        interval_between_services_minutes:optionalNumber(interval),
        preparation_minutes:optionalNumber(preparation),
        finishing_minutes:optionalNumber(finishing),
        minimum_booking_notice_minutes:hours==null?null:Math.round(hours*60),
        agenda_preferences_reviewed:true,
      })
      onNext()
    }}>
      <AutoInput label="Intervalo entre um serviço e outro" value={interval} setValue={setInterval} unit="minutos"/>
      <AutoInput label="Tempo de preparação" value={preparation} setValue={setPreparation} unit="minutos"/>
      <AutoInput label="Tempo após finalizar o serviço" value={finishing} setValue={setFinishing} unit="minutos"/>
      <AutoInput label="Antecedência mínima para agendamento" value={noticeHours} setValue={setNoticeHours} unit="horas" step="0.5"/>
      <div className="onboarding-info"><strong>Automático pelo ALOVIA</strong><span>Campo em branco = cálculo automático. O deslocamento é calculado separadamente e não entra no limite dos tempos operacionais automáticos.</span></div>
      <StepActions onBack={onBack} nextDisabled={update.isPending} nextLabel={update.isPending?'Salvando…':'Salvar e continuar'}/>
    </form>
  </StepCard>
}

function WhatsAppStep({onBack,onFinished}:{onBack:()=>void;onFinished:()=>void}){
  const connection=useConnection()
  const setup=useSetupStatus()
  const complete=useCompleteOnboarding()
  const [open,setOpen]=useState(false)
  const connected=connection.data?.status==='connected'||setup.data?.whatsapp===true
  const displayedStatus=connected?'connected':connection.data?.status??'disconnected'
  return <StepCard number={7} title="Conectar WhatsApp" description="Última etapa. Conecte o número que será usado pelo ALOVIA para receber conversas e criar agendamentos.">
    <div className="onboarding-info onboarding-info--important"><strong>Se você quer continuar usando o mesmo número no celular</strong><span>Esse número precisa estar ativo no aplicativo WhatsApp Business para usar o modo de coexistência. Se for um número novo ou exclusivo para automação, escolha o caminho exclusivo durante a conexão.</span></div>
    {connection.isPending&&!connected&&<LoadingState/>}
    {connection.isError&&!connected&&<ErrorState onRetry={()=>void connection.refetch()}/>}
    {(connection.data||connected)&&<div className="onboarding-whatsapp">
      <MessageCircleMore size={34}/>
      <ConnectionStatusBadge status={displayedStatus}/>
      {connection.data?.display_phone_number&&<strong>{connection.data.display_phone_number}</strong>}
      {!connected&&<PrimaryButton fullWidth icon={<ArrowRight size={18}/>} onClick={()=>setOpen(true)}>Conectar WhatsApp</PrimaryButton>}
      {connected&&<p className="form-success">WhatsApp conectado. Sua configuração inicial está pronta para ser finalizada.</p>}
    </div>}
    {complete.isError&&<MutationError/>}
    <StepActions onBack={onBack} onNext={async()=>{
      const result=await complete.mutateAsync()
      if(!result.onboarding_completed||!result.onboarding_completed_at)throw new Error('Onboarding was not persisted')
      onFinished()
    }} nextDisabled={!connected||complete.isPending} nextLabel={complete.isPending?'Finalizando…':'Finalizar configuração'}/>
    <ConnectWhatsAppSheet open={open} onClose={()=>{setOpen(false);void connection.refetch()}}/>
  </StepCard>
}

function StepCard({number,title,description,children}:{number:number;title:string;description:string;children:React.ReactNode}){
  return <main className="onboarding-card"><span className="eyebrow">Etapa {number}</span><h1>{title}</h1><div className="onboarding-description">{description}</div>{children}</main>
}

function StepActions({onBack,onNext,nextDisabled=false,nextLabel='Próxima etapa'}:{onBack?:()=>void;onNext?:()=>void|Promise<void>;nextDisabled?:boolean;nextLabel?:string}){
  return <div className="onboarding-actions">{onBack&&<button className="compact-button" type="button" onClick={onBack}><ArrowLeft size={17}/>Voltar</button>}<button className="primary-button" type={onNext?'button':'submit'} disabled={nextDisabled} onClick={onNext?()=>void onNext():undefined}>{nextLabel}<ArrowRight size={17}/></button></div>
}

function AutoInput({label,value,setValue,unit,step='1'}:{label:string;value:string;setValue:(value:string)=>void;unit:string;step?:string}){
  return <label>{label}<div className="input-with-unit"><input type="number" min={0} step={step} value={value} onChange={event=>setValue(event.target.value)} placeholder="Automático"/><span>{unit}</span></div><small className="settings-field-help">{value.trim()===''?'Automático pelo ALOVIA. ':''}Você pode definir manualmente se preferir.</small></label>
}

function materialDraft(item:CatalogItem):MaterialDraft{return {name:item.name,description:item.description??'',price:item.price==null?'':String(item.price),unit:item.unit_label??'unidade',kind:item.kind}}
function parseMoney(value:string){if(!value.trim())return null;const parsed=Number(value.replace(',','.'));return Number.isFinite(parsed)&&parsed>=0?parsed:null}
function optionalNumber(value:string){if(value.trim()==='')return null;const parsed=Number(value);return Number.isFinite(parsed)&&parsed>=0?parsed:null}
function numberOrBlank(value:number|null){return value==null?'':String(value)}
function MutationError(){return <p className="form-error" role="alert">Não foi possível concluir esta ação. Revise os dados e tente novamente.</p>}
function OnboardingShell({children}:{children:React.ReactNode}){return <div className="onboarding-shell"><div className="onboarding-brand"><span><Wrench size={20}/><strong>ALOVIA</strong></span><SessionActions/></div>{children}</div>}
