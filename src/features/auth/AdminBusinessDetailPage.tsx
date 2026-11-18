import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CirclePower,
  CreditCard,
  KeyRound,
  Mail,
  Megaphone,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../../components/AppHeader'
import { BottomSheet } from '../../components/BottomSheet'
import { PrimaryButton } from '../../components/PrimaryButton'
import { ApiError } from '../../lib/httpClient'
import {
  setPlatformBusinessAccess,
  setPlatformBusinessActive,
} from './platformAdmin'
import {
  getPlatformBusiness,
  type PlatformBusinessDetail,
} from './platformAdminDetail'
import './AdminPage.css'

const planLabels = {basic:'Básico',plus:'Plus'} as const
const cycleLabels = {monthly:'Mensal',quarterly:'Trimestral',annual:'Anual'} as const
const paymentLabels = {
  credit_card:'Cartão de crédito',
  pix:'Pix',
  pix_automatic:'Pix Automático',
} as const
const whatsappLabels = {
  disconnected:'Desconectado',
  pending:'Pendente',
  connected:'Conectado',
  error:'Erro',
} as const

function formatDate(value:string|null) {
  if(!value)return '—'
  return new Intl.DateTimeFormat('pt-BR',{
    dateStyle:'short',
    timeStyle:'short',
    timeZone:'America/Sao_Paulo',
  }).format(new Date(value))
}

function formatPhone(value:string|null) {
  if(!value)return '—'
  const digits=value.replace(/\D/g,'')
  const national=(digits.length===12||digits.length===13)&&digits.startsWith('55')?digits.slice(2):digits
  if(national.length===11){
    const formatted=national.replace(/^(\d{2})(\d{5})(\d{4})$/,'($1) $2-$3')
    return digits.startsWith('55')?`+55 ${formatted}`:formatted
  }
  if(national.length===10){
    const formatted=national.replace(/^(\d{2})(\d{4})(\d{4})$/,'($1) $2-$3')
    return digits.startsWith('55')?`+55 ${formatted}`:formatted
  }
  return value
}

function whatsappHref(value:string|null) {
  if(!value)return null
  const digits=value.replace(/\D/g,'')
  if(!digits)return null
  return `https://wa.me/${digits.startsWith('55')?digits:`55${digits}`}`
}

function formatMoney(cents:number|null) {
  if(cents===null)return '—'
  return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cents/100)
}

function TextValue({children}:{children:ReactNode}) {
  return <>{children||'—'}</>
}

function InfoSection({
  title,
  icon,
  wide=false,
  children,
}:{title:string;icon:ReactNode;wide?:boolean;children:ReactNode}) {
  return <section className={`platform-business-detail__section ${wide?'platform-business-detail__section--wide':''}`}>
    <header>{icon}<h2>{title}</h2></header>
    {children}
  </section>
}

function DetailFacts({items}:{items:Array<{label:string;value:ReactNode}>}) {
  return <dl className="platform-business-detail__facts">
    {items.map(item=><div key={item.label}><dt>{item.label}</dt><dd><TextValue>{item.value}</TextValue></dd></div>)}
  </dl>
}

export function AdminBusinessDetailPage() {
  const {businessId=''}=useParams()
  const navigate=useNavigate()
  const [business,setBusiness]=useState<PlatformBusinessDetail|null>(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  const [actionError,setActionError]=useState('')
  const [busy,setBusy]=useState(false)
  const [accessConfirmation,setAccessConfirmation]=useState(false)

  const load=useCallback(async()=>{
    if(!businessId)return
    setLoading(true)
    setError('')
    try{
      setBusiness(await getPlatformBusiness(businessId))
    }catch(requestError){
      setError(requestError instanceof ApiError
        ?requestError.message
        :'Não foi possível carregar os dados desta empresa.')
    }finally{
      setLoading(false)
    }
  },[businessId])

  useEffect(()=>{void Promise.resolve().then(load)},[load])

  async function toggleActive() {
    if(!business)return
    setBusy(true)
    setActionError('')
    try{
      const result=await setPlatformBusinessActive(business.id,!business.active)
      setBusiness(current=>current?{...current,active:result.active}:current)
    }catch{
      setActionError('Não foi possível alterar o status da empresa.')
    }finally{
      setBusy(false)
    }
  }

  async function confirmAccess() {
    if(!business)return
    const next=business.access_mode==='free'?'paid':'free'
    setAccessConfirmation(false)
    setBusy(true)
    setActionError('')
    try{
      const result=await setPlatformBusinessAccess(business.id,next)
      setBusiness(current=>current?{
        ...current,
        access_mode:result.access_mode,
        admin_full_access:result.access_mode==='paid',
      }:current)
    }catch(requestError){
      setActionError(requestError instanceof ApiError
        ?requestError.message
        :'Não foi possível alterar o acesso operacional da empresa.')
    }finally{
      setBusy(false)
    }
  }

  if(loading&&!business)return <>
    <AppHeader title="Administração"/>
    <main className="platform-business-detail"><div className="platform-business-detail__empty">Carregando empresa…</div></main>
  </>

  if(error&&!business)return <>
    <AppHeader title="Administração"/>
    <main className="platform-business-detail">
      <div className="platform-business-detail__topbar">
        <button className="platform-business-detail__back" type="button" onClick={()=>navigate('/admin')}><ArrowLeft size={17}/> Empresas</button>
      </div>
      <div className="platform-business-detail__empty">
        <div><strong>Não foi possível carregar a empresa</strong><p>{error}</p><PrimaryButton onClick={()=>void load()}>Tentar novamente</PrimaryButton></div>
      </div>
    </main>
  </>

  if(!business)return null

  const chatHref=whatsappHref(business.contact_whatsapp)
  const plan=business.commercial_plan_code?planLabels[business.commercial_plan_code]:'Sem plano comercial'
  const cycle=business.commercial_billing_cycle?cycleLabels[business.commercial_billing_cycle]:'—'
  const payment=business.commercial_payment_method?paymentLabels[business.commercial_payment_method]:'—'

  return <>
    <AppHeader title="Administração"/>
    <main className="platform-business-detail">
      <div className="platform-business-detail__topbar">
        <button className="platform-business-detail__back" type="button" onClick={()=>navigate('/admin')}><ArrowLeft size={17}/> Empresas</button>
        <button className="platform-admin__refresh" type="button" onClick={()=>void load()} disabled={loading} aria-label="Atualizar empresa"><RefreshCw size={18}/></button>
      </div>

      <section className="platform-business-detail__hero">
        <div>
          <span className="platform-admin__eyebrow"><ShieldCheck size={16}/> FICHA ADMINISTRATIVA</span>
          <h1>{business.name}</h1>
          <p>{business.owners.join(', ')||'Sem OWNER cadastrado'}</p>
          <div className="platform-business-detail__hero-meta">
            <span className={`platform-admin__status ${business.active?'is-active':'is-inactive'}`}>{business.active?'Ativa':'Inativa'}</span>
            <span className={`platform-admin__status ${business.commercial_access_active||business.access_mode==='paid'?'is-active':'is-inactive'}`}>{business.commercial_plan_code?plan:'Gratuito'}</span>
          </div>
        </div>
        <div className="platform-business-detail__hero-actions">
          {!business.commercial_access_active&&<button className="platform-admin__toggle" type="button" disabled={busy} onClick={()=>setAccessConfirmation(true)}>
            <KeyRound size={17}/>{business.access_mode==='free'?'Liberar funcionalidades':'Revogar liberação'}
          </button>}
          <button className="platform-admin__toggle" type="button" disabled={busy} onClick={()=>void toggleActive()}>
            <CirclePower size={17}/>{business.active?'Desativar empresa':'Reativar empresa'}
          </button>
        </div>
      </section>

      {actionError&&<p className="form-error platform-admin__error" role="alert">{actionError}</p>}

      <div className="platform-business-detail__grid">
        <InfoSection title="Conta e responsável" icon={<UserRound size={18}/>}>
          <DetailFacts items={[
            {label:'Empresa',value:business.name},
            {label:'Criada em',value:formatDate(business.created_at)},
            {label:'Responsável',value:business.lead_name||business.responsible_name||business.commercial_contact_name||'—'},
            {label:'OWNER / e-mail',value:business.owners.join(', ')||business.commercial_contact_email||'—'},
            {label:'Fuso horário',value:business.timezone},
            {label:'Última atividade registrada',value:formatDate(business.last_activity_at)},
          ]}/>
        </InfoSection>

        <InfoSection title="Contato" icon={<Mail size={18}/>}>
          <DetailFacts items={[
            {label:'Nome de contato',value:business.lead_name||business.commercial_contact_name||'—'},
            {label:'WhatsApp de contato',value:<>{formatPhone(business.contact_whatsapp)}{chatHref&&<a className="platform-business-detail__whatsapp" href={chatHref} target="_blank" rel="noreferrer"><MessageCircle size={14}/> Conversar</a>}</>},
            {label:'E-mail comercial',value:business.commercial_contact_email||business.owners[0]||'—'},
            {label:'Origem do contato',value:business.lead_source||'—'},
            {label:'Contato registrado em',value:formatDate(business.lead_created_at)},
          ]}/>
        </InfoSection>

        <InfoSection title="Plano e acesso" icon={<Building2 size={18}/>}>
          <DetailFacts items={[
            {label:'Plano',value:plan},
            {label:'Ciclo',value:cycle},
            {label:'Status da assinatura',value:business.commercial_subscription_status||'—'},
            {label:'Acesso comercial até',value:formatDate(business.commercial_access_until)},
            {label:'Acesso administrativo',value:business.access_mode==='paid'?'Liberado':'Gratuito'},
            {label:'Status de reembolso',value:business.commercial_refund_status||'—'},
            {label:'Reembolso solicitado em',value:formatDate(business.commercial_refund_requested_at)},
            {label:'Reembolsado em',value:formatDate(business.commercial_refunded_at)},
            {label:'Cancelamento solicitado em',value:formatDate(business.commercial_cancellation_requested_at)},
          ]}/>
        </InfoSection>

        <InfoSection title="Pagamento e cobrança" icon={<CreditCard size={18}/>}>
          <DetailFacts items={[
            {label:'Forma de pagamento',value:payment},
            {label:'Valor',value:formatMoney(business.commercial_amount_cents)},
            {label:'Pagamento confirmado em',value:formatDate(business.commercial_paid_at)},
            {label:'Status do checkout',value:business.commercial_checkout_status||'—'},
            {label:'Checkout criado em',value:formatDate(business.commercial_checkout_created_at)},
            {label:'Assinatura criada em',value:formatDate(business.commercial_subscription_created_at)},
            {label:'Pagamento Asaas',value:business.commercial_provider_payment_id?<code>{business.commercial_provider_payment_id}</code>:'—'},
            {label:'Assinatura Asaas',value:business.commercial_provider_subscription_id?<code>{business.commercial_provider_subscription_id}</code>:'—'},
            {label:'Cliente Asaas',value:business.commercial_provider_customer_id?<code>{business.commercial_provider_customer_id}</code>:'—'},
          ]}/>
        </InfoSection>

        <InfoSection title="WhatsApp / Meta" icon={<Smartphone size={18}/>}>
          <DetailFacts items={[
            {label:'Status',value:whatsappLabels[business.whatsapp_status]},
            {label:'Número conectado',value:formatPhone(business.whatsapp_display_phone)},
            {label:'Modo',value:business.whatsapp_mode==='coexistence'?'Coexistência':business.whatsapp_mode==='api_only'?'API exclusiva':'—'},
            {label:'Conectado em',value:formatDate(business.whatsapp_connected_at)},
            {label:'Desconectado em',value:formatDate(business.whatsapp_disconnected_at)},
            {label:'Revisão Meta',value:business.whatsapp_meta_review_status||'—'},
            {label:'Último erro',value:business.whatsapp_last_error_code||'—'},
          ]}/>
        </InfoSection>

        <InfoSection title="Aquisição" icon={<Megaphone size={18}/>}>
          <DetailFacts items={[
            {label:'Origem',value:business.acquisition_source||'—'},
            {label:'Mídia',value:business.acquisition_medium||'—'},
            {label:'Campanha',value:business.acquisition_campaign||'—'},
            {label:'Anúncio / criativo',value:business.acquisition_content||'—'},
            {label:'Conjunto / termo',value:business.acquisition_term||'—'},
            {label:'Campaign ID',value:business.acquisition_campaign_id?<code>{business.acquisition_campaign_id}</code>:'—'},
            {label:'Adset ID',value:business.acquisition_adset_id?<code>{business.acquisition_adset_id}</code>:'—'},
            {label:'Ad ID',value:business.acquisition_ad_id?<code>{business.acquisition_ad_id}</code>:'—'},
            {label:'Posicionamento',value:business.acquisition_placement||'—'},
            {label:'Ângulo',value:business.acquisition_angle||'—'},
            {label:'Perfil do quiz',value:business.acquisition_quiz_profile||'—'},
          ]}/>
        </InfoSection>

        <InfoSection title="Jornada no funil" icon={<CalendarDays size={18}/>} wide>
          <DetailFacts items={[
            {label:'Conta criada / signup concluído',value:formatDate(business.signup_completed_at||business.created_at)},
            {label:'Demonstração iniciada',value:formatDate(business.demo_started_at)},
            {label:'Checkout iniciado',value:formatDate(business.checkout_started_at)},
            {label:'Pagamento confirmado',value:formatDate(business.payment_confirmed_at||business.commercial_paid_at)},
            {label:'WhatsApp conectado',value:formatDate(business.whatsapp_connected_event_at||business.whatsapp_connected_at)},
            {label:'Última atividade de tracking',value:formatDate(business.last_activity_at)},
          ]}/>
        </InfoSection>
      </div>
    </main>

    <BottomSheet
      open={accessConfirmation}
      title={business.access_mode==='free'?'Liberar funcionalidades':'Revogar liberação'}
      description={business.name}
      onClose={()=>setAccessConfirmation(false)}
    >
      <div className="platform-admin__access-confirmation">
        <p>{business.access_mode==='free'
          ?'Liberar funcionalidades pagas para esta empresa sem criar cobrança ou assinatura?'
          :'Revogar a liberação e retornar esta empresa ao modo gratuito?'}</p>
        <p>Esta ação altera somente o acesso operacional. Nenhum pagamento ou assinatura será criado ou modificado.</p>
        <div>
          <button className="platform-admin__toggle" type="button" onClick={()=>setAccessConfirmation(false)}>Cancelar</button>
          <PrimaryButton onClick={()=>void confirmAccess()}>{business.access_mode==='free'?'Confirmar liberação':'Confirmar revogação'}</PrimaryButton>
        </div>
      </div>
    </BottomSheet>
  </>
}
