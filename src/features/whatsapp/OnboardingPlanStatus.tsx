import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { ErrorState } from '../../components/ErrorState'
import { useAuth } from '../auth/useAuth'
import type { WhatsAppConnectionMode } from './types'

export function OnboardingPlanStatus({mode}: {mode:WhatsAppConnectionMode}) {
  const {membership} = useAuth()
  const plan = useQuery({
    queryKey:['whatsapp-plan',membership?.business_id,mode],
    queryFn:({signal})=>api.request<{requested_mode:WhatsAppConnectionMode;ready_to_continue:boolean}>('/whatsapp/onboarding/plan',{
      method:'POST',signal,body:JSON.stringify({intent:mode==='coexistence'?'keep_whatsapp_business':'use_new_or_dedicated_number'}),
    }),
    enabled:membership?.access_mode === 'paid', retry:false, gcTime:0,
  })
  if (membership?.access_mode !== 'paid') return null
  if (plan.isPending) return <p role="status">Validando a opção de atendimento…</p>
  if (plan.isError || plan.data.requested_mode !== mode || !plan.data.ready_to_continue) return <ErrorState onRetry={()=>void plan.refetch()} />
  return <p className="plan-note" role="status">Opção validada pela plataforma para a empresa ativa.</p>
}
