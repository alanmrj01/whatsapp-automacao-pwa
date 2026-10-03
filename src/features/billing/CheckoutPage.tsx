import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  CreditCard,
  ExternalLink,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
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

type CheckoutMode = 'hosted' | 'native' | 'pix'

type CheckoutResponse = {
  checkout_id:string
  payment_method:'credit_card'|'pix_automatic'
  checkout_mode?:CheckoutMode
  checkout_url?:string|null
  expires_at?:string|null
  plan:PlanId
  cycle:BillingCycle
  amount_cents:number
}

type CheckoutProfile = {
  email:string
  business_name:string
  payer_name:string|null
  postal_code:string|null
  address_number:string|null
}

function isBillingCycle(value:string|null):value is BillingCycle {
  return value === 'monthly' || value === 'quarterly' || value === 'annual'
}

function isPlanId(value:string|null):value is PlanId {
  return value === 'basic' || value === 'plus'
}

function isAsaasCheckoutUrl(value:string) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && (url.hostname === 'asaas.com' || url.hostname.endsWith('.asaas.com'))
  } catch {
    return false
  }
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
  const {membership}=useAuth()
  const planId=params.get('plan')
  const cycleParam=params.get('cycle')
  const requestKey=useRef(crypto.randomUUID())

  const [profile,setProfile]=useState<CheckoutProfile|null>(null)
  const [checkout,setCheckout]=useState<CheckoutResponse|null>(null)
  const [loading,setLoading]=useState(true)
  const [remaining,setRemaining]=useState(600)
  const [error,setError]=useState<string|null>(null)
  const [submitting,setSubmitting]=useState(false)
  const [adminAccessNotice,setAdminAccessNotice]=useState(false)
  const [openStep,setOpenStep]=useState<1|2>(1)
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

  const prepareCheckout=useCallback(async(key:string)=>{
    if(!isPlanId(planId)||!isBillingCycle(cycleParam)||!isPurchasablePlan(planId))return
    setLoading(true)
    setError(null)
    try {
      const [nextProfile,nextCheckout]=await Promise.all([
        api.request<CheckoutProfile>('/billing/checkout-profile'),
        api.request<CheckoutResponse>('/billing/checkouts',{
          method:'POST',
          headers:{'Idempotency-Key':key},
          body:JSON.stringify({
            plan:planId,
            cycle:cycleParam,
            payment_method:'credit_card',
            return_origin:window.location.origin,
          }),
        }),
      ])
      setProfile(nextProfile)
      setCheckout(nextCheckout)
      setPayerName(current=>current||nextProfile.payer_name||'')
      setCardHolderName(current=>current||nextProfile.payer_name||'')
      setPostalCode(current=>current||formatPostalCode(nextProfile.postal_code??''))
      setAddressNumber(current=>current||nextProfile.address_number||'')
    } catch (caught) {
      if(caught instanceof ApiError&&caught.status===401) {
        setError('Sua sessão expirou. Entre novamente para continuar.')
      } else if(caught instanceof ApiError&&caught.status===409) {
        setError(caught.detail||'Não foi possível preparar este checkout agora.')
      } else {
        setError('Não foi possível preparar seu checkout agora. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  },[cycleParam,planId])

  useEffect(()=>{
    if(!validSelection)return
    void prepareCheckout(requestKey.current)
  },[prepareCheckout,validSelection])

  useEffect(()=>{
    if(!checkout?.expires_at)return
    const expiresAt=new Date(checkout.expires_at).getTime()
    const tick=()=>setRemaining(Math.max(0,Math.ceil((expiresAt-Date.now())/1000)))
    tick()
    const timer=window.setInterval(tick,1000)
    return()=>window.clearInterval(timer)
  },[checkout?.expires_at])


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

  if(!isPlanId(planId)||!isBillingCycle(cycleParam)) {
    return <Navigate to="/app/mais/plano" replace/>
  }
  if(!isPurchasablePlan(planId)) {
    return <Navigate to={`/app/mais/plano?cycle=${cycleParam}&unavailable=${planId}`} replace/>
  }

  const plan=plans.find(item=>item.id===planId)
  if(!plan)return <Navigate to="/app/mais/plano" replace/>

  const price=cyclePrice(plan,cycleParam)
  const cycle=billingCycles.find(item=>item.id===cycleParam)
  const expired=remaining<=0

  const restart=()=>{
    requestKey.current=crypto.randomUUID()
    setCheckout(null)
    setRemaining(600)
    setError(null)
    setSubmitting(false)
    setAdminAccessNotice(false)
    setOpenStep(1)
    setCardNumber('')
    setExpiryMonth('')
    setExpiryYear('')
    setCcv('')
    void prepareCheckout(requestKey.current)
  }

  const submit=async(event:FormEvent)=>{
    event.preventDefault()
    if(!checkout||submitting||expired)return

    if(membership?.admin_full_access) {
      setError(null)
      setAdminAccessNotice(true)
      setCardNumber('')
      setExpiryMonth('')
      setExpiryYear('')
      setCcv('')
      return
    }

    const checkoutMode=checkout.checkout_mode??(checkout.checkout_url?'hosted':null)

    if(checkoutMode==='hosted') {
      if(!checkout.checkout_url||!isAsaasCheckoutUrl(checkout.checkout_url)) {
        setError('O checkout seguro não está disponível agora.')
        return
      }
      window.location.assign(checkout.checkout_url)
      return
    }

    if(checkoutMode!=='native') {
      setError('Esta forma de pagamento ainda não está disponível.')
      return
    }

    const documentDigits=digits(payerDocument,14)
    const phoneDigits=digits(payerPhone,11)
    const postalDigits=digits(postalCode,8)
    const cardDigits=digits(cardNumber,19)
    const monthDigits=digits(expiryMonth,2)
    const yearDigits=digits(expiryYear,4)
    const ccvDigits=digits(ccv,4)

    if(
      payerName.trim().length<2||
      ![11,14].includes(documentDigits.length)||
      ![10,11].includes(phoneDigits.length)||
      postalDigits.length!==8||
      !addressNumber.trim()||
      cardHolderName.trim().length<2||
      !isValidCardNumber(cardDigits)||
      !monthDigits||
      !yearDigits||
      ccvDigits.length!==cardSecurityCodeLimit(cardDigits)
    ) {
      setError('Confira os campos obrigatórios antes de continuar.')
      return
    }

    setSubmitting(true)
    setError(null)
    setAdminAccessNotice(false)
    try {
      await api.request(`/billing/checkouts/${checkout.checkout_id}/credit-card`,{
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
      navigate(`/app/checkout/retorno?state=success&checkout=${checkout.checkout_id}`,{replace:true})
    } catch (caught) {
      setCcv('')
      if(caught instanceof ApiError&&caught.status===422) {
        setError('Não foi possível autorizar o cartão. Confira os dados ou tente outro cartão.')
      } else if(
        caught instanceof ApiError&&
        caught.status===409&&
        caught.detail==='Admin full access is active; a paid plan is not required'
      ) {
        setAdminAccessNotice(true)
        setCardNumber('')
        setExpiryMonth('')
        setExpiryYear('')
      } else if(caught instanceof ApiError&&caught.status===409) {
        setError(caught.detail==='Checkout expired'
          ?'Esta sessão expirou. Gere uma nova sessão para continuar.'
          :'A confirmação anterior ainda está sendo conciliada. Aguarde alguns instantes antes de tentar novamente.')
      } else {
        setError('Não foi possível concluir agora. Seus dados do cartão não foram salvos. Tente novamente em alguns instantes.')
      }
      setSubmitting(false)
    }
  }

  return <main className="native-checkout-shell">
    <header className="native-checkout-header">
      <Link className="native-checkout-back" to={`/app/mais/plano?cycle=${cycleParam}`} aria-label="Voltar aos planos">
        <ArrowLeft size={20}/>
      </Link>
      <div className="native-checkout-brand">
        <BrandMark/>
        <div><strong>ALOVIA</strong></div>
      </div>
      <div className={`checkout-timer${expired?' is-expired':''}`} aria-live="polite">
        <Clock3 size={17}/>
        <span>{expired?'Expirado':formatRemaining(remaining)}</span>
      </div>
    </header>

    <div className="native-checkout-layout">
      <section className="native-checkout-main">
        <div className="native-checkout-intro">
          <span className="eyebrow">Finalize sua assinatura</span>
          <h1>Seu atendimento automático começa aqui.</h1>
          <p>Revise seus dados e conclua o pagamento. A renovação do plano é automática.</p>
        </div>

        <section className="checkout-guarantee-card" aria-label="Garantia de 7 dias">
          <BadgeCheck size={22} aria-hidden="true"/>
          <div>
            <strong>Garantia de 7 dias</strong>
            <span>Se o ALOVIA não ajudar no seu processo, devolvemos seu dinheiro.</span>
          </div>
        </section>

        {loading&&<section className="native-checkout-card checkout-loading-card">
          <div className="checkout-loading-spinner"/>
          <div><strong>Preparando seu checkout seguro…</strong><span>Isso leva só alguns segundos.</span></div>
        </section>}

        {!loading&&expired&&<section className="native-checkout-card checkout-expired-card">
          <Clock3 size={24}/>
          <div><strong>Sua sessão de 10 minutos expirou.</strong><span>Gere uma nova sessão para manter o pagamento protegido e atualizado.</span></div>
          <button className="primary-button" type="button" onClick={restart}><RefreshCcw size={17}/>Gerar nova sessão</button>
        </section>}

        {!loading&&!expired&&checkout&&<form className="native-checkout-form" onSubmit={submit} noValidate>
          <section className={`native-checkout-card checkout-accordion-card${openStep===1?' is-open':''}`}>
            <button
              className="checkout-section-toggle"
              type="button"
              aria-expanded={openStep===1}
              aria-controls="checkout-identification-fields"
              onClick={()=>setOpenStep(1)}
            >
              <span className="checkout-step-number">{identificationComplete?<Check size={16}/>:1}</span>
              <span className="checkout-step-copy">
                <strong>Identificação</strong>
                <small>{identificationComplete?'Dados preenchidos':'Preencha seus dados para continuar'}</small>
              </span>
              {openStep===1?<ChevronUp size={20}/>:<ChevronDown size={20}/>}
            </button>

            <div
              id="checkout-identification-fields"
              className="checkout-accordion-content"
              hidden={openStep!==1}
            >
              <div className="checkout-field-grid">
              <label className="checkout-field checkout-field--wide">
                <span>Nome completo do titular</span>
                <input
                  autoComplete="name"
                  maxLength={120}
                  value={payerName}
                  onChange={event=>{
                    const value=event.target.value.slice(0,120)
                    setPayerName(value)
                    if(!cardHolderName)setCardHolderName(value)
                    if(value.length===120)focusNext(payerDocumentRef)
                  }}
                  placeholder="Nome completo"
                  required
                />
              </label>
              <label className="checkout-field">
                <span>CPF ou CNPJ</span>
                <input
                  ref={payerDocumentRef}
                  inputMode="numeric"
                  autoComplete="off"
                  maxLength={18}
                  value={payerDocument}
                  onChange={event=>{
                    const formatted=formatDocument(event.target.value)
                    setPayerDocument(formatted)
                    if(digits(formatted,14).length===14)focusNext(payerPhoneRef)
                  }}
                  placeholder="CPF ou CNPJ"
                  required
                />
              </label>
              <label className="checkout-field">
                <span>Celular</span>
                <input
                  ref={payerPhoneRef}
                  inputMode="tel"
                  autoComplete="tel"
                  maxLength={15}
                  value={payerPhone}
                  onChange={event=>{
                    const formatted=formatPhone(event.target.value)
                    setPayerPhone(formatted)
                    if(digits(formatted,11).length===11)focusNext(postalCodeRef)
                  }}
                  placeholder="Celular com DDD"
                  required
                />
              </label>
              <label className="checkout-field checkout-field--wide">
                <span>E-mail da conta</span>
                <input value={profile?.email??''} readOnly aria-readonly="true"/>
              </label>
              <label className="checkout-field">
                <span>CEP</span>
                <input
                  ref={postalCodeRef}
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={9}
                  value={postalCode}
                  onChange={event=>{
                    const formatted=formatPostalCode(event.target.value)
                    setPostalCode(formatted)
                    if(digits(formatted,8).length===8)focusNext(addressNumberRef)
                  }}
                  placeholder="CEP"
                  required
                />
              </label>
              <label className="checkout-field">
                <span>Número</span>
                <input
                  ref={addressNumberRef}
                  autoComplete="address-line2"
                  maxLength={32}
                  value={addressNumber}
                  onChange={event=>{
                    const value=event.target.value.slice(0,32)
                    setAddressNumber(value)
                    if(value.length===32)focusNext(addressComplementRef)
                  }}
                  onBlur={()=>{
                    if(identificationComplete)setOpenStep(2)
                  }}
                  placeholder="Número"
                  required
                />
              </label>
              <label className="checkout-field checkout-field--wide">
                <span>Complemento <small>opcional</small></span>
                <input
                  ref={addressComplementRef}
                  autoComplete="address-line2"
                  maxLength={80}
                  value={addressComplement}
                  onChange={event=>{
                    const value=event.target.value.slice(0,80)
                    setAddressComplement(value)
                    if(value.length===80) {
                      setOpenStep(2)
                      window.requestAnimationFrame(()=>cardHolderNameRef.current?.focus())
                    }
                  }}
                  onBlur={()=>{
                    if(identificationComplete)setOpenStep(2)
                  }}
                  placeholder="Sala, bloco, apartamento…"
                />
              </label>
              </div>
            </div>
          </section>

          <section className={`native-checkout-card checkout-accordion-card${openStep===2?' is-open':''}`}>
            <button
              className="checkout-section-toggle"
              type="button"
              aria-expanded={openStep===2}
              aria-controls="checkout-card-fields"
              disabled={!identificationComplete}
              onClick={()=>identificationComplete&&setOpenStep(2)}
            >
              <span className="checkout-step-number">2</span>
              <span className="checkout-step-copy">
                <strong>Cartão de crédito</strong>
                <small>{identificationComplete?'Cobrança recorrente processada pelo Asaas.':'Conclua a identificação primeiro'}</small>
              </span>
              {openStep===2?<ChevronUp size={20}/>:<ChevronDown size={20}/>}
            </button>

            <div
              id="checkout-card-fields"
              className="checkout-accordion-content"
              hidden={openStep!==2}
            >
              <div className="checkout-field-grid">
              <label className="checkout-field checkout-field--wide">
                <span>Nome impresso no cartão</span>
                <input
                  ref={cardHolderNameRef}
                  autoComplete="cc-name"
                  maxLength={120}
                  value={cardHolderName}
                  onChange={event=>{
                    const value=event.target.value.slice(0,120)
                    setCardHolderName(value)
                    if(value.length===120)focusNext(cardNumberRef)
                  }}
                  placeholder="Como aparece no cartão"
                  required
                />
              </label>
              <label className="checkout-field checkout-field--wide">
                <span>Número do cartão</span>
                <div className="checkout-input-with-icon"><CreditCard size={18}/><input
                  ref={cardNumberRef}
                  inputMode="numeric"
                  autoComplete="cc-number"
                  maxLength={23}
                  value={cardNumber}
                  onChange={event=>{
                    const formatted=formatCardNumber(event.target.value)
                    setCardNumber(formatted)
                    if(isCardNumberComplete(formatted))focusNext(expiryMonthRef)
                  }}
                  placeholder="Número do cartão"
                  aria-invalid={cardNumber.length>0&&!isValidCardNumber(cardNumber)}
                  required
                /></div>
                {cardNumber.length>0&&!isValidCardNumber(cardNumber)&&<small className="checkout-field-hint">Preencha o número completo do cartão.</small>}
              </label>
              <label className="checkout-field">
                <span>Validade</span>
                <div className="checkout-expiry-fields">
                  <input
                    ref={expiryMonthRef}
                    inputMode="numeric"
                    autoComplete="cc-exp-month"
                    maxLength={2}
                    value={expiryMonth}
                    onChange={event=>{
                      const value=digits(event.target.value,2)
                      setExpiryMonth(value)
                      if(value.length===2)focusNext(expiryYearRef)
                    }}
                    placeholder="MM"
                    aria-label="Mês de validade"
                    required
                  />
                  <span>/</span>
                  <input
                    ref={expiryYearRef}
                    inputMode="numeric"
                    autoComplete="cc-exp-year"
                    maxLength={4}
                    value={expiryYear}
                    onChange={event=>{
                      const value=digits(event.target.value,4)
                      setExpiryYear(value)
                      if(value.length===4)focusNext(ccvRef)
                    }}
                    placeholder="AAAA"
                    aria-label="Ano de validade"
                    required
                  />
                </div>
              </label>
              <label className="checkout-field">
                <span>Código de segurança</span>
                <div className="checkout-input-with-icon"><LockKeyhole size={17}/><input
                  ref={ccvRef}
                  type="password"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  maxLength={cardSecurityCodeLimit(cardNumber)}
                  value={ccv}
                  onChange={event=>{
                    const limit=cardSecurityCodeLimit(cardNumber)
                    const value=digits(event.target.value,limit)
                    setCcv(value)
                    if(value.length===limit)window.requestAnimationFrame(()=>submitRef.current?.focus())
                  }}
                  placeholder="CVV"
                  required
                /></div>
              </label>
              </div>

              {error&&<p className="form-error checkout-native-error" role="alert">{error}</p>}

            <button ref={submitRef} className="primary-button checkout-native-submit" type="submit" disabled={submitting||expired}>
              {submitting?'Processando com segurança…':`Assinar ${plan.name} por ${formatBRL(price.total)}${cycleParam==='monthly'?'/mês':''}`}
            </button>
              <p className="checkout-submit-note">Ao confirmar, você autoriza a cobrança recorrente do plano {cycle?.label.toLowerCase()}.</p>
            </div>
          </section>
        </form>}

        {!loading&&!checkout&&!expired&&<section className="native-checkout-card checkout-expired-card">
          <div><strong>Não conseguimos abrir o checkout.</strong><span>{error??'Tente novamente em alguns instantes.'}</span></div>
          <button className="secondary-button" type="button" onClick={restart}><RefreshCcw size={17}/>Tentar novamente</button>
        </section>}
      </section>

      <aside className="native-checkout-summary" aria-label="Resumo do pedido">
        <section className="native-checkout-card checkout-order-card">
          <span className="eyebrow">Resumo do pedido</span>
          <div className="checkout-order-title"><div><strong>ALOVIA {plan.name}</strong><span>{plan.positioning}</span></div><span>{cycle?.label}</span></div>
          <div className="checkout-order-price"><strong>{formatBRL(price.total)}</strong><span>{cycleParam==='monthly'?'por mês':cycleParam==='quarterly'?'a cada 3 meses':'por ano'}</span></div>
          <ul>
            <li><Check size={16}/>Atendimento e agendamento automático integrados</li>
            <li><Check size={16}/>Até 2 técnicos</li>
            <li><Check size={16}/>Renovação automática</li>
          </ul>
          {profile?.business_name&&<p className="checkout-order-business">Assinatura para <strong>{profile.business_name}</strong></p>}
        </section>

        <section className="checkout-security-card">
          <ShieldCheck size={24} aria-hidden="true"/>
          <div className="checkout-security-content">
            <div className="checkout-security-title">
              <strong>Pagamento protegido</strong>
              <span className="asaas-wordmark" aria-label="Asaas">Asaas</span>
            </div>
            <p>Processamento financeiro realizado com segurança por Asaas.</p>

            <a
              className="checkout-asaas-about"
              href="https://www.asaas.com/sobre-nos"
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
            >
              <span className="checkout-asaas-about-copy">
                <small>Conheça a empresa</small>
                <strong>Asaas</strong>
              </span>
              <ExternalLink size={17} aria-hidden="true"/>
            </a>
          </div>
        </section>
      </aside>
    </div>
  </main>
}