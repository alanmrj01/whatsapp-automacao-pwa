import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  Copy,
  CreditCard,
  ExternalLink,
  Landmark,
  LockKeyhole,
  QrCode,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type FormEvent,
  type RefObject,
  type SetStateAction,
} from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandMark } from '../../components/BrandMark'
import { api } from '../../lib/api'
import { ApiError } from '../../lib/httpClient'
import { useAuth } from '../auth/useAuth'
import {
  billingCycles,
  cyclePrice,
  formatBRL,
  isPurchasablePlan,
  plans,
  type BillingCycle,
  type PlanId,
} from './planCatalog'
import {
  copyPixPayload,
  createPixQrDataUrl,
  isTerminalCheckoutStatus,
  PIX_STATUS_MAX_POLLS,
  PIX_STATUS_POLL_MS,
  type CheckoutStatus,
} from './pixAutomatic'

type CheckoutMode = 'hosted'|'native'|'pix'
type PaymentMethod = 'credit_card'|'pix'|'pix_automatic'

type CheckoutResponse = {
  checkout_id:string
  payment_method:PaymentMethod
  checkout_mode?:CheckoutMode
  checkout_url?:string|null
  pix_authorization_id?:string|null
  pix_payload?:string|null
  pix_expires_at?:string|null
  expires_at?:string|null
  plan:PlanId
  cycle:BillingCycle
  amount_cents:number
  initial_payment_received?:boolean
}

type CheckoutStatusResponse = {
  checkout_id:string
  status:CheckoutStatus
  payment_method:PaymentMethod
  plan:PlanId
  cycle:BillingCycle
  expires_at?:string|null
  initial_payment_received:boolean
}

type CheckoutProfile = {
  email:string
  business_name:string
  payer_name:string|null
  postal_code:string|null
  address_number:string|null
  pix_available:boolean
  pix_automatic_available:boolean
  native_card_checkout_available:boolean
}

type CheckoutAttempt = {method:PaymentMethod;key:string}

function isBillingCycle(value:string|null):value is BillingCycle {
  return value === 'monthly' || value === 'quarterly' || value === 'annual'
}

function isPlanId(value:string|null):value is PlanId {
  return value === 'basic' || value === 'plus'
}

function digits(value:string,max:number) {
  return value.replace(/\D/g,'').slice(0,max)
}

function formatDocument(value:string) {
  const valueDigits=digits(value,14)
  if(valueDigits.length<=11) {
    return valueDigits
      .replace(/^(\d{3})(\d)/,'$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3')
      .replace(/\.(\d{3})(\d)/,'.$1-$2')
  }
  return valueDigits
    .replace(/^(\d{2})(\d)/,'$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3')
    .replace(/\.(\d{3})(\d)/,'.$1/$2')
    .replace(/(\d{4})(\d)/,'$1-$2')
}

function formatPostalCode(value:string) {
  const valueDigits=digits(value,8)
  return valueDigits.length>5?valueDigits.replace(/^(\d{5})(\d)/,'$1-$2'):valueDigits
}

function formatPhone(value:string) {
  const valueDigits=digits(value,11)
  if(valueDigits.length<=10) {
    return valueDigits
      .replace(/^(\d{2})(\d)/,'($1) $2')
      .replace(/(\d{4})(\d)/,'$1-$2')
  }
  return valueDigits
    .replace(/^(\d{2})(\d)/,'($1) $2')
    .replace(/(\d{5})(\d)/,'$1-$2')
}

function formatCardNumber(value:string) {
  return digits(value,19).replace(/(\d{4})(?=\d)/g,'$1 ').trim()
}

function isValidCardNumber(value:string) {
  const number=digits(value,19)
  return number.length>=13&&number.length<=19
}

function isCardNumberComplete(value:string) {
  const number=digits(value,19)
  if(/^3[47]/.test(number))return number.length===15
  if(/^4/.test(number))return number.length===16
  if(/^(5[1-5]|2(?:2[2-9]|[3-6]\d|7[01]|720))/.test(number))return number.length===16
  return number.length===19
}

function cardSecurityCodeLimit(cardNumber:string) {
  return /^3[47]/.test(digits(cardNumber,19))?4:3
}

function focusNext(ref:{current:HTMLInputElement|null}) {
  window.requestAnimationFrame(()=>ref.current?.focus())
}

function formatRemaining(seconds:number) {
  const safe=Math.max(0,seconds)
  const minutes=Math.floor(safe/60)
  const rest=safe%60
  return `${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}`
}

export function CheckoutPage() {
  const [params]=useSearchParams()
  const navigate=useNavigate()
  const {membership,syncSession}=useAuth()
  const planId=params.get('plan')
  const cycleParam=params.get('cycle')
  const checkoutAttempt=useRef<CheckoutAttempt>({
    method:'credit_card',
    key:crypto.randomUUID(),
  })
  const finalizing=useRef(false)
  const paymentMethodInitialized=useRef(false)

  const [paymentMethod,setPaymentMethod]=useState<PaymentMethod>('credit_card')
  const [profile,setProfile]=useState<CheckoutProfile|null>(null)
  const [checkout,setCheckout]=useState<CheckoutResponse|null>(null)
  const [profileLoading,setProfileLoading]=useState(true)
  const [checkoutLoading,setCheckoutLoading]=useState(false)
  const [remaining,setRemaining]=useState<number|null>(null)
  const [error,setError]=useState<string|null>(null)
  const [submitting,setSubmitting]=useState(false)
  const [adminAccessNotice,setAdminAccessNotice]=useState(false)
  const [openStep,setOpenStep]=useState<1|2>(1)
  const [pixStatus,setPixStatus]=useState<CheckoutStatus|null>(null)
  const [pixQrCode,setPixQrCode]=useState<string|null>(null)
  const [pixQrLoading,setPixQrLoading]=useState(false)
  const [copyState,setCopyState]=useState<'idle'|'copied'|'failed'>('idle')
  const [initialPaymentReceived,setInitialPaymentReceived]=useState(false)
  const [cancelingPix,setCancelingPix]=useState(false)
  const [pixReconciliationPending,setPixReconciliationPending]=useState(false)
  const payerDocumentRef=useRef<HTMLInputElement|null>(null)
  const payerPhoneRef=useRef<HTMLInputElement|null>(null)
  const postalCodeRef=useRef<HTMLInputElement|null>(null)
  const addressNumberRef=useRef<HTMLInputElement|null>(null)
  const addressComplementRef=useRef<HTMLInputElement|null>(null)
  const cardHolderNameRef=useRef<HTMLInputElement|null>(null)
  const cardNumberRef=useRef<HTMLInputElement|null>(null)
  const expiryMonthRef=useRef<HTMLInputElement|null>(null)
  const expiryYearRef=useRef<HTMLInputElement|null>(null)
  const ccvRef=useRef<HTMLInputElement|null>(null)
  const submitRef=useRef<HTMLButtonElement|null>(null)

  const [payerName,setPayerName]=useState('')
  const [payerDocument,setPayerDocument]=useState('')
  const [payerPhone,setPayerPhone]=useState('')
  const [postalCode,setPostalCode]=useState('')
  const [addressNumber,setAddressNumber]=useState('')
  const [addressComplement,setAddressComplement]=useState('')
  const [cardHolderName,setCardHolderName]=useState('')
  const [cardNumber,setCardNumber]=useState('')
  const [expiryMonth,setExpiryMonth]=useState('')
  const [expiryYear,setExpiryYear]=useState('')
  const [ccv,setCcv]=useState('')

  const validSelection=isPlanId(planId)&&isBillingCycle(cycleParam)&&isPurchasablePlan(planId)
  const pixAvailable=profile?.pix_available===true
  const pixAutomaticAvailable=profile?.pix_automatic_available===true
  const nativeCardCheckoutAvailable=profile?.native_card_checkout_available===true

  useEffect(()=>{
    void syncSession().catch(()=>undefined)
  },[syncSession])

  const loadProfile=useCallback(async()=>{
    if(!isPlanId(planId)||!isBillingCycle(cycleParam)||!isPurchasablePlan(planId))return
    setProfileLoading(true)
    setError(null)
    try {
      const nextProfile=await api.request<CheckoutProfile>('/billing/checkout-profile')
      setProfile(nextProfile)
      if(!paymentMethodInitialized.current) {
        const preferredMethod:PaymentMethod=nextProfile.pix_automatic_available
          ?'pix_automatic'
          :nextProfile.pix_available
            ?'pix'
            :'credit_card'
        setPaymentMethod(preferredMethod)
        checkoutAttempt.current={method:preferredMethod,key:crypto.randomUUID()}
        paymentMethodInitialized.current=true
      }
      setPayerName(current=>current||nextProfile.payer_name||'')
      setCardHolderName(current=>current||nextProfile.payer_name||'')
      setPostalCode(current=>current||formatPostalCode(nextProfile.postal_code??''))
      setAddressNumber(current=>current||nextProfile.address_number||'')
    } catch (caught) {
      if(caught instanceof ApiError&&caught.status===401) {
        setError('Sua sessão expirou. Entre novamente para continuar.')
      } else {
        setError('Não foi possível carregar seus dados agora. Tente novamente.')
      }
    } finally {
      setProfileLoading(false)
    }
  },[cycleParam,planId])

  useEffect(()=>{
    if(!validSelection)return
    void loadProfile()
  },[loadProfile,validSelection])

  const prepareCheckout=useCallback(async({
    method,
    key,
    payerNameValue,
    payerDocumentValue,
  }:{
    method:PaymentMethod
    key:string
    payerNameValue?:string
    payerDocumentValue?:string
  })=>{
    if(!isPlanId(planId)||!isBillingCycle(cycleParam)||!isPurchasablePlan(planId))return null
    setCheckoutLoading(true)
    setError(null)
    setAdminAccessNotice(false)
    setPixReconciliationPending(false)
    try {
      const nextCheckout=await api.request<CheckoutResponse>('/billing/checkouts',{
        method:'POST',
        headers:{'Idempotency-Key':key},
        body:JSON.stringify({
          plan:planId,
          cycle:cycleParam,
          payment_method:method,
          return_origin:window.location.origin,
          ...(method==='pix'||method==='pix_automatic'?{
            payer_name:payerNameValue,
            payer_cpf_cnpj:payerDocumentValue,
          }:{}),
        }),
      })
      if(nextCheckout.payment_method!==method)throw new Error('Unexpected payment method')
      if(method==='pix_automatic'&&(
        nextCheckout.checkout_mode!=='pix'||
        !nextCheckout.pix_authorization_id||
        !nextCheckout.pix_payload?.trim()
      ))throw new Error('Invalid Pix Automatic checkout')
      if(method==='pix'&&(
        nextCheckout.checkout_mode!=='pix'||
        !nextCheckout.pix_payload?.trim()
      ))throw new Error('Invalid Pix checkout')
      setCheckout(nextCheckout)
      setPixStatus(method==='pix'||method==='pix_automatic'?'active':null)
      setInitialPaymentReceived(nextCheckout.initial_payment_received===true)
      setCopyState('idle')
      return nextCheckout
    } catch (caught) {
      if(caught instanceof ApiError&&caught.status===401) {
        setError('Sua sessão expirou. Entre novamente para continuar.')
      } else if(
        caught instanceof ApiError&&
        (method==='pix'||method==='pix_automatic')&&
        (caught.detail==='Pix Automatic authorization is being reconciled'||caught.detail==='Pix payment is being reconciled')
      ) {
        setPixReconciliationPending(true)
        setError(null)
      } else if(
        caught instanceof ApiError&&
        method==='pix_automatic'&&
        (caught.status===409||caught.status===502||caught.status===503)
      ) {
        setError('O Pix Automático está temporariamente indisponível pela plataforma que processa os pagamentos. Você pode concluir com cartão de crédito.')
      } else if(caught instanceof ApiError&&caught.status===409) {
        setError(method==='credit_card'
          ?'Existe uma tentativa de pagamento em andamento nesta empresa. Aguarde a confirmação antes de iniciar outra.'
          :caught.detail||'Não foi possível preparar este Pix agora.')
      } else if(method==='pix_automatic') {
        setError('A plataforma que processa os pagamentos não respondeu ao Pix Automático agora. Você pode usar Pix comum ou cartão de crédito.')
      } else if(method==='pix') {
        setError('A plataforma que processa os pagamentos não respondeu ao Pix agora. Tente novamente em alguns instantes ou use cartão de crédito.')
      } else {
        setError('Não foi possível preparar seu checkout agora. Tente novamente.')
      }
      return null
    } finally {
      setCheckoutLoading(false)
    }
  },[cycleParam,planId])

  const expiration=checkout?.payment_method==='pix'||checkout?.payment_method==='pix_automatic'
    ?checkout.pix_expires_at??checkout.expires_at
    :checkout?.expires_at

  useEffect(()=>{
    if(!expiration) {
      setRemaining(null)
      return
    }
    const expiresAt=new Date(expiration).getTime()
    const tick=()=>setRemaining(Math.max(0,Math.ceil((expiresAt-Date.now())/1000)))
    tick()
    const timer=window.setInterval(tick,1000)
    return()=>window.clearInterval(timer)
  },[expiration])

  useEffect(()=>{
    const payload=checkout?.payment_method==='pix'||checkout?.payment_method==='pix_automatic'?checkout.pix_payload:null
    if(!payload)return
    let active=true
    setPixQrCode(null)
    setPixQrLoading(true)
    void createPixQrDataUrl(payload)
      .then(dataUrl=>{if(active)setPixQrCode(dataUrl)})
      .catch(()=>{if(active)setError('Não conseguimos exibir o QR Code agora. Gere um novo Pix.')})
      .finally(()=>{if(active)setPixQrLoading(false)})
    return()=>{active=false}
  },[checkout?.payment_method,checkout?.pix_payload])

  const expired=remaining===0&&!initialPaymentReceived

  useEffect(()=>{
    const checkoutId=checkout?.payment_method==='pix'||checkout?.payment_method==='pix_automatic'?checkout.checkout_id:null
    if(!checkoutId||expired)return
    let cancelled=false
    let timer:number|undefined
    let attempts=0

    const schedule=()=>{
      if(!cancelled&&attempts<PIX_STATUS_MAX_POLLS)timer=window.setTimeout(check,PIX_STATUS_POLL_MS)
      else if(!cancelled&&attempts>=PIX_STATUS_MAX_POLLS) {
        setError('Não conseguimos confirmar automaticamente. Verifique novamente ou gere um novo Pix.')
      }
    }
    const check=async()=>{
      attempts++
      try {
        const current=await api.request<CheckoutStatusResponse>(`/billing/checkouts/${checkoutId}`)
        if(cancelled||current.payment_method!==checkout?.payment_method)return
        setPixStatus(current.status)
        setInitialPaymentReceived(current.initial_payment_received)
        if(current.status==='paid') {
          if(finalizing.current)return
          finalizing.current=true
          try {
            await syncSession()
            if(!cancelled)navigate('/app/onboarding',{replace:true})
          } catch {
            finalizing.current=false
            schedule()
          }
          return
        }
        if(isTerminalCheckoutStatus(current.status))return
      } catch {
        if(cancelled)return
      }
      schedule()
    }
    schedule()
    return()=>{
      cancelled=true
      if(timer)window.clearTimeout(timer)
    }
  },[checkout?.checkout_id,checkout?.payment_method,expired,navigate,syncSession])

  const identificationComplete=
    payerName.trim().length>=2&&
    [11,14].includes(digits(payerDocument,14).length)&&
    [10,11].includes(digits(payerPhone,11).length)&&
    !!profile?.email&&
    digits(postalCode,8).length===8&&
    !!addressNumber.trim()

  useEffect(()=>{
    if(!identificationComplete||openStep!==1)return
    const timer=window.setTimeout(()=>setOpenStep(2),700)
    return()=>window.clearTimeout(timer)
  },[identificationComplete,openStep])

  if(!isPlanId(planId)||!isBillingCycle(cycleParam))return <Navigate to="/app/mais/plano" replace/>
  if(!isPurchasablePlan(planId))return <Navigate to={`/app/mais/plano?cycle=${cycleParam}&unavailable=${planId}`} replace/>
  const plan=plans.find(item=>item.id===planId)
  if(!plan)return <Navigate to="/app/mais/plano" replace/>

  const price=cyclePrice(plan,cycleParam)
  const cycle=billingCycles.find(item=>item.id===cycleParam)
  const hostedCheckout=paymentMethod==='credit_card'&&(
    checkout?.checkout_mode==='hosted'||(!checkout?.checkout_mode&&!!checkout?.checkout_url)
  )

  const rotateAttempt=(method:PaymentMethod)=>{
    const key=crypto.randomUUID()
    checkoutAttempt.current={method,key}
    return key
  }

  const clearPaymentState=()=>{
    finalizing.current=false
    setCheckout(null)
    setRemaining(null)
    setError(null)
    setSubmitting(false)
    setAdminAccessNotice(false)
    setPixStatus(null)
    setPixQrCode(null)
    setPixQrLoading(false)
    setCopyState('idle')
    setInitialPaymentReceived(false)
    setPixReconciliationPending(false)
  }

  const prepareCardCheckout=(key:string)=>prepareCheckout({method:'credit_card',key})

  const selectPaymentMethod=(method:PaymentMethod)=>{
    clearPaymentState()
    setPaymentMethod(method)
    setOpenStep(1)
    rotateAttempt(method)
    if(method==='pix'||method==='pix_automatic') {
      setCardNumber('')
      setExpiryMonth('')
      setExpiryYear('')
      setCcv('')
    }
  }

  const changePaymentMethod=async(method:PaymentMethod)=>{
    if(method==='pix'&&!pixAvailable)return
    if(method==='pix_automatic'&&!pixAutomaticAvailable)return
    if(method==='credit_card'&&!nativeCardCheckoutAvailable)return
    if(method===paymentMethod||cancelingPix||checkoutLoading)return
    if(pixReconciliationPending) {
      setError('A solicitação de pagamento Pix ainda está sendo confirmada. Não faça outro pagamento agora.')
      return
    }
    if(
      checkout&&
      (checkout.payment_method==='pix'||checkout.payment_method==='pix_automatic')&&
      method!==checkout.payment_method
    ) {
      if(initialPaymentReceived) {
        setError(paymentMethod==='pix_automatic'?'O primeiro pagamento já foi recebido. Não faça outro pagamento enquanto regularizamos a autorização.':'O pagamento já foi recebido. Não faça outro pagamento enquanto confirmamos a liberação da assinatura.')
        return
      }
      setCancelingPix(true)
      setError(null)
      try {
        const canceled=await api.request<CheckoutStatusResponse>(
          `/billing/checkouts/${checkout.checkout_id}/cancel`,
          {method:'POST'},
        )
        if(!['canceled','expired','failed'].includes(canceled.status)) {
          throw new Error('Unexpected Pix cancellation status')
        }
        selectPaymentMethod(method)
      } catch (caught) {
        setError(caught instanceof ApiError&&caught.status===409
          ?'Este Pix não pode ser abandonado agora. Não faça outro pagamento enquanto verificamos a situação.'
          :'Não foi possível cancelar o Pix atual. Continue com ele ou tente novamente em alguns instantes.')
      } finally {
        setCancelingPix(false)
      }
      return
    }
    selectPaymentMethod(method)
  }

  const generatePix=async(key=checkoutAttempt.current.key)=>{
    if(paymentMethod==='pix'&&!pixAvailable)return
    if(paymentMethod==='pix_automatic'&&!pixAutomaticAvailable)return
    if(paymentMethod!=='pix'&&paymentMethod!=='pix_automatic')return
    if(!identificationComplete||submitting||checkoutLoading)return
    if(membership?.admin_full_access) {
      setError(null)
      setAdminAccessNotice(true)
      return
    }
    setSubmitting(true)
    const nextCheckout=await prepareCheckout({
      method:paymentMethod,
      key,
      payerNameValue:payerName.trim(),
      payerDocumentValue:digits(payerDocument,14),
    })
    setSubmitting(false)
    if(nextCheckout)setOpenStep(2)
  }

  const restart=async()=>{
    if((paymentMethod==='pix'||paymentMethod==='pix_automatic')&&checkout) {
      if(initialPaymentReceived) {
        setError('O primeiro pagamento já foi recebido. Não faça outro pagamento enquanto regularizamos a autorização.')
        return
      }
      setCancelingPix(true)
      setError(null)
      try {
        const canceled=await api.request<CheckoutStatusResponse>(
          `/billing/checkouts/${checkout.checkout_id}/cancel`,
          {method:'POST'},
        )
        if(!['canceled','expired','failed'].includes(canceled.status)) {
          throw new Error('Unexpected Pix cancellation status')
        }
      } catch {
        setError('Não conseguimos encerrar o Pix anterior. Aguarde alguns instantes e tente novamente.')
        setCancelingPix(false)
        return
      }
      setCancelingPix(false)
    }
    clearPaymentState()
    setOpenStep(paymentMethod==='pix'||paymentMethod==='pix_automatic'?2:1)
    const key=rotateAttempt(paymentMethod)
    if(paymentMethod==='pix'||paymentMethod==='pix_automatic')await generatePix(key)
  }

  const submit=async(event:FormEvent)=>{
    event.preventDefault()
    if(submitting||expired)return
    if((paymentMethod==='pix'||paymentMethod==='pix_automatic')&&pixReconciliationPending)return
    if(paymentMethod==='pix'||paymentMethod==='pix_automatic') {
      if(!checkout)await generatePix()
      return
    }

    if(membership?.admin_full_access) {
      setError(null)
      setAdminAccessNotice(true)
      setCardNumber('')
      setExpiryMonth('')
      setExpiryYear('')
      setCcv('')
      return
    }

    const documentDigits=digits(payerDocument,14)
    const phoneDigits=digits(payerPhone,11)
    const postalDigits=digits(postalCode,8)
    const cardDigits=digits(cardNumber,19)
    const monthDigits=digits(expiryMonth,2)
    const yearDigits=digits(expiryYear,4)
    const ccvDigits=digits(ccv,4)
    const identificationInvalid=
      payerName.trim().length<2||![11,14].includes(documentDigits.length)||
      ![10,11].includes(phoneDigits.length)||postalDigits.length!==8||
      !addressNumber.trim()
    const nativeCardInvalid=
      nativeCardCheckoutAvailable&&(
        cardHolderName.trim().length<2||
        !isValidCardNumber(cardDigits)||!monthDigits||!yearDigits||
        ccvDigits.length!==cardSecurityCodeLimit(cardDigits)
      )
    if(identificationInvalid||nativeCardInvalid) {
      setError('Confira os campos obrigatórios antes de continuar.')
      return
    }

    if(!nativeCardCheckoutAvailable) {
      setError('O cartão está temporariamente indisponível pela plataforma que processa os pagamentos.')
      return
    }

    setSubmitting(true)
    setError(null)
    setAdminAccessNotice(false)
    try {
      const cardCheckout=checkout??await prepareCardCheckout(checkoutAttempt.current.key)
      if(!cardCheckout) {
        setSubmitting(false)
        return
      }
      const checkoutMode=cardCheckout.checkout_mode??(cardCheckout.checkout_url?'hosted':null)
      if(checkoutMode==='hosted') {
        setError('O cartão está temporariamente indisponível pela plataforma que processa os pagamentos. Tente novamente em alguns instantes.')
        setSubmitting(false)
        return
      }
      if(checkoutMode!=='native') {
        setError('Esta forma de pagamento ainda não está disponível.')
        setSubmitting(false)
        return
      }
      if(!nativeCardCheckoutAvailable) {
        setError('O cartão está temporariamente indisponível pela plataforma que processa os pagamentos.')
        setSubmitting(false)
        return
      }
      await api.request(`/billing/checkouts/${cardCheckout.checkout_id}/credit-card`,{
        method:'POST',
        body:JSON.stringify({
          payer_name:payerName.trim(),
          payer_cpf_cnpj:documentDigits,
          payer_postal_code:postalDigits,
          payer_address_number:addressNumber.trim(),
          payer_address_complement:addressComplement.trim()||null,
          payer_phone:phoneDigits,
          card_holder_name:cardHolderName.trim(),
          card_number:cardDigits,
          card_expiry_month:monthDigits,
          card_expiry_year:yearDigits,
          card_ccv:ccvDigits,
        }),
      })
      setCcv('')
      navigate(`/app/checkout/retorno?state=success&checkout=${cardCheckout.checkout_id}`,{replace:true})
    } catch (caught) {
      setCcv('')
      if(caught instanceof ApiError&&caught.status===422) {
        setError('Não foi possível autorizar o cartão. Confira os dados ou tente outro cartão.')
      } else if(caught instanceof ApiError&&caught.status===409&&caught.detail==='Admin full access is active; a paid plan is not required') {
        setAdminAccessNotice(true)
        setCardNumber('')
        setExpiryMonth('')
        setExpiryYear('')
      } else if(caught instanceof ApiError&&caught.status===409) {
        setError(caught.detail==='Checkout expired'
          ?'Esta sessão expirou. Gere uma nova sessão para continuar.'
          :'Estamos confirmando uma tentativa anterior com a plataforma de pagamento. Não tente pagar novamente agora.')
      } else if(caught instanceof ApiError&&caught.status===502) {
        setError(caught.detail==='Payment confirmation is still being reconciled'
          ?'Estamos confirmando a resposta da plataforma de pagamento. Não tente pagar novamente agora.'
          :'A plataforma que processa os pagamentos está temporariamente indisponível. Tente novamente em alguns instantes.')
      } else {
        setError('Não foi possível concluir agora. Seus dados do cartão não foram salvos. Tente novamente em alguns instantes.')
      }
      setSubmitting(false)
    }
  }

  const copyPix=async()=>{
    if(!checkout?.pix_payload)return
    try {
      await copyPixPayload(checkout.pix_payload)
      setCopyState('copied')
      window.setTimeout(()=>setCopyState('idle'),2500)
    } catch {
      setCopyState('failed')
    }
  }

  return <main className="native-checkout-shell">
    <header className="native-checkout-header">
      <Link className="native-checkout-back" to={`/app/mais/plano?cycle=${cycleParam}`} aria-label="Voltar aos planos"><ArrowLeft size={20}/></Link>
      <div className="native-checkout-brand"><BrandMark/><div><strong>ALOVIA</strong></div></div>
    </header>

    <div className="native-checkout-layout">
      <section className="native-checkout-main">
        <div className="native-checkout-intro">
          <span className="eyebrow">Finalize sua assinatura</span>
          <h1>Seu atendimento automático começa aqui.</h1>
          <p>Revise seus dados e conclua o pagamento. A renovação segue o período escolhido.</p>
        </div>

        <section className="checkout-guarantee-card" aria-label="Garantia de 7 dias">
          <BadgeCheck size={22} aria-hidden="true"/>
          <div><strong>Garantia de 7 dias</strong><span>Se o ALOVIA não ajudar no seu processo, devolvemos seu dinheiro.</span></div>
        </section>

        {profileLoading&&<LoadingCard title="Carregando seus dados…" text="Seu método de pagamento será escolhido na próxima etapa."/>}

        {!profileLoading&&!profile&&<section className="native-checkout-card checkout-expired-card">
          <div><strong>Não conseguimos carregar seus dados.</strong><span>{error??'Tente novamente em alguns instantes.'}</span></div>
          <button className="secondary-button" type="button" onClick={()=>void loadProfile()}><RefreshCcw size={17}/>Tentar novamente</button>
        </section>}

        {!profileLoading&&profile&&<section className="native-checkout-card checkout-method-card" aria-labelledby="checkout-payment-method-title">
          <div className="checkout-method-heading"><span className="eyebrow">Forma de pagamento</span><h2 id="checkout-payment-method-title">Como você prefere pagar?</h2></div>
          <div className="checkout-method-options">
            {pixAutomaticAvailable&&<label className={`checkout-method-option${paymentMethod==='pix_automatic'?' is-selected':''}`}>
              <input type="radio" name="payment-method" value="pix_automatic" checked={paymentMethod==='pix_automatic'} disabled={checkoutLoading||cancelingPix} onChange={()=>void changePaymentMethod('pix_automatic')}/>
              <span className="checkout-method-icon"><Landmark size={22}/></span>
              <span className="checkout-method-copy">
                <span className="checkout-method-title"><strong>Pix Automático</strong><small>Recomendado</small></span>
                <span>Pague o primeiro Pix e autorize as próximas renovações automaticamente.</span>
              </span>
            </label>}
            <label className={`checkout-method-option${paymentMethod==='pix'?' is-selected':''}${!pixAvailable?' is-disabled':''}`}>
              <input type="radio" name="payment-method" value="pix" checked={paymentMethod==='pix'} disabled={!pixAvailable||checkoutLoading||cancelingPix} onChange={()=>void changePaymentMethod('pix')}/>
              <span className="checkout-method-icon"><QrCode size={22}/></span>
              <span className="checkout-method-copy">
                <span className="checkout-method-title"><strong>Pix</strong><small>{!pixAutomaticAvailable?'Recomendado':''}</small></span>
                <span>Pague agora por Pix. Nas próximas renovações, geraremos um novo Pix para pagamento.</span>
              </span>
            </label>
            <label className={`checkout-method-option${paymentMethod==='credit_card'?' is-selected':''}${!nativeCardCheckoutAvailable?' is-disabled':''}`}>
              <input type="radio" name="payment-method" value="credit_card" checked={paymentMethod==='credit_card'} disabled={!nativeCardCheckoutAvailable||checkoutLoading||cancelingPix||initialPaymentReceived||pixReconciliationPending} onChange={()=>void changePaymentMethod('credit_card')}/>
              <span className="checkout-method-icon"><CreditCard size={22}/></span>
              <span className="checkout-method-copy"><strong>Cartão de crédito</strong><span>{nativeCardCheckoutAvailable?'Renovação automática no cartão.':'Temporariamente indisponível pela plataforma que processa os pagamentos.'}</span></span>
            </label>
            {!pixAutomaticAvailable&&<div className="checkout-method-option is-disabled" role="status" aria-label="Pix Automático temporariamente indisponível">
              <span className="checkout-method-icon"><Landmark size={22}/></span>
              <span className="checkout-method-copy">
                <span className="checkout-method-title"><strong>Pix Automático</strong><small>Indisponível</small></span>
                <span>Temporariamente indisponível pela plataforma que processa os pagamentos.</span>
              </span>
            </div>}
          </div>
        </section>}

        {checkoutLoading&&<LoadingCard title={paymentMethod==='pix_automatic'?'Gerando seu Pix Automático…':paymentMethod==='pix'?'Gerando seu Pix…':'Preparando o pagamento com cartão…'} text="Isso leva só alguns segundos."/>}

        {!checkoutLoading&&expired&&checkout&&<section className="native-checkout-card checkout-expired-card">
          <Clock3 size={24}/><div><strong>{paymentMethod==='pix'||paymentMethod==='pix_automatic'?'O código Pix expirou.':'Esta sessão expirou.'}</strong><span>{paymentMethod==='pix_automatic'?'Gere um novo Pix Automático para continuar.':paymentMethod==='pix'?'Gere um novo Pix para continuar.':'Gere uma nova sessão para manter o pagamento protegido e atualizado.'}</span></div>
          <button className="primary-button" type="button" onClick={restart}><RefreshCcw size={17}/>{paymentMethod==='pix'||paymentMethod==='pix_automatic'?'Gerar novo Pix':'Gerar nova sessão'}</button>
        </section>}

        {!checkoutLoading&&!expired&&hostedCheckout&&<section className="native-checkout-card checkout-expired-card">
          <ShieldCheck size={24} aria-hidden="true"/><div><strong>Cartão temporariamente indisponível</strong><span>A plataforma que processa os pagamentos não liberou o checkout nativo nesta tentativa. Nenhum pagamento foi concluído.</span></div>
          <button className="secondary-button" type="button" onClick={restart}><RefreshCcw size={17}/>Tentar novamente</button>
        </section>}

        {!profileLoading&&!checkoutLoading&&!expired&&!hostedCheckout&&profile&&<form className="native-checkout-form" onSubmit={submit} noValidate>
          <IdentificationStep
            open={openStep===1}
            complete={identificationComplete}
            profile={profile}
            values={{payerName,payerDocument,payerPhone,postalCode,addressNumber,addressComplement,cardHolderName}}
            refs={{payerDocumentRef,payerPhoneRef,postalCodeRef,addressNumberRef,addressComplementRef,cardHolderNameRef}}
            onOpen={()=>setOpenStep(1)}
            onAdvance={()=>{if(identificationComplete)setOpenStep(2)}}
            setters={{setPayerName,setPayerDocument,setPayerPhone,setPostalCode,setAddressNumber,setAddressComplement,setCardHolderName}}
            focusCard={paymentMethod==='credit_card'&&nativeCardCheckoutAvailable}
          />

          <section className={`native-checkout-card checkout-accordion-card${openStep===2?' is-open':''}`}>
            <button className="checkout-section-toggle" type="button" aria-expanded={openStep===2} aria-controls="checkout-payment-fields" disabled={!identificationComplete} onClick={()=>identificationComplete&&setOpenStep(2)}>
              <span className="checkout-step-number">2</span>
              <span className="checkout-step-copy"><strong>{paymentMethod==='pix_automatic'?'Pix Automático':paymentMethod==='pix'?'Pix':'Cartão de crédito'}</strong><small>{identificationComplete?paymentMethod==='pix_automatic'?'Pague o primeiro Pix e autorize as próximas renovações automaticamente.':paymentMethod==='pix'?'Pague agora. Nas próximas renovações, geraremos um novo Pix.':nativeCardCheckoutAvailable?'Cobrança recorrente processada com segurança.':'Forma de pagamento temporariamente indisponível.':'Conclua a identificação primeiro'}</small></span>
              {openStep===2?<ChevronUp size={20}/>:<ChevronDown size={20}/>}
            </button>

            <div id="checkout-payment-fields" className="checkout-accordion-content" hidden={openStep!==2}>
              {paymentMethod==='pix'||paymentMethod==='pix_automatic'
                ?<PixPaymentContent
                  checkout={checkout}
                  automatic={paymentMethod==='pix_automatic'}
                  status={pixStatus}
                  initialPaymentReceived={initialPaymentReceived}
                  reconciliationPending={pixReconciliationPending}
                  canceling={cancelingPix}
                  qrCode={pixQrCode}
                  qrLoading={pixQrLoading}
                  copyState={copyState}
                  remaining={remaining}
                  error={error}
                  submitting={submitting}
                  identificationComplete={identificationComplete}
                  adminAccessNotice={adminAccessNotice}
                  planName={plan.name}
                  cycleLabel={cycle?.label??''}
                  onCopy={()=>void copyPix()}
                  onRetry={restart}
                  onCard={()=>void changePaymentMethod('credit_card')}
                  onBack={()=>navigate('/app',{replace:true})}
                />
                :nativeCardCheckoutAvailable
                  ?<CardPaymentContent
                    values={{cardHolderName,cardNumber,expiryMonth,expiryYear,ccv}}
                    setters={{setCardHolderName,setCardNumber,setExpiryMonth,setExpiryYear,setCcv}}
                    refs={{cardHolderNameRef,cardNumberRef,expiryMonthRef,expiryYearRef,ccvRef,submitRef}}
                    error={error}
                    adminAccessNotice={adminAccessNotice}
                    submitting={submitting}
                    expired={expired}
                    buttonLabel={`Assinar ${plan.name} por ${formatBRL(price.total)}${cycleParam==='monthly'?'/mês':''}`}
                    cycleLabel={cycle?.label.toLowerCase()??''}
                    onBack={()=>navigate('/app',{replace:true})}
                  />
                  :<PaymentUnavailableContent method="Cartão de crédito"/>}
            </div>
          </section>
        </form>}

      </section>

      <aside className="native-checkout-summary" aria-label="Resumo do pedido">
        <section className="native-checkout-card checkout-order-card">
          <span className="eyebrow">Resumo do pedido</span>
          <div className="checkout-order-title"><div><strong>ALOVIA {plan.name}</strong><span>{plan.positioning}</span></div><span>{cycle?.label}</span></div>
          <div className="checkout-order-price"><strong>{formatBRL(price.total)}</strong><span>{cycleParam==='monthly'?'por mês':cycleParam==='quarterly'?'a cada 3 meses':'por ano'}</span></div>
          <ul><li><Check size={16}/>Atendimento e agendamento automático integrados</li><li><Check size={16}/>Até 2 técnicos</li><li><Check size={16}/>{paymentMethod==='pix'?'Novo Pix a cada renovação':'Renovação automática'}</li></ul>
          <p className="checkout-order-payment">Pagamento: <strong>{paymentMethod==='pix_automatic'?'Pix Automático':paymentMethod==='pix'?'Pix':'Cartão de crédito'}</strong></p>
          {profile?.business_name&&<p className="checkout-order-business">Assinatura para <strong>{profile.business_name}</strong></p>}
        </section>

        <section className="checkout-security-card">
          <ShieldCheck size={24} aria-hidden="true"/>
          <div className="checkout-security-content">
            <div className="checkout-security-title"><strong>Pagamento protegido</strong><span className="asaas-wordmark" aria-label="Asaas">Asaas</span></div>
            <p>Processamento financeiro realizado com segurança por Asaas.</p>
            <a className="checkout-asaas-about" href="https://www.asaas.com/sobre-nos" target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">
              <span className="checkout-asaas-about-copy"><small>Conheça a empresa</small><strong>Asaas</strong></span><ExternalLink size={17} aria-hidden="true"/>
            </a>
          </div>
        </section>
      </aside>
    </div>
  </main>
}

function LoadingCard({title,text}:{title:string;text:string}) {
  return <section className="native-checkout-card checkout-loading-card"><div className="checkout-loading-spinner"/><div><strong>{title}</strong><span>{text}</span></div></section>
}

function AdminAccessNotice({onBack}:{onBack:()=>void}) {
  return <div className="checkout-admin-access-notice" role="status"><Check size={20} aria-hidden="true"/><div><strong>Esta conta já está liberada pelo administrador do ALOVIA.</strong><span>Não é necessário adquirir um plano pago enquanto essa liberação estiver ativa.</span></div><button className="secondary-button" type="button" onClick={onBack}>Voltar ao ALOVIA</button></div>
}

type IdentificationProps = {
  open:boolean
  complete:boolean
  profile:CheckoutProfile
  values:{payerName:string;payerDocument:string;payerPhone:string;postalCode:string;addressNumber:string;addressComplement:string;cardHolderName:string}
  refs:{payerDocumentRef:RefObject<HTMLInputElement|null>;payerPhoneRef:RefObject<HTMLInputElement|null>;postalCodeRef:RefObject<HTMLInputElement|null>;addressNumberRef:RefObject<HTMLInputElement|null>;addressComplementRef:RefObject<HTMLInputElement|null>;cardHolderNameRef:RefObject<HTMLInputElement|null>}
  setters:{setPayerName:Dispatch<SetStateAction<string>>;setPayerDocument:Dispatch<SetStateAction<string>>;setPayerPhone:Dispatch<SetStateAction<string>>;setPostalCode:Dispatch<SetStateAction<string>>;setAddressNumber:Dispatch<SetStateAction<string>>;setAddressComplement:Dispatch<SetStateAction<string>>;setCardHolderName:Dispatch<SetStateAction<string>>}
  onOpen:()=>void
  onAdvance:()=>void
  focusCard:boolean
}

function IdentificationStep({open,complete,profile,values,refs,setters,onOpen,onAdvance,focusCard}:IdentificationProps) {
  return <section className={`native-checkout-card checkout-accordion-card${open?' is-open':''}`}>
    <button className="checkout-section-toggle" type="button" aria-expanded={open} aria-controls="checkout-identification-fields" onClick={onOpen}>
      <span className="checkout-step-number">{complete?<Check size={16}/>:1}</span><span className="checkout-step-copy"><strong>Identificação</strong><small>{complete?'Dados preenchidos':'Preencha seus dados para continuar'}</small></span>{open?<ChevronUp size={20}/>:<ChevronDown size={20}/>}
    </button>
    <div id="checkout-identification-fields" className="checkout-accordion-content" hidden={!open}>
      <div className="checkout-field-grid">
        <label className="checkout-field checkout-field--wide"><span>Nome completo do titular</span><input autoComplete="name" maxLength={120} value={values.payerName} onChange={event=>{const value=event.target.value.slice(0,120);setters.setPayerName(value);if(!values.cardHolderName)setters.setCardHolderName(value);if(value.length===120)focusNext(refs.payerDocumentRef)}} placeholder="Nome completo" required/></label>
        <label className="checkout-field"><span>CPF ou CNPJ</span><input ref={refs.payerDocumentRef} inputMode="numeric" autoComplete="off" maxLength={18} value={values.payerDocument} onChange={event=>{const formatted=formatDocument(event.target.value);setters.setPayerDocument(formatted);if(digits(formatted,14).length===14)focusNext(refs.payerPhoneRef)}} placeholder="CPF ou CNPJ" required/></label>
        <label className="checkout-field"><span>Celular</span><input ref={refs.payerPhoneRef} inputMode="tel" autoComplete="tel" maxLength={15} value={values.payerPhone} onChange={event=>{const formatted=formatPhone(event.target.value);setters.setPayerPhone(formatted);if(digits(formatted,11).length===11)focusNext(refs.postalCodeRef)}} placeholder="Celular com DDD" required/></label>
        <label className="checkout-field checkout-field--wide"><span>E-mail da conta</span><input value={profile.email} readOnly aria-readonly="true"/></label>
        <label className="checkout-field"><span>CEP</span><input ref={refs.postalCodeRef} inputMode="numeric" autoComplete="postal-code" maxLength={9} value={values.postalCode} onChange={event=>{const formatted=formatPostalCode(event.target.value);setters.setPostalCode(formatted);if(digits(formatted,8).length===8)focusNext(refs.addressNumberRef)}} placeholder="CEP" required/></label>
        <label className="checkout-field"><span>Número</span><input ref={refs.addressNumberRef} autoComplete="address-line2" maxLength={32} value={values.addressNumber} onChange={event=>{const value=event.target.value.slice(0,32);setters.setAddressNumber(value);if(value.length===32)focusNext(refs.addressComplementRef)}} onBlur={onAdvance} placeholder="Número" required/></label>
        <label className="checkout-field checkout-field--wide"><span>Complemento <small>opcional</small></span><input ref={refs.addressComplementRef} autoComplete="address-line2" maxLength={80} value={values.addressComplement} onChange={event=>{const value=event.target.value.slice(0,80);setters.setAddressComplement(value);if(value.length===80){onAdvance();if(focusCard)window.requestAnimationFrame(()=>refs.cardHolderNameRef.current?.focus())}}} onBlur={onAdvance} placeholder="Sala, bloco, apartamento…"/></label>
      </div>
    </div>
  </section>
}

type PixPaymentProps = {
  checkout:CheckoutResponse|null
  automatic:boolean
  status:CheckoutStatus|null
  initialPaymentReceived:boolean
  reconciliationPending:boolean
  canceling:boolean
  qrCode:string|null
  qrLoading:boolean
  copyState:'idle'|'copied'|'failed'
  remaining:number|null
  error:string|null
  submitting:boolean
  identificationComplete:boolean
  adminAccessNotice:boolean
  planName:string
  cycleLabel:string
  onCopy:()=>void
  onRetry:()=>void
  onCard:()=>void
  onBack:()=>void
}

function PixPaymentContent(props:PixPaymentProps) {
  const terminal=props.status==='failed'||props.status==='expired'||props.status==='canceled'
  const methodLabel=props.automatic?'Pix Automático':'Pix'
  const paymentNeedsReconciliation=terminal&&props.initialPaymentReceived
  return <div className="checkout-pix-content">
    {props.reconciliationPending&&<div className="checkout-pix-terminal" role="status"><strong>Estamos confirmando seu {methodLabel}</strong><span>A solicitação foi enviada e estamos confirmando o resultado. Não faça outro pagamento agora.</span><button className="secondary-button" type="button" onClick={props.onBack}>Voltar para a Alovia</button></div>}
    {!props.reconciliationPending&&!props.checkout&&!terminal&&<>
      <div className="checkout-pix-intro"><QrCode size={24}/><div><strong>{props.automatic?'Gerar autorização segura':'Gerar Pix seguro'}</strong><span>O QR Code será criado dentro do ALOVIA e não será enviado a serviços externos.</span></div></div>
      {props.error&&<p className="form-error checkout-native-error" role="alert">{props.error}</p>}
      {props.adminAccessNotice?<AdminAccessNotice onBack={props.onBack}/>:<button className="primary-button checkout-native-submit" type="submit" disabled={!props.identificationComplete||props.submitting}>{props.submitting?`Gerando ${methodLabel}…`:`Gerar ${methodLabel}`}</button>}
      {props.error?.includes('indisponível')&&<button className="secondary-button checkout-alternative-button" type="button" disabled={props.canceling} onClick={props.onCard}>Pagar com cartão de crédito</button>}
    </>}
    {props.checkout&&!terminal&&!props.initialPaymentReceived&&<>
      <div className="checkout-pix-heading"><span className="checkout-pix-icon"><QrCode size={24}/></span><div><strong>{props.automatic?'Pague e autorize o Pix Automático':'Pague por Pix'}</strong><span>{props.automatic?'Abra o app do seu banco, escaneie o QR Code e confirme o pagamento e a autorização das próximas renovações.':'Abra o app do seu banco e conclua o pagamento. Nas próximas renovações, geraremos um novo Pix para você.'}</span></div></div>
      <div className="checkout-pix-grid">
        <div className="checkout-pix-qr" aria-live="polite">{props.qrLoading&&<div className="checkout-loading-spinner" aria-label="Gerando QR Code"/>}{props.qrCode&&<img src={props.qrCode} alt={`QR Code do ${methodLabel}`}/>}{!props.qrLoading&&!props.qrCode&&<span>QR Code indisponível.</span>}</div>
        <div className="checkout-pix-details"><span>Pix Copia e Cola</span><textarea readOnly value={props.checkout.pix_payload??''} aria-label="Código Pix Copia e Cola"/><button className="secondary-button" type="button" onClick={props.onCopy}><Copy size={17}/>{props.copyState==='copied'?'Código copiado':'Copiar código Pix'}</button>{props.copyState==='failed'&&<small role="alert">Não foi possível copiar. Selecione o código acima.</small>}<dl><div><dt>Valor</dt><dd>{formatBRL(props.checkout.amount_cents/100)}</dd></div><div><dt>Plano</dt><dd>{props.planName} · {props.cycleLabel}</dd></div>{props.remaining!==null&&<div><dt>Validade</dt><dd>{formatRemaining(props.remaining)}</dd></div>}</dl></div>
      </div>
      <div className="checkout-pix-waiting" role="status"><div className="checkout-loading-spinner"/><div><strong>{props.automatic?'Aguardando pagamento e autorização':'Aguardando pagamento'}</strong><span>{props.automatic?'Assim que o banco confirmar o pagamento e a autorização, liberamos sua assinatura automaticamente.':'Assim que o pagamento for confirmado, liberamos sua assinatura automaticamente.'}</span></div></div>
      {props.error&&<p className="form-error checkout-native-error" role="alert">{props.error}</p>}
    </>}
    {props.automatic&&props.checkout&&!terminal&&props.initialPaymentReceived&&<div className="checkout-pix-waiting" role="status"><div className="checkout-loading-spinner"/><div><strong>Pagamento recebido</strong><span>O primeiro pagamento foi confirmado. Estamos aguardando a confirmação da autorização das próximas renovações.</span></div></div>}
    {props.automatic&&paymentNeedsReconciliation&&<div className="checkout-pix-terminal" role="alert"><strong>Pagamento recebido</strong><span>O primeiro pagamento foi confirmado, mas a autorização das próximas renovações não foi concluída.</span><span>Não faça outro pagamento. Estamos aguardando a regularização da recorrência.</span><button className="secondary-button" type="button" onClick={props.onBack}>Voltar para a Alovia</button></div>}
    {terminal&&(!paymentNeedsReconciliation||!props.automatic)&&<div className="checkout-pix-terminal" role="alert"><strong>{props.status==='expired'?'O código Pix expirou.':props.automatic?'Não foi possível ativar o Pix Automático.':'Não foi possível confirmar o Pix.'}</strong><span>Nenhuma assinatura foi liberada. Você pode tentar novamente ou escolher cartão.</span><button className="primary-button" type="button" onClick={props.onRetry}><RefreshCcw size={17}/>{props.status==='expired'?'Gerar novo Pix':'Tentar novamente'}</button><button className="secondary-button" type="button" disabled={props.canceling} onClick={props.onCard}>{props.canceling?'Cancelando Pix…':'Pagar com cartão de crédito'}</button></div>}
  </div>
}

function PaymentUnavailableContent({method}:{method:string}) {
  return <div className="checkout-pix-terminal" role="status">
    <strong>{method} temporariamente indisponível</strong>
    <span>A plataforma que processa os pagamentos está indisponível para esta forma de pagamento agora.</span>
  </div>
}

type CardPaymentProps = {
  values:{cardHolderName:string;cardNumber:string;expiryMonth:string;expiryYear:string;ccv:string}
  setters:{setCardHolderName:Dispatch<SetStateAction<string>>;setCardNumber:Dispatch<SetStateAction<string>>;setExpiryMonth:Dispatch<SetStateAction<string>>;setExpiryYear:Dispatch<SetStateAction<string>>;setCcv:Dispatch<SetStateAction<string>>}
  refs:{cardHolderNameRef:RefObject<HTMLInputElement|null>;cardNumberRef:RefObject<HTMLInputElement|null>;expiryMonthRef:RefObject<HTMLInputElement|null>;expiryYearRef:RefObject<HTMLInputElement|null>;ccvRef:RefObject<HTMLInputElement|null>;submitRef:RefObject<HTMLButtonElement|null>}
  error:string|null
  adminAccessNotice:boolean
  submitting:boolean
  expired:boolean
  buttonLabel:string
  cycleLabel:string
  onBack:()=>void
}

function CardPaymentContent(props:CardPaymentProps) {
  return <>
    <div className="checkout-field-grid">
      <label className="checkout-field checkout-field--wide"><span>Nome impresso no cartão</span><input ref={props.refs.cardHolderNameRef} autoComplete="cc-name" maxLength={120} value={props.values.cardHolderName} onChange={event=>{const value=event.target.value.slice(0,120);props.setters.setCardHolderName(value);if(value.length===120)focusNext(props.refs.cardNumberRef)}} placeholder="Como aparece no cartão" required/></label>
      <label className="checkout-field checkout-field--wide"><span>Número do cartão</span><div className="checkout-input-with-icon"><CreditCard size={18}/><input ref={props.refs.cardNumberRef} inputMode="numeric" autoComplete="cc-number" maxLength={23} value={props.values.cardNumber} onChange={event=>{const formatted=formatCardNumber(event.target.value);props.setters.setCardNumber(formatted);if(isCardNumberComplete(formatted))focusNext(props.refs.expiryMonthRef)}} placeholder="Número do cartão" aria-invalid={props.values.cardNumber.length>0&&!isValidCardNumber(props.values.cardNumber)} required/></div>{props.values.cardNumber.length>0&&!isValidCardNumber(props.values.cardNumber)&&<small className="checkout-field-hint">Preencha o número completo do cartão.</small>}</label>
      <label className="checkout-field"><span>Validade</span><div className="checkout-expiry-fields"><input ref={props.refs.expiryMonthRef} inputMode="numeric" autoComplete="cc-exp-month" maxLength={2} value={props.values.expiryMonth} onChange={event=>{const value=digits(event.target.value,2);props.setters.setExpiryMonth(value);if(value.length===2)focusNext(props.refs.expiryYearRef)}} placeholder="MM" aria-label="Mês de validade" required/><span>/</span><input ref={props.refs.expiryYearRef} inputMode="numeric" autoComplete="cc-exp-year" maxLength={4} value={props.values.expiryYear} onChange={event=>{const value=digits(event.target.value,4);props.setters.setExpiryYear(value);if(value.length===4)focusNext(props.refs.ccvRef)}} placeholder="AAAA" aria-label="Ano de validade" required/></div></label>
      <label className="checkout-field"><span>Código de segurança</span><div className="checkout-input-with-icon"><LockKeyhole size={17}/><input ref={props.refs.ccvRef} type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={cardSecurityCodeLimit(props.values.cardNumber)} value={props.values.ccv} onChange={event=>{const limit=cardSecurityCodeLimit(props.values.cardNumber);const value=digits(event.target.value,limit);props.setters.setCcv(value);if(value.length===limit)window.requestAnimationFrame(()=>props.refs.submitRef.current?.focus())}} placeholder="CVV" required/></div></label>
    </div>
    {props.error&&<p className="form-error checkout-native-error" role="alert">{props.error}</p>}
    {props.adminAccessNotice?<AdminAccessNotice onBack={props.onBack}/>:<><button ref={props.refs.submitRef} className="primary-button checkout-native-submit" type="submit" disabled={props.submitting||props.expired}>{props.submitting?'Processando com segurança…':props.buttonLabel}</button><p className="checkout-submit-note">Ao confirmar, você autoriza a cobrança recorrente do plano {props.cycleLabel}.</p></>}
  </>
}
