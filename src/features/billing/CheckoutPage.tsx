import {
  ArrowLeft,
  Check,
  Clock3,
  CreditCard,
  LockKeyhole,
  RefreshCcw,
  ShieldCheck,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { BrandMark } from '../../components/BrandMark'
import { api } from '../../lib/api'
import { ApiError } from '../../lib/httpClient'
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

function formatRemaining(seconds:number) {
  const safe=Math.max(0,seconds)
  const minutes=Math.floor(safe/60)
  const rest=safe%60
  return `${String(minutes).padStart(2,'0')}:${String(rest).padStart(2,'0')}`
}

export function CheckoutPage() {
  const [params]=useSearchParams()
  const navigate=useNavigate()
  const planId=params.get('plan')
  const cycleParam=params.get('cycle')
  const requestKey=useRef(crypto.randomUUID())

  const [profile,setProfile]=useState<CheckoutProfile|null>(null)
  const [checkout,setCheckout]=useState<CheckoutResponse|null>(null)
  const [loading,setLoading]=useState(true)
  const [remaining,setRemaining]=useState(600)
  const [error,setError]=useState<string|null>(null)
  const [submitting,setSubmitting]=useState(false)

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
    } catch {
      setError('Não foi possível preparar seu checkout agora. Tente novamente.')
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
    setCardNumber('')
    setExpiryMonth('')
    setExpiryYear('')
    setCcv('')
    void prepareCheckout(requestKey.current)
  }

  const submit=async(event:FormEvent)=>{
    event.preventDefault()
    if(!checkout||submitting||expired)return

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
      cardDigits.length<13||
      !monthDigits||
      !yearDigits||
      ccvDigits.length<3
    ) {
      setError('Confira os campos obrigatórios antes de continuar.')
      return
    }

    setSubmitting(true)
    setError(null)
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
      navigate(`/app/checkout/retorno?state=success&checkout=${checkout.checkout_id}`,{replace:true})
    } catch (caught) {
      if(caught instanceof ApiError&&caught.status===422) {
        setError('Não foi possível autorizar o cartão. Confira os dados ou tente outro cartão.')
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
        <div><strong>ALOVIA</strong><span>Assinatura segura</span></div>
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
          <p>Revise seus dados e conclua o pagamento. A renovação do plano é automática e você continua no ambiente da ALOVIA durante todo o processo.</p>
        </div>

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
          <section className="native-checkout-card">
            <div className="checkout-section-heading">
              <span>1</span>
              <div><h2>Identificação</h2><p>Preenchemos automaticamente o que já conhecemos sobre sua conta.</p></div>
            </div>

            <div className="checkout-field-grid">
              <label className="checkout-field checkout-field--wide">
                <span>Nome completo do titular</span>
                <input autoComplete="name" value={payerName} onChange={event=>{setPayerName(event.target.value);if(!cardHolderName)setCardHolderName(event.target.value)}} placeholder="Nome completo" required/>
              </label>
              <label className="checkout-field">
                <span>CPF ou CNPJ</span>
                <input inputMode="numeric" autoComplete="off" value={payerDocument} onChange={event=>setPayerDocument(formatDocument(event.target.value))} placeholder="000.000.000-00" required/>
              </label>
              <label className="checkout-field">
                <span>Celular</span>
                <input inputMode="tel" autoComplete="tel" value={payerPhone} onChange={event=>setPayerPhone(formatPhone(event.target.value))} placeholder="(00) 00000-0000" required/>
              </label>
              <label className="checkout-field checkout-field--wide">
                <span>E-mail da conta</span>
                <input value={profile?.email??''} readOnly aria-readonly="true"/>
              </label>
              <label className="checkout-field">
                <span>CEP</span>
                <input inputMode="numeric" autoComplete="postal-code" value={postalCode} onChange={event=>setPostalCode(formatPostalCode(event.target.value))} placeholder="00000-000" required/>
              </label>
              <label className="checkout-field">
                <span>Número</span>
                <input autoComplete="address-line2" value={addressNumber} onChange={event=>setAddressNumber(event.target.value)} placeholder="Número" required/>
              </label>
              <label className="checkout-field checkout-field--wide">
                <span>Complemento <small>opcional</small></span>
                <input autoComplete="address-line2" value={addressComplement} onChange={event=>setAddressComplement(event.target.value)} placeholder="Sala, bloco, apartamento…"/>
              </label>
            </div>
          </section>

          <section className="native-checkout-card">
            <div className="checkout-section-heading">
              <span>2</span>
              <div><h2>Cartão de crédito</h2><p>Cobrança recorrente processada pelo Asaas.</p></div>
              <CreditCard size={22} aria-hidden="true"/>
            </div>

            <div className="checkout-field-grid">
              <label className="checkout-field checkout-field--wide">
                <span>Nome impresso no cartão</span>
                <input autoComplete="cc-name" value={cardHolderName} onChange={event=>setCardHolderName(event.target.value)} placeholder="Como aparece no cartão" required/>
              </label>
              <label className="checkout-field checkout-field--wide">
                <span>Número do cartão</span>
                <div className="checkout-input-with-icon"><CreditCard size={18}/><input inputMode="numeric" autoComplete="cc-number" value={cardNumber} onChange={event=>setCardNumber(formatCardNumber(event.target.value))} placeholder="0000 0000 0000 0000" required/></div>
              </label>
              <label className="checkout-field">
                <span>Validade</span>
                <div className="checkout-expiry-fields">
                  <input inputMode="numeric" autoComplete="cc-exp-month" maxLength={2} value={expiryMonth} onChange={event=>setExpiryMonth(digits(event.target.value,2))} placeholder="MM" aria-label="Mês de validade" required/>
                  <span>/</span>
                  <input inputMode="numeric" autoComplete="cc-exp-year" maxLength={4} value={expiryYear} onChange={event=>setExpiryYear(digits(event.target.value,4))} placeholder="AAAA" aria-label="Ano de validade" required/>
                </div>
              </label>
              <label className="checkout-field">
                <span>Código de segurança</span>
                <div className="checkout-input-with-icon"><LockKeyhole size={17}/><input type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={ccv} onChange={event=>setCcv(digits(event.target.value,4))} placeholder="CVV" required/></div>
              </label>
            </div>

            {error&&<p className="form-error checkout-native-error" role="alert">{error}</p>}

            <button className="primary-button checkout-native-submit" type="submit" disabled={submitting||expired}>
              {submitting?'Processando com segurança…':`Assinar ${plan.name} por ${formatBRL(price.total)}${cycleParam==='monthly'?'/mês':''}`}
            </button>
            <p className="checkout-submit-note">Ao confirmar, você autoriza a cobrança recorrente do plano {cycle?.label.toLowerCase()}.</p>
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
            <li><Check size={16}/>{plan.users===1?'1 usuário':`Até ${plan.users} usuários`}</li>
            <li><Check size={16}/>Assistente virtual e agenda integrados</li>
            <li><Check size={16}/>Renovação automática</li>
          </ul>
          {profile?.business_name&&<p className="checkout-order-business">Assinatura para <strong>{profile.business_name}</strong></p>}
        </section>

        <section className="checkout-security-card">
          <ShieldCheck size={25}/>
          <div><strong>Pagamento protegido</strong><p>Processamento financeiro realizado com segurança pelo Asaas em conexão HTTPS.</p></div>
          <div className="checkout-security-divider"/>
          <div className="checkout-security-line"><LockKeyhole size={16}/><span>A ALOVIA não armazena o número completo do cartão nem o código de segurança.</span></div>
        </section>
      </aside>
    </div>
  </main>