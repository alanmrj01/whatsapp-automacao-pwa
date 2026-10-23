import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ExternalLink, RotateCw, ShieldCheck } from 'lucide-react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { api } from '../../lib/api'
import { trackEventOnce } from '../../lib/tracking'
import { useAuth } from '../auth/useAuth'
import {
  canStartEmbeddedSignup,
  type EmbeddedSignupConfiguration,
  type EmbeddedSignupPhase,
} from './embeddedSignup'
import type { WhatsAppConnection } from './types'
import { useConnection } from './useConnection'

type MetaRedirectStartResponse = {
  attempt_id: string
  authorization_url: string
}


export function EmbeddedSignupButton({autoStart=false}:{autoStart?:boolean} = {}) {
  const {user, membership} = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromOnboarding = searchParams.get('from') === 'onboarding'
  const [phase, setPhase] = useState<EmbeddedSignupPhase>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [connected, setConnected] = useState<WhatsAppConnection | null>(null)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const liveConnection = useConnection()
  const queryKey = useMemo(
    () => ['whatsapp-connection', user?.id, membership?.business_id],
    [user?.id, membership?.business_id],
  )
  const allowed = canStartEmbeddedSignup(
    membership?.access_mode,
    membership?.role,
  )
  const configuration = useQuery({
    queryKey: ['meta-embedded-signup-configuration', membership?.business_id],
    queryFn: ({signal}) => api.request<EmbeddedSignupConfiguration>(
      '/whatsapp/onboarding/embedded-signup/start',
      {method:'POST', body:'{}', signal},
    ),
    enabled: allowed,
    retry: false,
    staleTime: 60_000,
    gcTime: 0,
  })

  const applyServerConnection = useCallback((connection: WhatsAppConnection) => {
    queryClient.setQueryData(queryKey, connection)
    if (connection.status === 'connected') {
      setConnected(connection)
      setMessage(null)
      setFailedAttempts(0)
      setPhase('success')
      trackEventOnce(
        `whatsapp_connection_completed:${membership?.business_id ?? 'unknown'}:${connection.onboarding_attempt_id ?? connection.mode ?? 'current'}`,
        'whatsapp_connection_completed',
        {
          mode: connection.mode,
          funnel_stage: 'whatsapp_connected',
          from_onboarding: fromOnboarding,
        },
        {
          surface: 'whatsapp_onboarding',
          businessId: membership?.business_id,
          userId: user?.id,
        },
      )
      return
    }
    if (connection.status === 'pending') {
      trackEventOnce(
        `whatsapp_connection_pending:${membership?.business_id ?? 'unknown'}:${connection.onboarding_attempt_id ?? 'current'}:${connection.pending_state ?? connection.journey_state ?? connection.next_action ?? 'pending'}`,
        'whatsapp_connection_blocked',
        {
          reason: connection.pending_state ?? connection.journey_state ?? 'pending',
          next_action: connection.next_action ?? null,
          review_status: connection.review_status ?? null,
          mode: connection.mode,
          preferred_mode: connection.preferred_mode ?? null,
          from_onboarding: fromOnboarding,
        },
        {
          surface: 'whatsapp_onboarding',
          businessId: membership?.business_id,
          userId: user?.id,
        },
      )
    }
    if (connection.status === 'error') {
      setPhase('error')
      trackEventOnce(
        `whatsapp_connection_failed:${membership?.business_id ?? 'unknown'}:${connection.onboarding_attempt_id ?? connection.error_reason ?? 'unknown'}`,
        'whatsapp_connection_failed',
        {
          reason: connection.error_reason ?? 'unknown',
          mode: connection.mode,
          from_onboarding: fromOnboarding,
        },
        {
          surface: 'whatsapp_onboarding',
          businessId: membership?.business_id,
          userId: user?.id,
        },
      )
      setMessage(
        connection.error_reason === 'authorization_incomplete'
          ? 'A autorização da Meta não foi concluída. Tente novamente.'
          : connection.error_reason === 'onboarding_expired'
            ? 'A tentativa expirou antes da conclusão. Inicie uma nova conexão.'
            : 'A conexão não foi concluída. Tente novamente.',
      )
      return
    }
    if (
      connection.status === 'pending'
      && connection.next_action === 'wait_for_completion'
    ) {
      setMessage(null)
      setPhase('processing')
      return
    }
    if (
      connection.status === 'pending'
      && connection.next_action === 'continue_authorization'
    ) {
      setMessage(null)
      setPhase('waiting')
    }
  }, [fromOnboarding, membership?.business_id, queryClient, queryKey, user?.id])

  useEffect(() => {
    if (liveConnection.data) applyServerConnection(liveConnection.data)
  }, [applyServerConnection, liveConnection.data])

  useEffect(() => {
    if (phase === 'success' && fromOnboarding) {
      navigate('/app/onboarding', {replace:true})
    }
  }, [fromOnboarding, navigate, phase])

  const beginRedirectSignup = useCallback(async () => {
    if (!configuration.data) {
      throw new Error('Meta unavailable')
    }
    setPhase('opening')
    setMessage(null)

    const pending = await api.request<WhatsAppConnection>(
      '/whatsapp/onboarding/embedded-signup/attempt',
      {
        method:'POST',
        body:'{}',
        headers:{'Idempotency-Key':crypto.randomUUID()},
        keepalive:true,
      },
    )
    if (!pending.onboarding_attempt_id) {
      throw new Error('Onboarding attempt unavailable')
    }
    applyServerConnection(pending)
    trackEventOnce(
      `whatsapp_connection_started:${pending.onboarding_attempt_id}`,
      'whatsapp_connection_started',
      {
        preferred_mode: pending.preferred_mode ?? pending.mode,
        from_onboarding: fromOnboarding,
      },
      {
        surface: 'whatsapp_onboarding',
        businessId: membership?.business_id,
        userId: user?.id,
      },
    )

    const redirect = await api.request<MetaRedirectStartResponse>(
      '/whatsapp/onboarding/embedded-signup/redirect/start',
      {
        method:'POST',
        body:JSON.stringify({
          attempt_id:pending.onboarding_attempt_id,
          return_to_onboarding:fromOnboarding,
        }),
      },
    )
    if (
      redirect.attempt_id !== pending.onboarding_attempt_id
      || !/^https:\/\/www\.facebook\.com\//.test(redirect.authorization_url)
    ) {
      throw new Error('Meta redirect unavailable')
    }

    window.location.assign(redirect.authorization_url)
  }, [applyServerConnection, configuration.data, fromOnboarding, membership?.business_id, user?.id])

  if (!allowed) {
    return (
      <PrimaryButton fullWidth disabled icon={<ShieldCheck size={18} />}>
        Disponível nos pacotes pagos para administradores
      </PrimaryButton>
    )
  }

  const preparing = configuration.isPending
  const busy = phase === 'opening' || phase === 'processing'
  const buttonLabel = phase === 'success'
    ? 'WhatsApp conectado'
    : preparing
      ? 'Preparando conexão…'
      : configuration.isError
        ? 'Tentar preparar novamente'
        : phase === 'opening'
          ? 'Abrindo a Meta…'
          : phase === 'processing'
            ? 'Validando conexão…'
            : phase === 'error'
              ? 'Tentar novamente'
              : 'Continuar com a Meta'

  return (
    <div className="embedded-signup-action">
      {autoStart && phase === 'idle' && !preparing && !configuration.isError && (
        <p role="status">Conexão preparada. Toque abaixo para abrir a autorização da Meta.</p>
      )}
      <PrimaryButton
        fullWidth
        disabled={busy || preparing || phase === 'success'}
        icon={phase === 'error' ? <RotateCw size={18} /> : <ExternalLink size={18} />}
        onClick={() => {
          if (configuration.isError) {
            void configuration.refetch()
            return
          }
          void beginRedirectSignup().catch(() => {
            trackEventOnce(
              `whatsapp_connection_redirect_failed:${membership?.business_id ?? 'unknown'}`,
              'whatsapp_connection_failed',
              {
                reason:'redirect_start_failed',
                from_onboarding:fromOnboarding,
              },
              {
                surface:'whatsapp_onboarding',
                businessId:membership?.business_id,
                userId:user?.id,
              },
              'session',
            )
            setFailedAttempts(value => value + 1)
            setPhase('error')
            setMessage('Não foi possível abrir a autorização da Meta. Tente novamente.')
          })
        }}
      >
        {buttonLabel}
      </PrimaryButton>
      {phase === 'opening' && <p role="status">
        Abrindo a autorização oficial da Meta…
      </p>}
      {phase === 'waiting' && <p role="status">
        A autorização ainda não foi concluída. Continue pela Meta quando estiver pronto.
      </p>}
      {phase === 'processing' && <p role="status">Validando conexão…</p>}
      {phase === 'success' && <p className="embedded-signup-action__success" role="status">
        Conexão oficial confirmada{connected?.display_phone_number
          ? ` para o número ${connected.display_phone_number}`
          : ''}.
      </p>}
      {phase === 'error' && <p className="embedded-signup-action__error" role="alert">
        {message ?? 'Não foi possível concluir a conexão.'}
      </p>}
      {failedAttempts>=2&&phase==='error'&&<div className="embedded-signup-fallback">
        <strong>Quer começar pela Alovia sem esperar por esta conexão?</strong>
        <p>A Meta ainda não concluiu o uso conjunto deste número. Você pode tentar novamente depois ou escolher o uso exclusivo pela Alovia. No modo exclusivo, este número deixa de funcionar simultaneamente no aplicativo WhatsApp Business.</p>
        <button className="compact-button" type="button" onClick={()=>{
          navigate('/app/whatsapp/exclusivo?origem=coexistence&fallback=1'+(fromOnboarding?'&from=onboarding':''))
        }}>Ver opção de uso exclusivo</button>
      </div>}
    </div>
  )
}
