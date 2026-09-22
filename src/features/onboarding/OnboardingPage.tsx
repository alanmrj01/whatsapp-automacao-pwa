import { CheckCircle2, ChevronLeft, ChevronRight, LoaderCircle, MessageCircleMore, Plus, Snowflake } from 'lucide-react'
import { FormEvent, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorState } from '../../components/ErrorState'
import { LoadingState } from '../../components/LoadingState'
import { PrimaryButton } from '../../components/PrimaryButton'
import { useAuth } from '../auth/useAuth'
import { canConfigureWhatsApp } from '../auth/types'
import {
  useBusiness,
  useCatalogItems,
  useCompleteOnboardingStep,
  useCreateEmployee,
  useCreateService,
  useCreateWorkingHours,
  useEmployees,
  useFinalizeOnboarding,
  useServices,
  useSetupStatus,
  useUpdateBusiness,
  useUpdateCatalogItem,
  useWorkingHours,
} from '../operations/api'
import type { Business, CatalogItem, Employee } from '../operations/types'
import { ConnectWhatsAppSheet } from '../whatsapp/ConnectWhatsAppSheet'
import { ConnectionStatusBadge } from '../whatsapp/ConnectionStatusBadge'
import { useConnection } from '../whatsapp/useConnection'
import './onboarding.css'

const TOTAL_STEPS=7

export function OnboardingPage() {
  const setup=useSetupStatus()
  const business=useBusiness()
  const {membership}=useAuth()
  const [params,setParams]=useSearchParams()
  const [completed,setCompleted]=useState(false)
  const canConfigure=canConfigureWhatsApp(membership?.role)

  if(setup.isPending||business.isPending)return <OnboardingShell><LoadingState/></OnboardingShell>
  if(setup.isError||business.isError||!setup.data||!business.data)return <OnboardingShell><ErrorState onRetry={()=>{void setup.refetch();void business.refetch()}}/></OnboardingShell>

  if(completed||setup.data.onboarding_completed)return <OnboardingComplete/>

  const rawStep=Number(params.get('step')||'0')
  const step=Number.isInteger(rawStep)&&rawStep>=0&&rawStep<=TOTAL_STEPS?rawStep:0
  const go=(next:number)=>setParams(next?{step:String(next)}:{},{replace:true})

  if(!canConfigure)return <OnboardingShell>
    <section className="onboarding-card onboarding-card--center">
      <Snowflake size={34}/>
      <h1>Configuração inicial pendente</h1>
      <p>Um administrador da empresa precisa concluir as informações iniciais antes da operação ser liberada.</p>
    </section>
  </OnboardingShell>

  if(step===0)return <OnboardingShell>
    <section className="onboarding-card onboarding-card--welcome">
      <span className="onboarding-brand"><Snowflake size={26}/></span>
      <span className="eyebrow">Conta liberada</span>
      <h1>As funcionalidades da sua conta estão liberadas.</h1>
      <p>Complete suas informações para usar o ALOVIA. São 7 etapas rápidas para o Assistente Virtual atender e organizar seus agendamentos com segurança.</p>
      <div className="onboarding-welcome-points">
        <span><CheckCircle2 size={17}/>Você não precisa procurar configurações pelo aplicativo.</span>
        <span><CheckCircle2 size={17}/>Cada etapa é salva antes de avançar.</span>
        <span><CheckCircle2 size={17}/>Depois, tudo pode ser alterado em Mais.</span>
      </div>
      <PrimaryButton fullWidth icon={<ChevronRight size={18}/>} onClick={()=>go(firstIncomplete(setup.data))}>Continuar</PrimaryButton>
    </section>
  </OnboardingShell>

  return <OnboardingShell>
    <OnboardingProgress step={step}/>
    {step===1&&<CompanyStep business={business.data} onBack={()=>go(0)} onNext={()=>go(2)}/>}
    {step===2&&<TeamStep onBack={()=>go(1)} onNext={()=>go(3)}/>}
    {step===3&&<HoursStep onBack={()=>go(2)} onNext={()=>go(4)}/>}
    {step===4&&<ServicesStep onBack={()=>go(3)} onNext={()=>go(5)}/>}
    {step===5&&<MaterialsStep onBack={()=>go(4)} onNext={()=>go(6)}/>}
    {step===6&&<AgendaStep business={business.data} onBack={()=>go(5)} onNext={()=>go(7)}/>}
    {step===7&&<WhatsAppStep onBack={()=>go(6)} onComplete={()=>setCompleted(true)}/>}
  </OnboardingShell>
}

function CompanyStep({business,onBack,onNext}:{business:Business;onBack:()=>void;onNext:()=>void}) {
  const update=useUpdateBusiness()
  const [name,setName]=useState(business.name)
  const [responsible,setResponsible]=useState(business.responsible_name??'')
  const [address,setAddress]=useState(business.service_origin_configured?business.service_origin_address:'')
  const [timezone,setTimezone]=useState(business.timezone)

  const submit=(event:FormEvent)=>{
    event.preventDefault()
    update.mutate(
      {name,responsible_name:responsible,service_origin_address:address,timezone},
      {onSuccess:onNext},
    )
  }

  return <StepCard step={1} title="Dados da empresa" description="Esses dados identificam sua operação e definem de onde começa o primeiro deslocamento do dia.">
    <form className="onboarding-form" onSubmit={submit}>
      <label>Nome da empresa<input required minLength={2} maxLength={255} value={name} onChange={event=>setName(event.target.value)}/></label>
      <label>Responsável pela empresa<input required minLength={2} maxLength={255} value={responsible} onChange={event=>setResponsible(event.target.value)} placeholder="Ex.: João da Silva"/></label>
      <label>Endereço de saída da equipe<input required minLength={5} maxLength={500} value={address} onChange={event=>setAddress(event.target.value)} placeholder="Rua, número, bairro, cidade - UF"/><small>Usado para calcular o deslocamento quando for o primeiro atendimento do técnico no dia.</small></label>
      <label>Fuso horário<input required value={timezone} onChange={event=>setTimezone(event.target.value)}/></label>
      {update.isError&&<InlineError/>}
      <StepActions onBack={onBack} pending={update.isPending}/>
    </form>
  </StepCard>
}

function TeamStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}) {
  const employees=useEmployees()
  const create=useCreateEmployee()
  const [name,setName]=useState('')
  const active=employees.data?.items.filter(item=>item.active)??[]

  const add=(event:FormEvent)=>{
    event.preventDefault()
    create.mutate({name,operational_role:'technician'},{onSuccess:()=>setName('')})
  }

  return <StepCard step={2} title="Técnico responsável" description="Cadastre pelo menos uma pessoa que possa receber agendamentos. O técnico não precisa ser vinculado a serviços específicos.">
    {(employees.isPending)&&<LoadingState/>}
    {employees.isError&&<ErrorState onRetry={()=>void employees.refetch()}/>}
    {employees.data&&<>
      <div className="onboarding-summary-list">{active.map(item=><EmployeeSummary employee={item} key={item.id}/>)}</div>
      <form className="onboarding-inline-form" onSubmit={add}>
        <label>Nome do técnico<input required minLength={2} value={name} onChange={event=>setName(event.target.value)} placeholder="Ex.: Carlos"/></label>
        <button className="compact-button" disabled={create.isPending}><Plus size={17}/>Adicionar</button>
      </form>
      {create.isError&&<InlineError/>}
      <StepActions onBack={onBack} onNext={onNext} nextDisabled={active.length===0} pending={create.isPending}/>
    </>}
  </StepCard>
}

function HoursStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}) {
  const hours=useWorkingHours()
  const employees=useEmployees()
  const create=useCreateWorkingHours()
  const active=employees.data?.items.filter(item=>item.active)??[]
  const [employeeId,setEmployeeId]=useState('')
  const [weekday,setWeekday]=useState(0)
  const [start,setStart]=useState('08:00')
  const [end,setEnd]=useState('18:00')
  const items=hours.data?.items??[]

  const add=(event:FormEvent)=>{
    event.preventDefault()
    create.mutate({employee_id:employeeId,weekday,start_time:start,end_time:end})
  }

  return <StepCard step={3} title="Horários de funcionamento" description="Informe pelo menos uma faixa de trabalho. O ALOVIA só oferecerá horários dentro da disponibilidade cadastrada.">
    {(hours.isPending||employees.isPending)&&<LoadingState/>}
    {(hours.isError||employees.isError)&&<ErrorState onRetry={()=>{void hours.refetch();void employees.refetch()}}/>}
    {hours.data&&employees.data&&<>
      <div className="onboarding-summary-list">{items.map(item=><div className="onboarding-summary-row" key={item.id}><strong>{weekdays[item.weekday]}</strong><span>{item.start_time.slice(0,5)}–{item.end_time.slice(0,5)} · {item.employee_name}</span></div>)}</div>
      <form className="onboarding-grid-form" onSubmit={add}>
        <label>Técnico<select required value={employeeId} onChange={event=>setEmployeeId(event.target.value)}><option value="">Selecione</option>{active.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
        <label>Dia<select value={weekday} onChange={event=>setWeekday(Number(event.target.value))}>{weekdays.map((label,index)=><option value={index} key={label}>{label}</option>)}</select></label>
        <label>Início<input required type="time" value={start} onChange={event=>setStart(event.target.value)}/></label>
        <label>Fim<input required type="time" value={end} onChange={event=>setEnd(event.target.value)}/></label>
        <button className="compact-button" disabled={create.isPending}><Plus size={17}/>Adicionar horário</button>
      </form>
      {create.isError&&<InlineError/>}
      <StepActions onBack={onBack} onNext={onNext} nextDisabled={items.length===0} pending={create.isPending}/>
    </>}
  </StepCard>
}

function ServicesStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}) {
  const services=useServices()
  const create=useCreateService()
  const [name,setName]=useState('')
  const [duration,setDuration]=useState(60)
  const [price,setPrice]=useState('')
  const valid=services.data?.items.filter(item=>item.active&&item.price!==null&&item.price>0)??[]

  const add=(event:FormEvent)=>{
    event.preventDefault()
    const numeric=Number(price.replace(',','.'))
    if(!Number.isFinite(numeric)||numeric<=0)return
    create.mutate({name,duration_minutes:duration,price:numeric},{onSuccess:()=>{setName('');setPrice('')}})
  }

  return <StepCard step={4} title="Catálogo de serviços" description="Cadastre pelo menos um serviço com duração e preço. O ALOVIA cria automaticamente exemplos de como os clientes podem pedir esse serviço.">
    {services.isPending&&<LoadingState/>}
    {services.isError&&<ErrorState onRetry={()=>void services.refetch()}/>}
    {services.data&&<>
      <div className="onboarding-summary-list">{services.data.items.map(item=><div className="onboarding-summary-row" key={item.id}><strong>{item.name}</strong><span>{item.duration_minutes} min · {item.price!==null?currency(item.price):'Preço pendente'}</span></div>)}</div>
      <form className="onboarding-grid-form" onSubmit={add}>
        <label>Serviço<input required minLength={2} value={name} onChange={event=>setName(event.target.value)} placeholder="Ex.: Limpeza de ar-condicionado"/></label>
        <label>Duração aproximada (min)<input required type="number" min={1} max={1440} value={duration} onChange={event=>setDuration(Number(event.target.value))}/></label>
        <label>Preço<input required inputMode="decimal" value={price} onChange={event=>setPrice(event.target.value)} placeholder="Ex.: 180,00"/></label>
        <button className="compact-button" disabled={create.isPending}><Plus size={17}/>Adicionar serviço</button>
      </form>
      {create.isError&&<InlineError/>}
      <StepActions onBack={onBack} onNext={onNext} nextDisabled={valid.length===0} pending={create.isPending}/>
    </>}
  </StepCard>
}

function MaterialsStep({onBack,onNext}:{onBack:()=>void;onNext:()=>void}) {
  const items=useCatalogItems()
  const update=useUpdateCatalogItem()
  const complete=useCompleteOnboardingStep()
  const [prices,setPrices]=useState<Record<string,string>>({})
  const [active,setActive]=useState<Record<string,boolean>>({})

  const rows=items.data?.items??[]
  const effectiveActive=(item:CatalogItem)=>active[item.id]??item.active
  const effectivePrice=(item:CatalogItem)=>prices[item.id]??(item.price===null?'':String(item.price))

  const saveAndContinue=async()=>{
    try{
      for(const item of rows){
        const isActive=effectiveActive(item)
        const raw=effectivePrice(item)
        const numeric=raw.trim()===''?null:Number(raw.replace(',','.'))
        if(isActive&&(numeric===null||!Number.isFinite(numeric)))return
        if(isActive!==item.active||numeric!==item.price){
          await update.mutateAsync({id:item.id,values:{active:isActive,price:numeric}})
        }
      }
      await complete.mutateAsync('materials')
      onNext()
    }catch{return}
  }

  return <StepCard step={5} title="Materiais e equipamentos" description="Ative apenas os adicionais que você cobra. Os itens sugeridos começam sem preço para o ALOVIA nunca inventar valores da sua empresa.">
    {items.isPending&&<LoadingState/>}
    {items.isError&&<ErrorState onRetry={()=>void items.refetch()}/>}
    {items.data&&<>
      <div className="onboarding-catalog-table">
        {rows.map(item=><div className="onboarding-catalog-row" key={item.id}>
          <label className="check-row"><input type="checkbox" checked={effectiveActive(item)} onChange={event=>setActive(current=>({...current,[item.id]:event.target.checked}))}/><span><strong>{item.name}</strong><small>{item.description??'Sem descrição'}</small></span></label>
          <label>Preço{item.unit==='meter'&&<small>por metro</small>}<input inputMode="decimal" disabled={!effectiveActive(item)} value={effectivePrice(item)} onChange={event=>setPrices(current=>({...current,[item.id]:event.target.value}))} placeholder="0,00"/></label>
        </div>)}
      </div>
      <p className="onboarding-note">Se sua empresa não cobra adicionais de materiais, deixe todos desativados e continue.</p>
      {(update.isError||complete.isError)&&<InlineError/>}
      <StepActions onBack={onBack} onNext={()=>void saveAndContinue()} pending={update.isPending||complete.isPending}/>
    </>}
  </StepCard>
}

function AgendaStep({business,onBack,onNext}:{business:Business;onBack:()=>void;onNext:()=>void}) {
  const update=useUpdateBusiness()
  const complete=useCompleteOnboardingStep()
  const [gap,setGap]=useState(asOptionalNumber(business.default_service_gap_minutes))
  const [prep,setPrep]=useState(asOptionalNumber(business.default_preparation_minutes))
  const [finish,setFinish]=useState(asOptionalNumber(business.default_completion_minutes))
  const [notice,setNotice]=useState(asOptionalNumber(business.minimum_booking_notice_minutes))

  const save=async(event:FormEvent)=>{
    event.preventDefault()
    try{
      await update.mutateAsync({
        default_service_gap_minutes:optionalNumber(gap),
        default_preparation_minutes:optionalNumber(prep),
        default_completion_minutes:optionalNumber(finish),
        minimum_booking_notice_minutes:optionalNumber(notice),
      })
      await complete.mutateAsync('agenda')
      onNext()
    }catch{return}
  }

  return <StepCard step={6} title="Agenda e disponibilidade" description="Você pode definir limites ou deixar em branco. Em branco, o ALOVIA toma a melhor decisão com base no serviço e na logística.">
    <form className="onboarding-form" onSubmit={save}>
      <OptionalPlanningField label="Intervalo entre um serviço e outro" value={gap} onChange={setGap} help="Tempo livre adicional entre atendimentos. Em branco: Automático pelo ALOVIA."/>
      <OptionalPlanningField label="Tempo de preparação" value={prep} onChange={setPrep} help="Tempo para organizar ferramentas e materiais antes do serviço. Em branco: Automático pelo ALOVIA."/>
      <OptionalPlanningField label="Tempo após finalizar o serviço" value={finish} onChange={setFinish} help="Tempo para guardar equipamentos e encerrar o atendimento. Em branco: Automático pelo ALOVIA."/>
      <OptionalPlanningField label="Antecedência mínima para um novo agendamento" value={notice} onChange={setNotice} max={10080} help="Quanto tempo antes o cliente ainda pode agendar. Em branco: Automático pelo ALOVIA."/>
      <p className="onboarding-note">O deslocamento não é configurado aqui. O ALOVIA considera o endereço base no primeiro serviço e, nos próximos, a rota entre os atendimentos do técnico.</p>
      {(update.isError||complete.isError)&&<InlineError/>}
      <StepActions onBack={onBack} pending={update.isPending||complete.isPending}/>
    </form>
  </StepCard>
}

function WhatsAppStep({onBack,onComplete}:{onBack:()=>void;onComplete:()=>void}) {
  const connection=useConnection()
  const finalize=useFinalizeOnboarding()
  const [open,setOpen]=useState(false)

  const finish=()=>finalize.mutate(undefined,{onSuccess:onComplete})

  return <StepCard step={7} title="Conectar WhatsApp" description="Última etapa. Conecte o WhatsApp Business oficial para o ALOVIA receber os pedidos dos seus clientes.">
    {connection.isPending&&<LoadingState/>}
    {connection.isError&&<ErrorState onRetry={()=>void connection.refetch()}/>}
    {connection.data&&<div className="onboarding-whatsapp">
      <span className="onboarding-whatsapp__icon"><MessageCircleMore size={28}/></span>
      <div><strong>WhatsApp Business</strong><ConnectionStatusBadge status={connection.data.status}/></div>
      {connection.data.display_phone_number&&<span>{connection.data.display_phone_number}</span>}
    </div>}
    {connection.data?.status!=='connected'&&<button className="primary-button" type="button" onClick={()=>setOpen(true)}>Conectar WhatsApp</button>}
    {connection.data?.status==='connected'&&<button className="primary-button" type="button" disabled={finalize.isPending} onClick={finish}>{finalize.isPending?<><LoaderCircle className="spin" size={18}/>Finalizando…</>:<>Concluir configuração<CheckCircle2 size={18}/></>}</button>}
    {finalize.isError&&<InlineError text="Ainda existe uma etapa pendente. Revise os passos anteriores e tente novamente."/>}
    <button className="onboarding-back-link" type="button" onClick={onBack}><ChevronLeft size={17}/>Voltar</button>
    <ConnectWhatsAppSheet open={open} onClose={()=>{setOpen(false);void connection.refetch()}}/>
  </StepCard>
}

function OnboardingComplete() {
  const navigate=useNavigate()
  return <OnboardingShell>
    <section className="onboarding-card onboarding-card--welcome onboarding-card--complete">
      <span className="onboarding-brand"><CheckCircle2 size={28}/></span>
      <span className="eyebrow">Configuração concluída</span>
      <h1>Tudo pronto para usar o ALOVIA.</h1>
      <p>Suas informações iniciais foram salvas. O Assistente Virtual já pode usar os dados da empresa para atender e organizar agendamentos.</p>
      <p className="onboarding-note">Você pode alterar qualquer uma dessas informações depois em <strong>Mais</strong>.</p>
      <PrimaryButton fullWidth icon={<ChevronRight size={18}/>} onClick={()=>navigate('/app',{replace:true})}>Entrar no ALOVIA</PrimaryButton>
    </section>
  </OnboardingShell>
}

function StepCard({step,title,description,children}:{step:number;title:string;description:string;children:React.ReactNode}) {
  return <section className="onboarding-card">
    <span className="eyebrow">Etapa {step} de {TOTAL_STEPS}</span>
    <h1>{title}</h1>
    <p>{description}</p>
    {children}
  </section>
}

function OnboardingProgress({step}:{step:number}) {
  return <div className="onboarding-progress" aria-label={`Etapa ${step} de ${TOTAL_STEPS}`}>
    <div><span>Configuração inicial</span><strong>{step} de {TOTAL_STEPS}</strong></div>
    <div className="onboarding-progress__track"><span style={{width:`${step/TOTAL_STEPS*100}%`}}/></div>
  </div>
}

function StepActions({onBack,onNext,pending=false,nextDisabled=false}:{onBack:()=>void;onNext?:()=>void;pending?:boolean;nextDisabled?:boolean}) {
  return <div className="onboarding-actions">
    <button className="compact-button" type="button" disabled={pending} onClick={onBack}><ChevronLeft size={17}/>Voltar</button>
    <button className="primary-button" type={onNext?'button':'submit'} disabled={pending||nextDisabled} onClick={onNext}>{pending?<><LoaderCircle className="spin" size={17}/>Salvando…</>:<>Próxima etapa<ChevronRight size={17}/></>}</button>
  </div>
}

function OptionalPlanningField({label,value,onChange,help,max=50}:{label:string;value:string;onChange:(value:string)=>void;help:string;max?:number}) {
  return <label>{label}<input type="number" min={0} max={max} value={value} onChange={event=>onChange(event.target.value)} placeholder="Automático pelo ALOVIA"/><small>{help}</small></label>
}

function EmployeeSummary({employee}:{employee:Employee}) {
  return <div className="onboarding-summary-row"><strong>{employee.name}</strong><span>{employee.operational_role==='technician'?'Técnico':employee.operational_role==='assistant'?'Auxiliar':'Administrador'}</span></div>
}

function InlineError({text='Não foi possível salvar. Revise os dados e tente novamente.'}:{text?:string}) {return <p className="form-error" role="alert">{text}</p>}

function OnboardingShell({children}:{children:React.ReactNode}) {return <main className="onboarding-shell" id="main-content"><div className="onboarding-shell__inner">{children}</div></main>}

function firstIncomplete(setup:{company:boolean;team:boolean;business_hours:boolean;services:boolean;materials:boolean;agenda:boolean;whatsapp:boolean}) {
  const checks=[setup.company,setup.team,setup.business_hours,setup.services,setup.materials,setup.agenda,setup.whatsapp]
  const index=checks.findIndex(value=>!value)
  return index===-1?7:index+1
}

function optionalNumber(value:string) {return value.trim()===''?null:Number(value)}
function asOptionalNumber(value:number|null) {return value===null?'':String(value)}
function currency(value:number) {return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value)}
const weekdays=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
