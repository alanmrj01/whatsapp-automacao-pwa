import { ArrowLeft, ArrowRight, Check, MapPin, MessageCircleMore, Plus, Save, Wrench } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { PrimaryButton } from '../../components/PrimaryButton'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import {
  useBusiness,
  useCatalogItems,
  useCompleteOnboarding,
  useCreateEmployee,
  useCreateWorkingHours,
  useEmployees,
  useServices,
  useSetupStatus,
  useUpdateBusiness,
  useUpdateCatalogItem,
  useUpdateService,
  useWorkingHours,
} from '../operations/api'
import type { Business, CatalogItem, Employee, Service } from '../operations/types'
import { ConnectWhatsAppSheet } from '../whatsapp/ConnectWhatsAppSheet'
import { ConnectionStatusBadge } from '../whatsapp/ConnectionStatusBadge'
import { useConnection } from '../whatsapp/useConnection'
import './onboarding.css'

const TOTAL_STEPS=7
const weekdays=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
const stepNumber={company:1,team:2,business_hours:3,services:4,materials:5,agenda:6,whatsapp:7,complete:7} as const

export function OnboardingPage(){
  const auth=useAuth()
  const setup=useSetupStatus()
  const canConfigure=canConfigureWhatsApp(auth.membership?.role)
  const [started,setStarted]=useState(false)
  const [step,setStep]=useState(1)
  const [finished,setFinished]=useState(false)
  const navigate=useNavigate()

  useEffect(()=>{
    if(setup.data&&!setup.data.onboarding_completed){
      setStep(stepNumber[setup.data.next_step])
    }
  },[setup.data])

  if(setup.isPending)return <OnboardingShell><LoadingState/></OnboardingShell>
  if(setup.isError||!setup.data)return <OnboardingShell><ErrorState onRetry={()=>void setup.refetch()}/></OnboardingShell>
  if(setup.data.onboarding_completed&&!finished){
    navigate('/app',{replace:true})
    return null
  }
  if(!canConfigure)return <OnboardingShell><div className="onboarding-message"><h1>Configuração pendente</h1><p>Um proprietário ou administrador da empresa precisa concluir a configuração inicial antes de liberar a operação.</p></div></OnboardingShell>

  if(!started&&!finished)return <OnboardingShell>
    <div className="onboarding-welcome">
      <span className="onboarding-mark"><Check/></span>
      <span className="eyebrow">Conta liberada</span>
      <h1>As funcionalidades da sua conta estão liberadas.</h1>
      <p>Complete suas informações para usar o ALOVIA com segurança no atendimento e nos agendamentos.</p>
      <strong>7 etapas · você não precisa procurar configurações pelo aplicativo</strong>
      <PrimaryButton fullWidth icon={<ArrowRight size={19}/>} onClick={()=>setStarted(true)}>Continuar</PrimaryButton>
    </div>
  </OnboardingShell>

  if(finished)return <OnboardingShell>
    <div className="onboarding-welcome">
      <span className="onboarding-mark"><Check/></span>
      <span className="eyebrow">Configuração concluída</span>
      <h1>Tudo pronto para usar o ALOVIA.</h1>
      <p>Você pode alterar qualquer uma dessas informações depois em <strong>Mais</strong>.</p>
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
  const [address,setAddress]=useState('')
  const [timezone,setTimezone]=useState('America/Sao_Paulo')

  useEffect(()=>{
    if(!data)return
    setName(data.name)
    setResponsible(data.responsible_name??'')
    setAddress(data.service_origin_address??'')
    setTimezone(data.timezone)
  },[data])

  if(business.isPending)return <LoadingState/>
  if(business.isError||!data)return <ErrorState onRetry={()=>void business.refetch()}/>
  const valid=name.trim().length>=2&&responsible.trim().length>=2&&address.trim().length>=5
  return <StepCard number={1} title="Dados da empresa" description="Preencha as informações básicas que o ALOVIA usa para identificar sua operação e calcular o primeiro deslocamento do dia.">
    <form className="onboarding-form" onSubmit={async event=>{
      event.preventDefault()
      if(!valid)return
      await update.mutateAsync({name:name.trim(),responsible_name:responsible.trim(),service_origin_address:address.trim(),timezone})
      await setup.refetch()
      onNext()
    }}>
      <label>Nome da empresa<input required value={name} onChange={event=>setName(event.target.value)}/></label>
      <label>Responsável pela empresa<input required value={responsible} onChange={event=>setResponsible(event.target.value)}/></label>
      <label>Endereço de saída para o primeiro atendimento<div className="field-with-icon"><MapPin size={18}/><input required value={address} onChange={event=>setAddress(event.target.value)} placeholder="Rua, número, bairro, cidade - UF"/></div></label>
      <label>Fuso horário<input required value={timezone} onChange={event=>setTimezone(event.target.value)}/></label>
      {update.isError&&<MutationError/>}
      <StepActions nextLabel={update.isPending?'Salvando…':'Salvar e ir para a próxima etapa'} nextDisabled={!valid||update.isPending}/>
    </form>
  </StepCard>
}

function TeamStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}){
  const employees=useEmployees(),create=useCreateEmployee(),setup=useSetupStatus()
  const [name,setName]=useState('')
  const technicians=employees.data?.items.filter(item=>item.active&&item.operational_role==='technician')??[]
  if(employees.isPending)return <LoadingState/>
  if(employees.isError||!employees.data)return <ErrorState onRetry={()=>void employees.refetch()}/>
  const add=async()=>{
    if(!name.trim())return
    await create.mutateAsync({name:name.trim(),operational_role:'technician'})
    setName('')
    await setup.refetch()
  }
  return <StepCard number={2} title="Técnico responsável" description="Cadastre pelo menos um técnico. Ele poderá ser alocado a qualquer serviço; não é necessário vincular serviços ao profissional.">
    <div className="onboarding-form">
      <label>Nome do técnico<div className="inline-create"><input value={name} onChange={event=>setName(event.target.value)} placeholder="Nome do profissional"/><button className="compact-button" type="button" disabled={!name.trim()||create.isPending} onClick={()=>void add()}><Plus size={16}/>Adicionar</button></div></label>
      {technicians.length>0&&<div className="onboarding-check-list">{technicians.map(item=><span key={item.id}><Check size={16}/>{item.name}</span>)}</div>}
      {create.isError&&<MutationError/>}
      <StepActions onBack={onBack} onNext={onNext} nextDisabled={!technicians.length} nextLabel="Próxima etapa"/>
    </div>
  </StepCard>
}

function HoursStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}){
  const employees=useEmployees(),hours=useWorkingHours(),create=useCreateWorkingHours(),setup=useSetupStatus()
  const technicians=employees.data?.items.filter(item=>item.active&&item.operational_role==='technician')??[]
  const [employeeId,setEmployeeId]=useState('')
  const [weekday,setWeekday]=useState(0)
  const [start,setStart]=useState('08:00')
  const [end,setEnd]=useState('18:00')
  const ready=!!setup.data?.business_hours
  if(employees.isPending||hours.isPending)return <LoadingState/>
  const add=async()=>{
    if(!employeeId)return
    await create.mutateAsync({employee_id:employeeId,weekday,start_time:start,end_time:end})
    await setup.refetch()
  }
  return <StepCard number={3} title="Horários de funcionamento" description="Informe pelo menos uma faixa de trabalho. O ALOVIA só oferece horários em que existe um técnico trabalhando.">
    <div className="onboarding-form">
      <label>Técnico<select value={employeeId} onChange={event=>setEmployeeId(event.target.value)}><option value="">Selecione</option>{technicians.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
      <label>Dia<select value={weekday} onChange={event=>setWeekday(Number(event.target.value))}>{weekdays.map((label,index)=><option value={index} key={label}>{label}</option>)}</select></label>
      <div className="form-grid"><label>Início<input type="time" value={start} onChange={event=>setStart(event.target.value)}/></label><label>Fim<input type="time" value={end} onChange={event=>setEnd(event.target.value)}/></label></div>
      <button className="compact-button" type="button" disabled={!employeeId||create.isPending} onClick={()=>void add()}><Plus size={16}/>{create.isPending?'Adicionando…':'Adicionar horário'}</button>
      {hours.data&&hours.data.items.length>0&&<div className="onboarding-check-list">{hours.data.items.map(item=><span key={item.id}><Check size={16}/>{weekdays[item.weekday]} · {item.start_time.slice(0,5)}–{item.end_time.slice(0,5)} · {item.employee_name}</span>)}</div>}
      {create.isError&&<MutationError/>}
      <StepActions onBack={onBack} onNext={onNext} nextDisabled={!ready}/>
    </div>
  </StepCard>
}

function ServicesStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}){
  const services=useServices(),setup=useSetupStatus()
  if(services.isPending)return <LoadingState/>
  if(services.isError||!services.data)return <ErrorState onRetry={()=>void services.refetch()}/>
  return <StepCard number={4} title="Catálogo de serviços" description="Revise os serviços que sua empresa oferece e informe o preço dos serviços ativos. Você pode desativar o que não utiliza.">
    <div className="onboarding-service-list">{services.data.items.map(item=><OnboardingServiceRow service={item} key={item.id}/>)}</div>
    <p className="settings-note">O ALOVIA gera automaticamente frases para reconhecer cada serviço durante a conversa.</p>
    <StepActions onBack={onBack} onNext={onNext} nextDisabled={!setup.data?.services}/>
  </StepCard>
}

function OnboardingServiceRow({service}:{service:Service}){
  const update=useUpdateService(),setup=useSetupStatus()
  const [price,setPrice]=useState(service.price==null?'':String(service.price))
  const save=async()=>{
    const parsed=Number(price.replace(',','.'))
    if(!Number.isFinite(parsed))return
    await update.mutateAsync({id:service.id,values:{price:parsed}})
    await setup.refetch()
  }
  return <article className={service.active?'onboarding-item-row':'onboarding-item-row is-inactive'}>
    <div><strong>{service.name}</strong><span>{service.duration_minutes} min</span></div>
    {service.active&&<label>Preço (R$)<input inputMode="decimal" value={price} onChange={event=>setPrice(event.target.value)} placeholder="0,00"/></label>}
    <div><button className="compact-button" type="button" disabled={update.isPending||service.active&&!price.trim()} onClick={()=>void save()}><Save size={15}/>Salvar preço</button><button className="compact-button" type="button" disabled={update.isPending} onClick={async()=>{await update.mutateAsync({id:service.id,values:{active:!service.active}});await setup.refetch()}}>{service.active?'Não ofereço':'Ativar'}</button></div>
  </article>
}

function MaterialsStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}){
  const items=useCatalogItems(),setup=useSetupStatus()
  if(items.isPending)return <LoadingState/>
  if(items.isError||!items.data)return <ErrorState onRetry={()=>void items.refetch()}/>
  return <StepCard number={5} title="Materiais e equipamentos" description="Ative pelo menos um item que sua empresa cobra à parte e informe o preço. Sugestões comuns do setor já estão prontas para você revisar.">
    <div className="onboarding-service-list">{items.data.items.map(item=><OnboardingMaterialRow item={item} key={item.id}/>)}</div>
    <StepActions onBack={onBack} onNext={onNext} nextDisabled={!setup.data?.materials}/>
  </StepCard>
}

function OnboardingMaterialRow({item}:{item:CatalogItem}){
  const update=useUpdateCatalogItem(),setup=useSetupStatus()
  const [price,setPrice]=useState(item.price==null?'':String(item.price))
  const activate=async()=>{
    const parsed=Number(price.replace(',','.'))
    if(!Number.isFinite(parsed))return
    await update.mutateAsync({id:item.id,values:{price:parsed,active:true}})
    await setup.refetch()
  }
  return <article className={item.active?'onboarding-item-row':'onboarding-item-row is-inactive'}>
    <div><strong>{item.name}</strong><span>{item.description??'Sem descrição'}{item.unit_label?' · por '+item.unit_label:''}</span></div>
    <label>Preço (R$)<input inputMode="decimal" value={price} onChange={event=>setPrice(event.target.value)} placeholder="0,00"/></label>
    <div>{!item.active?<button className="compact-button" type="button" disabled={!price.trim()||update.isPending} onClick={()=>void activate()}>Usar item</button>:<><button className="compact-button" type="button" disabled={!price.trim()||update.isPending} onClick={()=>void activate()}><Save size={15}/>Salvar</button><button className="compact-button" type="button" disabled={update.isPending} onClick={async()=>{await update.mutateAsync({id:item.id,values:{active:false}});await setup.refetch()}}>Não uso</button></>}</div>
  </article>
}

function AgendaStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}){
  const business=useBusiness(),update=useUpdateBusiness()
  const [interval,setInterval]=useState('')
  const [preparation,setPreparation]=useState('')
  const [finishing,setFinishing]=useState('')
  const [notice,setNotice]=useState('')
  useEffect(()=>{
    if(!business.data)return
    setInterval(numberOrBlank(business.data.interval_between_services_minutes))
    setPreparation(numberOrBlank(business.data.preparation_minutes))
    setFinishing(numberOrBlank(business.data.finishing_minutes))
    setNotice(numberOrBlank(business.data.minimum_booking_notice_minutes))
  },[business.data])
  if(business.isPending)return <LoadingState/>
  return <StepCard number={6} title="Agenda e disponibilidade" description="Você pode deixar tudo em branco. Nesse caso, o ALOVIA toma a melhor decisão com base no serviço e na logística.">
    <form className="onboarding-form" onSubmit={async event=>{
      event.preventDefault()
      await update.mutateAsync({
        interval_between_services_minutes:optionalNumber(interval),
        preparation_minutes:optionalNumber(preparation),
        finishing_minutes:optionalNumber(finishing),
        minimum_booking_notice_minutes:optionalNumber(notice),
        agenda_preferences_reviewed:true,
      })
      onNext()
    }}>
      <AutoInput label="Intervalo entre um serviço e outro" value={interval} setValue={setInterval}/>
      <AutoInput label="Tempo de preparação" value={preparation} setValue={setPreparation}/>
      <AutoInput label="Tempo após finalizar o serviço" value={finishing} setValue={setFinishing}/>
      <AutoInput label="Antecedência mínima para agendamento" value={notice} setValue={setNotice}/>
      <p className="settings-note">Em branco = Automático pelo ALOVIA. Deslocamento é calculado separadamente e não entra no limite dos tempos operacionais automáticos.</p>
      <StepActions onBack={onBack} nextDisabled={update.isPending} nextLabel={update.isPending?'Salvando…':'Salvar e continuar'}/>
    </form>
  </StepCard>
}

function WhatsAppStep({onBack,onFinished}:{onBack:()=>void;onFinished:()=>void}){
  const connection=useConnection()
  const complete=useCompleteOnboarding()
  const [open,setOpen]=useState(false)
  const connected=connection.data?.status==='connected'
  return <StepCard number={7} title="Conectar WhatsApp" description="Última etapa. Conecte o WhatsApp Business oficial para o ALOVIA receber as conversas e criar agendamentos automaticamente.">
    {connection.isPending&&<LoadingState/>}
    {connection.isError&&<ErrorState onRetry={()=>void connection.refetch()}/>}
    {connection.data&&<div className="onboarding-whatsapp">
      <MessageCircleMore size={34}/>
      <ConnectionStatusBadge status={connection.data.status}/>
      {connection.data.display_phone_number&&<strong>{connection.data.display_phone_number}</strong>}
      {!connected&&<PrimaryButton fullWidth icon={<ArrowRight size={18}/>} onClick={()=>setOpen(true)}>Conectar WhatsApp</PrimaryButton>}
      {connected&&<p className="form-success">WhatsApp conectado. Sua configuração inicial está pronta para ser finalizada.</p>}
    </div>}
    {complete.isError&&<MutationError/>}
    <StepActions onBack={onBack} onNext={async()=>{
      await complete.mutateAsync()
      onFinished()
    }} nextDisabled={!connected||complete.isPending} nextLabel={complete.isPending?'Finalizando…':'Finalizar configuração'}/>
    <ConnectWhatsAppSheet open={open} onClose={()=>{setOpen(false);void connection.refetch()}}/>
  </StepCard>
}

function StepCard({number,title,description,children}:{number:number;title:string;description:string;children:React.ReactNode}){
  return <main className="onboarding-card"><span className="eyebrow">Etapa {number}</span><h1>{title}</h1><p className="onboarding-description">{description}</p>{children}</main>
}

function StepActions({onBack,onNext,nextDisabled=false,nextLabel='Próxima etapa'}:{onBack?:()=>void;onNext?:()=>void|Promise<void>;nextDisabled?:boolean;nextLabel?:string}){
  return <div className="onboarding-actions">{onBack&&<button className="compact-button" type="button" onClick={onBack}><ArrowLeft size={17}/>Voltar</button>}<button className="primary-button" type={onNext?'button':'submit'} disabled={nextDisabled} onClick={onNext?()=>void onNext():undefined}>{nextLabel}<ArrowRight size={17}/></button></div>
}

function AutoInput({label,value,setValue}:{label:string;value:string;setValue:(value:string)=>void}){
  return <label>{label}<input type="number" min={0} value={value} onChange={event=>setValue(event.target.value)} placeholder="Automático pelo ALOVIA"/><small className="settings-field-help">{value.trim()===''?'Automático pelo ALOVIA. ':''}Você pode definir manualmente se preferir.</small></label>
}

function OnboardingShell({children}:{children:React.ReactNode}){return <div className="onboarding-shell"><div className="onboarding-brand"><Wrench size={20}/><strong>ALOVIA</strong></div>{children}</div>}
function MutationError(){return <p className="form-error" role="alert">Não foi possível concluir esta ação. Revise os dados e tente novamente.</p>}
function optionalNumber(value:string){return value.trim()===''?null:Number(value)}
function numberOrBlank(value:number|null){return value==null?'':String(value)}
