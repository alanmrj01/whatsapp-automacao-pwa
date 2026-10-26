import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { ApiError } from '../../lib/httpClient'
import { trackEvent, trackEventOnce } from '../../lib/tracking'
import { useAuth } from '../auth/useAuth'
import { useMessageUsage } from './useMessageUsage'

function formatReset(value:string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day:'2-digit',
    month:'2-digit',
    timeZone:'America/Sao_Paulo',
  }).format(new Date(value))
}

function ratio(used:number, limit:number|null) {
  return limit && limit > 0 ? used / limit : 0
}

export function MessageQuotaBanner() {
  const {membership} = useAuth()
  const usage = useMessageUsage(membership?.access_mode === 'paid')
  const data = usage.data
  if (!data?.quota_applies || !data.limit || ratio(data.used,data.limit) < 0.8) return null

  const canManage = membership?.role === 'owner' || membership?.role === 'admin'
  const exhausted = data.exhausted

  return <section className="app-pending-banner" role="status">
    <div>
      <strong>{exhausted?'Franquia mensal de mensagens atingida':'Sua franquia de mensagens está perto do limite'}</strong>
      <span>{data.used.toLocaleString('pt-BR')} de {data.limit.toLocaleString('pt-BR')} mensagens enviadas pela Alovia neste mês.</span>
      <span>{exhausted
        ? `Novos envios ficam pausados até ${formatReset(data.resets_at)} ou até um upgrade elegível.`
        : `Restam ${(data.remaining??0).toLocaleString('pt-BR')} mensagens até ${formatReset(data.resets_at)}.`}</span>
    </div>
    {exhausted&&canManage&&data.upgrade_plan==='plus'
      ? <Link className="compact-button" to="/app/mais/plano?upgrade=plus">Ver Plus</Link>
      : null}
  </section>
}

export function MessageUsageCard() {
  const {membership,user} = useAuth()
  const usage = useMessageUsage(membership?.access_mode === 'paid')
  const [busy,setBusy] = useState(false)
  const [message,setMessage] = useState('')
  const [error,setError] = useState('')
  const data=usage.data
  const canManage=membership?.role==='owner'||membership?.role==='admin'

  useEffect(()=>{
    if(!data?.quota_applies||!data.limit)return
    const state=data.exhausted?'exhausted':ratio(data.used,data.limit)>=0.8?'warning':null
    if(!state)return
    trackEventOnce(
      `message_quota_${state}:${membership?.business_id??'unknown'}:${data.period_start}`,
      `message_quota_${state}_viewed`,
      {plan:data.plan,used:data.used,limit:data.limit,remaining:data.remaining},
      {surface:'plan_management',businessId:membership?.business_id,userId:user?.id},
    )
  },[data,membership?.business_id,user?.id])

  if(usage.isPending)return <section className="account-action-section account-billing-section"><h2>Franquia de mensagens</h2><p>Carregando consumo…</p></section>
  if(usage.isError||!data?.quota_applies||!data.limit)return null

  async function upgrade() {
    if(busy||!data)return
    setBusy(true)
    setError('')
    setMessage('')
    trackEvent('message_quota_upgrade_clicked', {
      from_plan:data.plan,
      to_plan:'plus',
      used:data.used,
      limit:data.limit,
    }, {surface:'plan_management',businessId:membership?.business_id,userId:user?.id})
    try {
      await api.request('/billing/subscription/upgrade', {
        method:'POST',
        body:JSON.stringify({target_plan:'plus'}),
      })
      await usage.refetch()
      setMessage('Plano Plus ativado. Sua franquia mensal agora é de 900 mensagens.')
    } catch(failure) {
      const detail=failure instanceof ApiError?failure.detail:''
      if(
        detail==='Upgrade is available at renewal for this billing cycle'
        || detail==='Upgrade is available at renewal for this payment method'
      ) {
        setError(`Neste ciclo, a troca para o Plus fica disponível na renovação. Sua franquia atual volta em ${formatReset(data.resets_at)}.`)
      } else {
        setError('Não foi possível alterar o plano agora. Sua assinatura atual não foi modificada.')
      }
    } finally {
      setBusy(false)
    }
  }

  return <section className="account-action-section account-billing-section" aria-label="Franquia de mensagens">
    <h2>Franquia de mensagens</h2>
    <div className={`account-guarantee-state${data.exhausted?' is-active':''}`}>
      <strong>{data.used.toLocaleString('pt-BR')} de {data.limit.toLocaleString('pt-BR')} mensagens usadas</strong>
      <span>{data.exhausted
        ? `A franquia mensal foi atingida. Novos envios ficam pausados até ${formatReset(data.resets_at)}.`
        : `Restam ${(data.remaining??0).toLocaleString('pt-BR')} mensagens. A franquia renova em ${formatReset(data.resets_at)}.`}</span>
      <small>Entradas dos clientes e reações não consomem esta franquia.</small>
    </div>
    {data.exhausted&&data.plan==='basic'&&data.upgrade_plan==='plus'&&canManage&&
      <button className="primary-button" type="button" disabled={busy} onClick={()=>void upgrade()}>
        {busy?'Atualizando plano…':'Migrar para Plus · 900 mensagens/mês'}
      </button>}
    {data.exhausted&&data.plan==='plus'&&
      <p>Você já está no maior plano atual. Os envios voltam automaticamente na renovação mensal da franquia.</p>}
    {message&&<p className="form-success" role="status">{message}</p>}
    {error&&<p className="form-error" role="alert">{error}</p>}
  </section>
}