import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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

export function EmbeddedSignupButton() {
  const {user, membership} = useAuth()
  const queryClient = useQueryClient()
  const [phase, setPhase] = useState<EmbeddedSignupPhase>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [connected, setConnected] = useState<WhatsAppConnection | null>(null)
  const [resumeAvailable, setResumeAvailable] = useState(false)
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

  const reportObservation = useCallback((observation: EmbeddedSignupObservation) => {
    const payload = {
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
      method:'POST', body:JSON.stringify(payload),
    }).catch(() => {})
  }, [])

  const reconcileConnection = useCallback(async () => {
    try {
      const connection = await queryClient.fetchQuery({
        queryKey,
        queryFn: () => api.request<WhatsAppConnection>('/whatsapp/connection'),
        staleTime: 0,
      })
      if (connection.status === 'connected') {
        setConnected(connection)
        setResumeAvailable(false)
        setMessage(null)
        setPhase('success')
      }
    } catch {
      // Resume remains available; connection checks must not abort onboarding.
    }
  }, [queryClient, queryKey])

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

  const run = useMemo(() => createEmbeddedSignupRunner({
    start: () => {
      if (!configuration.data || !sdkReady) throw new Error('Meta unavailable')
      return configuration.data
    },
    launch: (signupConfiguration) => launchMetaEmbeddedSignup(
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
      },
    ),
    complete: (result: EmbeddedSignupResult) => api.request<WhatsAppConnection>(
      '/whatsapp/onboarding/embedded-signup/complete',
      {method:'POST', body:JSON.stringify(result)},
    ),
    onPhase: (nextPhase, error) => {
      setPhase(nextPhase)
      setMessage(error?.message ?? null)
      if (nextPhase === 'error' || nextPhase === 'success') setResumeAvailable(false)
    },
    onConnected: async (connection: WhatsAppConnection) => {
      setConnected(connection)
      setResumeAvailable(false)
      queryClient.setQueryData(queryKey, connection)
      await queryClient.invalidateQueries({queryKey, refetchType:'none'})
    },
    onObservation: reportObservation,
  }), [attemptKey, configuration.data, queryClient, queryKey, reconcileConnection, reportObservation, sdkReady])

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
  const buttonLabel = preparing
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
        : phase === 'success'
          ? 'WhatsApp conectado'
          : 'Continuar com a Meta'

  return (
    <div className="embedded-signup-action">
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
    </div>
  )
}
