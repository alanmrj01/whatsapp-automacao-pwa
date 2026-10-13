import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ExternalLink, RotateCw, ShieldCheck } from 'lucide-react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { api } from '../../lib/api'
import { useAuth } from '../auth/useAuth'
import {
  canStartEmbeddedSignup,
  cancelMetaEmbeddedSignup,
  createEmbeddedSignupRunner,
  EmbeddedSignupCancelledError,
  launchMetaEmbeddedSignup,
  prepareMetaEmbeddedSignup,
  resumeMetaEmbeddedSignup,
  type EmbeddedSignupConfiguration,
  type EmbeddedSignupObservation,
  type EmbeddedSignupResult,
  type EmbeddedSignupPhase,
} from './embeddedSignup'
import type { WhatsAppConnection } from './types'
import { useConnection } from './useConnection'

export function EmbeddedSignupButton({autoStart=false}:{autoStart?:boolean} = {}) {
  const {user, membership} = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromOnboarding = searchParams.get('from') === 'onboarding'
  const [phase, setPhase] = useState<EmbeddedSignupPhase>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [connected, setConnected] = useState<WhatsAppConnection | null>(null)
  const [resumeAvailable, setResumeAvailable] = useState(false)
  const [failedAttempts,setFailedAttempts]=useState(0)
  const [autoReady,setAutoReady] = useState(false)
  const serverConnectedRef=useRef(false)
  const serverAttemptIdRef=useRef<string | null>(null)
  const pendingObservationsRef=useRef<EmbeddedSignupObservation[]>([])
  const pendingAssetsRef=useRef<Array<{waba_id:string; phone_number_id?:string}>>([])
  const liveConnection=useConnection()
  const queryKey = useMemo(
    () => ['whatsapp-connection', user?.id, membership?.business_id],
    [user?.id, membership?.business_id],
  )
  const allowed = canStartEmbeddedSignup(
    membership?.access_mode,
    membership?.role,
  )
  const attemptKey = membership?.business_id
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
  const configurationKey = configuration.data
    ? JSON.stringify(configuration.data)
    : null
  const [preparedConfiguration, setPreparedConfiguration] = useState<string | null>(null)
  const [failedConfiguration, setFailedConfiguration] = useState<string | null>(null)
  const [sdkAttempt, setSdkAttempt] = useState(0)
  const sdkReady = configurationKey !== null
    && preparedConfiguration === configurationKey
  const sdkFailed = configurationKey !== null
    && failedConfiguration === configurationKey

  const postObservation = useCallback((
    attemptId:string,
    observation:EmbeddedSignupObservation,
  ) => {
    const payload = {
      attempt_id:attemptId,
      stage: observation.stage,
      ...(observation.authorization_code_received === undefined ? {} : {
        authorization_code_received: observation.authorization_code_received,
      }),
      ...(observation.waba_id_received === undefined ? {} : {
        waba_id_received: observation.waba_id_received,
      }),
      ...(observation.phone_number_id_received === undefined ? {} : {
        phone_number_id_received: observation.phone_number_id_received,
      }),
      ...(observation.intermediate_step_received === undefined ? {} : {
        intermediate_step_received: observation.intermediate_step_received,
      }),
    }
    void api.request<void>('/whatsapp/onboarding/embedded-signup/telemetry', {
      method:'POST', body:JSON.stringify(payload), keepalive:true,
    }).catch(() => {})
  }, [])

  const reportObservation = useCallback((observation:EmbeddedSignupObservation) => {
    const attemptId=serverAttemptIdRef.current
    if (!attemptId) {
      pendingObservationsRef.current.push(observation)
      return
    }
    postObservation(attemptId, observation)
  }, [postObservation])

  const persistAssets = useCallback((
    attemptId:string,
    assets:{waba_id:string; phone_number_id?:string},
  ) => {
    void api.request<void>(
      '/whatsapp/onboarding/embedded-signup/assets',
      {
        method:'POST',
        body:JSON.stringify({attempt_id:attemptId,...assets}),
        keepalive:true,
      },
    ).catch(() => {})
  }, [])

  const flushPendingProviderSignals = useCallback((attemptId:string) => {
    const observations=pendingObservationsRef.current.splice(0)
    for (const observation of observations) postObservation(attemptId, observation)
    const assets=pendingAssetsRef.current.splice(0)
    for (const observedAssets of assets) persistAssets(attemptId, observedAssets)
  }, [persistAssets, postObservation])

  const applyServerConnection = useCallback((connection: WhatsAppConnection) => {
    if (connection.onboarding_attempt_id) {
      serverAttemptIdRef.current=connection.onboarding_attempt_id
    }
    queryClient.setQueryData(queryKey, connection)
    if (connection.status === 'connected') {
      serverConnectedRef.current=true
      if (connection.onboarding_attempt_id) {
        serverAttemptIdRef.current=connection.onboarding_attempt_id
      }
      setConnected(connection)
      setResumeAvailable(false)
      setMessage(null)
      setFailedAttempts(0)
      setPhase('success')
      return
    }
    if (connection.status === 'error') {
      setResumeAvailable(false)
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
      && connection.next_action === 'wait_for_completion'
    ) {
      setResumeAvailable(false)
      setMessage(null)
      setPhase('processing')
    }
  }, [queryClient, queryKey])

  const reconcileConnection = useCallback(async () => {
    try {
      const connection = await queryClient.fetchQuery({
        queryKey,
        queryFn: () => api.request<WhatsAppConnection>('/whatsapp/connection'),
        staleTime: 0,
      })
      applyServerConnection(connection)
    } catch {
      // Resume remains available; connection checks must not abort onboarding.
    }
  }, [applyServerConnection, queryClient, queryKey])

  // The server is authoritative. Meta can finish successfully while the
  // browser is still unwinding popup/session callbacks; as soon as the
  // shared connection query observes CONNECTED, the local signup UI follows.
  useEffect(() => {
    if (liveConnection.data) {
      applyServerConnection(liveConnection.data)
    }
  }, [applyServerConnection, liveConnection.data])

  useEffect(() => {
    if (!allowed || !configuration.data || !configurationKey) return
    let active = true
    void prepareMetaEmbeddedSignup(configuration.data, window, reportObservation)
      .then(() => {
        if (active) {
          setPreparedConfiguration(configurationKey)
          setFailedConfiguration(null)
        }
      })
      .catch(() => {
        if (active) {
          setPhase('error')
          setFailedConfiguration(configurationKey)
          setMessage('Não foi possível preparar a conexão com a Meta. Tente novamente.')
        }
      })
    return () => { active = false }
  }, [allowed, configuration.data, configurationKey, reportObservation, sdkAttempt])

  useEffect(() => () => {
    if (attemptKey) cancelMetaEmbeddedSignup(attemptKey)
  }, [attemptKey])

  useEffect(() => {
    if (phase === 'success' && fromOnboarding) {
      navigate('/app/onboarding', {replace:true})
    }
  }, [fromOnboarding, navigate, phase])

  const run = useMemo(() => createEmbeddedSignupRunner({
    start: () => {
      if (!configuration.data || !sdkReady) throw new Error('Meta unavailable')
      return configuration.data
    },
    launch: (signupConfiguration) => {
      // FB.login must stay in the original click task. Starting async work is
      // safe here, but awaiting the server attempt before opening Meta breaks
      // user activation on mobile browsers and can detach popup callbacks.
      serverAttemptIdRef.current=null
      pendingObservationsRef.current=[]
      pendingAssetsRef.current=[]
      const idempotencyKey=crypto.randomUUID()
      const attemptPromise=api.request<WhatsAppConnection>(
        '/whatsapp/onboarding/embedded-signup/attempt',
        {
          method:'POST',
          body:'{}',
          headers:{'Idempotency-Key':idempotencyKey},
          keepalive:true,
        },
      ).then((pending) => {
        if (!pending.onboarding_attempt_id) {
          throw new Error('Onboarding attempt unavailable')
        }
        serverAttemptIdRef.current=pending.onboarding_attempt_id
        applyServerConnection(pending)
        flushPendingProviderSignals(pending.onboarding_attempt_id)
        return pending
      })

      const providerPromise=launchMetaEmbeddedSignup(
        signupConfiguration,
        window,
        {
          attemptKey,
          onObservation: reportObservation,
          onResumeRequired: () => {
            setPhase('waiting')
            setMessage(null)
            setResumeAvailable(true)
            void reconcileConnection()
          },
          onAssetsObserved: (assets) => {
            const attemptId=serverAttemptIdRef.current
            if (!attemptId) {
              pendingAssetsRef.current.push(assets)
              return
            }
            persistAssets(attemptId, assets)
          },
        },
      )

      // Completion cannot reach the backend until the correlated server
      // attempt exists, but opening Meta itself never waits on the network.
      return Promise.all([attemptPromise, providerPromise])
        .then(([, result]) => result)
    },
    complete: (result: EmbeddedSignupResult) => {
      const attemptId=serverAttemptIdRef.current
      if (!attemptId) return Promise.reject(new Error('Onboarding attempt unavailable'))
      return api.request<WhatsAppConnection>(
        '/whatsapp/onboarding/embedded-signup/complete',
        {
          method:'POST',
          body:JSON.stringify({attempt_id:attemptId,...result}),
        },
      )
    },
    onPhase: (nextPhase, error) => {
      if (serverConnectedRef.current && nextPhase !== 'success') return
      setPhase(nextPhase)
      setMessage(error?.message ?? null)
      if (nextPhase === 'error' || nextPhase === 'success') setResumeAvailable(false)
      if (nextPhase === 'error' && error && !(error instanceof EmbeddedSignupCancelledError)) {
        setFailedAttempts(value=>value+1)
      }
      if (nextPhase === 'success') setFailedAttempts(0)
    },
    onConnected: async (connection: WhatsAppConnection) => {
      serverConnectedRef.current=true
      setConnected(connection)
      setResumeAvailable(false)
      queryClient.setQueryData(queryKey, connection)
      await queryClient.invalidateQueries({queryKey, refetchType:'none'})
    },
    onObservation: reportObservation,
  }), [
    applyServerConnection,
    attemptKey,
    configuration.data,
    flushPendingProviderSignals,
    persistAssets,
    queryClient,
    queryKey,
    reconcileConnection,
    reportObservation,
    sdkReady,
  ])

  // Meta's login dialog requires a user gesture on many browsers.
  // Preparing automatically is safe; opening the popup is explicitly confirmed.
  useEffect(() => {
    if (autoStart && sdkReady) setAutoReady(true)
  }, [autoStart, sdkReady])


  if (!allowed) {
    return (
      <PrimaryButton fullWidth disabled icon={<ShieldCheck size={18} />}>
        Disponível nos pacotes pagos para administradores
      </PrimaryButton>
    )
  }

  const busy = phase === 'opening' || phase === 'processing'
  const preparing = configuration.isPending
    || (!!configuration.data && !sdkReady && !sdkFailed)
  const buttonLabel = phase === 'success'
    ? 'WhatsApp conectado'
    : preparing
      ? 'Preparando conexão…'
      : configuration.isError || sdkFailed
        ? 'Tentar preparar novamente'
        : phase === 'waiting'
          ? 'Retomar validação'
        : phase === 'opening'
          ? 'Abrindo a Meta…'
          : phase === 'processing'
            ? 'Validando conexão…'
            : phase === 'error'
              ? 'Tentar novamente'
              : 'Continuar com a Meta'

  return (
    <div className="embedded-signup-action">
      {autoReady && phase === 'idle' && <p role="status">Conexão preparada. Toque abaixo para abrir a autorização da Meta.</p>}
      <PrimaryButton
        fullWidth
        disabled={busy || preparing || phase === 'success'}
        icon={phase === 'error' ? <RotateCw size={18} /> : <ExternalLink size={18} />}
        onClick={() => {
          if (phase === 'waiting') {
            if (resumeMetaEmbeddedSignup(attemptKey)) {
              setResumeAvailable(false)
              setPhase('opening')
            } else {
              void reconcileConnection()
            }
            return
          }
          if (configuration.isError) {
            void configuration.refetch()
            return
          }
          if (sdkFailed) {
            setPhase('idle')
            setFailedConfiguration(null)
            setSdkAttempt(value => value + 1)
            return
          }
          void run().catch(() => {})
        }}
      >
        {buttonLabel}
      </PrimaryButton>
      {phase === 'opening' && <p role="status">Aguardando conclusão na Meta…</p>}
      {phase === 'waiting' && resumeAvailable && <p role="status">
        Retome a validação com segurança. A tentativa atual será reutilizada.
      </p>}
      {phase === 'processing' && <p role="status">Validando conexão…</p>}
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
