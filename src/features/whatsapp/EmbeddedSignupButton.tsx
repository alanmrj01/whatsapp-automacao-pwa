import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ExternalLink, RotateCw, ShieldCheck } from 'lucide-react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { api } from '../../lib/api'
import { useAuth } from '../auth/useAuth'
import {
  canStartEmbeddedSignup,
  EmbeddedSignupCancelledError,
  type EmbeddedSignupPhase,
} from './embeddedSignup'
import type { WhatsAppConnection } from './types'
import { useConnection } from './useConnection'

type MetaRedirectStartResponse = {
  attempt_id: string
  authorization_url: string
}

const META_CALLBACK_QUERY_KEYS = [
  'code',
  'state',
  'error',
  'error_code',
  'error_reason',
  'error_description',
] as const

function returnToOnboardingFromValidatedState(state: string) {
  try {
    const encoded=state.split('.', 1)[0]
    const normalized=encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded=normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
    const payload=JSON.parse(window.atob(padded)) as {return_to_onboarding?:unknown}
    return payload.return_to_onboarding === true
  } catch {
    return false
  }
}

function cleanMetaCallbackUrl(returnToOnboarding: boolean) {
  const url = new URL(window.location.href)
  for (const key of META_CALLBACK_QUERY_KEYS) url.searchParams.delete(key)
  if (returnToOnboarding) url.searchParams.set('from', 'onboarding')
  window.history.replaceState(window.history.state, '', url.toString())
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
  const [failedAttempts,setFailedAttempts]=useState(0)
  const [autoReady,setAutoReady] = useState(false)
  const [returnToOnboarding,setReturnToOnboarding] = useState(fromOnboarding)
  const serverConnectedRef=useRef(false)
  const serverAttemptIdRef=useRef<string | null>(null)
  const startingRef=useRef(false)
  const callbackHandledRef=useRef(false)
  const liveConnection=useConnection()
  const queryKey = useMemo(
    () => ['whatsapp-connection', user?.id, membership?.business_id],
    [user?.id, membership?.business_id],
  )
  const allowed = canStartEmbeddedSignup(
    membership?.access_mode,
    membership?.role,
  )

  const applyServerConnection = useCallback((connection: WhatsAppConnection) => {
    if (connection.onboarding_attempt_id) {
      serverAttemptIdRef.current=connection.onboarding_attempt_id
    }
    queryClient.setQueryData(queryKey, connection)
    if (connection.status === 'connected') {
      serverConnectedRef.current=true
      setConnected(connection)
      setMessage(null)
      setFailedAttempts(0)
      setPhase('success')
      return
    }
    if (connection.status === 'error') {
      setPhase('error')
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
      && (
        connection.next_action === 'wait_for_completion'
        || connection.next_action === 'wait_for_meta_review'
      )
    ) {
      setMessage(null)
      setPhase('processing')
    }
  }, [queryClient, queryKey])

  const reconcileConnection = useCallback(async (): Promise<WhatsAppConnection | null> => {
    try {
      const connection = await queryClient.fetchQuery({
        queryKey,
        queryFn: () => api.request<WhatsAppConnection>('/whatsapp/connection'),
        staleTime: 0,
      })
      applyServerConnection(connection)
      return connection
    } catch {
      // A leitura do estado do servidor nunca reinicia a autorização da Meta.
      return null
    }
  }, [applyServerConnection, queryClient, queryKey])

  // The server remains authoritative after redirects, reloads and tab switches.
  useEffect(() => {
    if (liveConnection.data) applyServerConnection(liveConnection.data)
  }, [applyServerConnection, liveConnection.data])

  useEffect(() => {
    if (autoStart && allowed) setAutoReady(true)
  }, [allowed, autoStart])

  useEffect(() => {
    if (phase === 'success' && returnToOnboarding) {
      navigate('/app/onboarding', {replace:true})
    }
  }, [navigate, phase, returnToOnboarding])

  useEffect(() => {
    if (callbackHandledRef.current || !membership?.business_id) return

    const authorizationCode=searchParams.get('code')
    const state=searchParams.get('state')
    const providerError=searchParams.get('error')
    const hasMetaCallback=Boolean(authorizationCode || state || providerError)
    if (!hasMetaCallback) return

    callbackHandledRef.current=true
    cleanMetaCallbackUrl(false)

    if (providerError || !authorizationCode || !state) {
      setPhase('error')
      setMessage('A autorização da Meta não foi concluída. Tente novamente.')
      setFailedAttempts(value=>value+1)
      return
    }

    setPhase('processing')
    setMessage(null)
    void api.request<WhatsAppConnection>(
      '/whatsapp/onboarding/embedded-signup/complete',
      {
        method:'POST',
        body:JSON.stringify({
          authorization_code:authorizationCode,
          state,
        }),
      },
    ).then((connection) => {
      setReturnToOnboarding(returnToOnboardingFromValidatedState(state))
      applyServerConnection(connection)
    }).catch(() => {
      setPhase('error')
      setMessage('Não foi possível validar a autorização da Meta. Tente novamente.')
      setFailedAttempts(value=>value+1)
    })
  }, [
    applyServerConnection,
    fromOnboarding,
    membership?.business_id,
    searchParams,
  ])

  const startRedirectFlow = useCallback(async () => {
    if (!allowed || startingRef.current || serverConnectedRef.current) return
    startingRef.current=true
    setAutoReady(false)
    setPhase('opening')
    setMessage(null)

    try {
      const pending=await api.request<WhatsAppConnection>(
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
      serverAttemptIdRef.current=pending.onboarding_attempt_id
      applyServerConnection(pending)

      const redirectUri=`${window.location.origin}/app/whatsapp/business`
      const redirect=await api.request<MetaRedirectStartResponse>(
        '/whatsapp/onboarding/embedded-signup/redirect/start',
        {
          method:'POST',
          body:JSON.stringify({
            attempt_id:pending.onboarding_attempt_id,
            redirect_uri:redirectUri,
            return_to_onboarding:fromOnboarding,
          }),
        },
      )
      if (
        redirect.attempt_id !== pending.onboarding_attempt_id
        || !redirect.authorization_url.startsWith('https://www.facebook.com/')
      ) {
        throw new Error('Meta redirect unavailable')
      }
      window.location.assign(redirect.authorization_url)
    } catch {
      startingRef.current=false
      setPhase('error')
      setMessage('Não foi possível abrir a autorização da Meta. Tente novamente.')
      setFailedAttempts(value=>value+1)
    }
  }, [
    allowed,
    applyServerConnection,
    fromOnboarding,
  ])

  if (!allowed) {
    return (
      <PrimaryButton fullWidth disabled icon={<ShieldCheck size={18} />}>
        Disponível nos pacotes pagos para administradores
      </PrimaryButton>
    )
  }

  const busy = phase === 'opening' || phase === 'processing'
  const buttonLabel = phase === 'success'
    ? 'WhatsApp conectado'
    : phase === 'opening'
      ? 'Abrindo a Meta…'
      : phase === 'processing'
        ? 'Validando conexão…'
        : phase === 'error'
          ? 'Tentar novamente'
          : 'Continuar com a Meta'

  return (
    <div className="embedded-signup-action">
      {autoReady && phase === 'idle' && <p role="status">
        Conexão preparada. Toque abaixo para abrir a autorização da Meta.
      </p>}
      <PrimaryButton
        fullWidth
        disabled={busy || phase === 'success'}
        icon={phase === 'error' ? <RotateCw size={18} /> : <ExternalLink size={18} />}
        onClick={() => {
          if (phase === 'error') {
            void reconcileConnection().then((connection) => {
              if (
                !connection
                || connection.status === 'error'
                || connection.next_action === 'continue_authorization'
                || connection.next_action === 'choose_mode'
              ) {
                void startRedirectFlow()
              }
            })
            return
          }
          void startRedirectFlow()
        }}
      >
        {buttonLabel}
      </PrimaryButton>
      {phase === 'opening' && <p role="status">Redirecionando para a Meta…</p>}
      {phase === 'processing' && <p role="status">
        A Alovia está validando a autorização no servidor. Nenhuma ação é necessária.
      </p>}
      {phase === 'success' && <p className="embedded-signup-action__success" role="status">
        Conexão oficial confirmada{connected?.display_phone_number
          ? ` para o número ${connected.display_phone_number}`
          : ''}.
      </p>}
      {phase === 'error' && <p className="embedded-signup-action__error" role="alert">
        {message ?? new EmbeddedSignupCancelledError().message}
      </p>}
      {failedAttempts>=2&&phase==='error'&&<div className="embedded-signup-fallback">
        <strong>Quer começar pela Alovia sem esperar por esta conexão?</strong>
        <p>A Meta ainda não concluiu o uso conjunto deste número. Você pode tentar novamente depois ou escolher o uso exclusivo pela Alovia. No modo exclusivo, este número deixa de funcionar simultaneamente no aplicativo WhatsApp Business.</p>
        <button className="compact-button" type="button" onClick={()=>{
          navigate('/app/whatsapp/exclusivo?origem=coexistence&fallback=1'+(returnToOnboarding?'&from=onboarding':''))
        }}>Ver opção de uso exclusivo</button>
      </div>}
    </div>
  )
}
