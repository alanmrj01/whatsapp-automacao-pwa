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
  const serverConnectedRef=useRef(false)
  const serverAttemptIdRef=useRef<string | null>(null)
  const startingRef=useRef(false)
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
            : connection.error_reason === 'provider_unavailable'
              ? 'A Meta está temporariamente indisponível. Tente novamente em instantes.'
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

  // A troca do authorization code acontece no backend. Ao voltar da Meta, um
  // reload, troca de aba ou PWA instalada apenas reconcilia o estado oficial.
  useEffect(() => {
    if (liveConnection.data) applyServerConnection(liveConnection.data)
  }, [applyServerConnection, liveConnection.data])

  useEffect(() => {
    if (autoStart && allowed) setAutoReady(true)
  }, [allowed, autoStart])

  useEffect(() => {
    if (
      fromOnboarding
      && (
        phase === 'success'
        || (
          liveConnection.data?.status === 'pending'
          && liveConnection.data.next_action === 'wait_for_meta_review'
        )
      )
    ) {
      navigate('/app/onboarding', {replace:true})
    }
  }, [
    fromOnboarding,
    liveConnection.data?.next_action,
    liveConnection.data?.status,
    navigate,
    phase,
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

      const returnUri=`${window.location.origin}/app/whatsapp/business`
      const redirect=await api.request<MetaRedirectStartResponse>(
        '/whatsapp/onboarding/embedded-signup/redirect/start',
        {
          method:'POST',
          body:JSON.stringify({
            attempt_id:pending.onboarding_attempt_id,
            return_uri:returnUri,
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
        {liveConnection.data?.next_action === 'wait_for_meta_review'
          ? 'Sua autorização foi concluída. Aguardando verificação da Meta; nenhuma ação é necessária agora.'
          : 'A Alovia está validando a autorização no servidor. Nenhuma ação é necessária.'}
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
          navigate('/app/whatsapp/exclusivo?origem=coexistence&fallback=1'+(fromOnboarding?'&from=onboarding':''))
        }}>Ver opção de uso exclusivo</button>
      </div>}
    </div>
  )
}
