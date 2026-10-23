import { Clock3, LoaderCircle, RotateCcw, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../lib/api'
import { trackEventOnce } from '../../lib/tracking'
import { useAuth } from '../auth/useAuth'

type CheckoutStatus = {
  checkout_id:string
  status:'creating'|'active'|'paid'|'canceled'|'expired'|'failed'
  plan:'basic'|'plus'
  cycle:'monthly'|'quarterly'|'annual'
  payment_method?:'credit_card'|'pix'|'pix_automatic'
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function CheckoutReturnPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const {membership,syncSession} = useAuth()
  const checkoutId = params.get('checkout')
  const browserState = params.get('state')
  const [status,setStatus] = useState<CheckoutStatus['status'] | 'checking'>('checking')
  const [retry,setRetry] = useState(0)
  const finalizing = useRef(false)
  const validCheckout = useMemo(()=>!!checkoutId&&UUID_PATTERN.test(checkoutId),[checkoutId])

  useEffect(()=>{
    if (!validCheckout || !checkoutId) return
    const terminalReason =
      browserState === 'canceled' || status === 'canceled'
        ? 'canceled'
        : browserState === 'expired' || status === 'expired'
          ? 'expired'
          : status === 'failed'
            ? 'failed'
            : null
    if (!terminalReason) return
    trackEventOnce(
      `payment_terminal:${checkoutId}:${terminalReason}`,
      'payment_failed',
      {
        checkout_id:checkoutId,
        reason:terminalReason,
        funnel_stage:'payment_not_completed',
      },
      {
        surface:'checkout_return',
        businessId:membership?.business_id,
      },
    )
  },[browserState,checkoutId,membership?.business_id,status,validCheckout])

  useEffect(()=>{
    if (!validCheckout || !checkoutId || browserState !== 'success') return
    let cancelled = false
    let timer:number | undefined
    let attempts = 0

    const check = async () => {
      attempts++
      try {
        const current = await api.request<CheckoutStatus>(`/billing/checkouts/${checkoutId}`)
        if (cancelled) return
        if (current.status === 'paid') {
          trackEventOnce(
            `payment_confirmed:${checkoutId}`,
            'payment_confirmed',
            {
              checkout_id: checkoutId,
              plan: current.plan,
              billing_cycle: current.cycle,
              payment_method: current.payment_method ?? 'credit_card',
              funnel_stage: 'subscription_paid',
            },
            {
              surface: 'checkout_return',
              businessId: membership?.business_id,
            },
          )
          if (finalizing.current) return
          finalizing.current = true
          setStatus('checking')
          try {
            // Admin-granted or otherwise already-paid accounts do not need an
            // entitlement transition. Fresh free accounts sync once so the new
            // commercial subscription is reflected before entering the app.
            if (membership?.access_mode !== 'paid') await syncSession()
            if (!cancelled) navigate('/app/onboarding',{replace:true})
          } catch {
            finalizing.current = false
            if (!cancelled) timer = window.setTimeout(check,1200)
          }
          return
        }
        setStatus(current.status)
        if (['canceled','expired','failed'].includes(current.status)) return
      } catch {
        if (cancelled) return
      }
      if (attempts < 10 && !cancelled) timer = window.setTimeout(check,2000)
      else if (!cancelled) setStatus(currentStatus=>currentStatus==='checking'?'active':currentStatus)
    }

    void check()
    return ()=>{
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  },[browserState,checkoutId,membership?.access_mode,membership?.business_id,navigate,retry,syncSession,validCheckout])

  if (!validCheckout) return <Navigate to="/app/mais/plano" replace />

  if (browserState === 'canceled' || status === 'canceled') {
    return <CheckoutMessage icon={<XCircle/>} title="Pagamento cancelado" text="Nenhuma assinatura foi ativada. Você pode voltar aos planos quando quiser.">
      <Link className="primary-button" to="/app/mais/plano">Voltar aos planos</Link>
    </CheckoutMessage>
  }

  if (browserState === 'expired' || status === 'expired') {
    return <CheckoutMessage icon={<Clock3/>} title="Checkout expirado" text="Esse checkout não está mais disponível. Gere um novo em poucos segundos.">
      <Link className="primary-button" to="/app/mais/plano">Escolher plano</Link>
    </CheckoutMessage>
  }

  if (status === 'failed') {
    return <CheckoutMessage icon={<XCircle/>} title="Não foi possível concluir" text="A assinatura não foi ativada. Tente gerar um novo checkout.">
      <Link className="primary-button" to="/app/mais/plano">Tentar novamente</Link>
    </CheckoutMessage>
  }

  return <CheckoutMessage icon={<LoaderCircle className="checkout-confirmation-spinner"/>} title="Confirmando pagamento" text="Estamos confirmando o pagamento com o Asaas. Isso costuma levar apenas alguns instantes.">
    <button className="secondary-button" type="button" onClick={()=>setRetry(value=>value+1)}><RotateCcw size={16}/>Verificar novamente</button>
  </CheckoutMessage>
}

function CheckoutMessage({icon,title,text,children}:{icon:ReactNode;title:string;text:string;children:ReactNode}) {
  return <div className="page-stack operational-page compact-page checkout-return-page">
    <section className="checkout-return-card">
      <div className="checkout-return-icon" aria-hidden="true">{icon}</div>
      <div>
        <span className="eyebrow">Assinatura ALOVIA</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      <div className="checkout-return-actions">{children}</div>
    </section>
  </div>
}