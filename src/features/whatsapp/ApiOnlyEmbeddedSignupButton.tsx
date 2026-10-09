import { useCallback, useEffect, useMemo, useState } from 'react'
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
  type EmbeddedSignupPhase,
  type EmbeddedSignupResult,
} from './embeddedSignup'
import type { WhatsAppConnection } from './types'

type ApiOnlyIntent =
  | 'use_new_or_dedicated_number'
  | 'use_existing_number_platform_only'

type ApiOnlyStartConfiguration = EmbeddedSignupConfiguration & {
  mode: 'api_only'
  intent: ApiOnlyIntent
}

export function ApiOnlyEmbeddedSignupButton({
  intent,
  platformOnlyImpactConfirmed,
}: {
  intent: ApiOnlyIntent
  platformOnlyImpactConfirmed: boolean
}) {
  const {user, membership} = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromOnboarding = searchParams.get('from') === 'onboarding'
  const keepCoexistencePreference = searchParams.get('fallback') === '1'
  const [phase, setPhase] = useState<EmbeddedSignupPhase>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [registrationPin, setRegistrationPin] = useState('')
  const [connected, setConnected] = useState<WhatsAppConnection | null>(null)
  const [resumeAvailable, setResumeAvailable] = useState(false)
  const [preparedConfiguration, setPreparedConfiguration] = useState<string | null>(null)
  const [failedConfiguration, setFailedConfiguration] = useState<string | null>(null)
  const [sdkAttempt, setSdkAttempt] = useState(0)
  const allowed = canStartEmbeddedSignup(
    membership?.access_mode,
    membership?.role,
  )
  const confirmationReady = intent !== 'use_existing_number_platform_only'
    || platformOnlyImpactConfirmed
  const attemptKey = membership?.business_id
    ? `${membership.business_id}:api-only`
    : undefined
  const queryKey = useMemo(
    () => ['whatsapp-connection', user?.id, membership?.business_id],
    [user?.id, membership?.business_id],
  )
  const configuration = useQuery({
    queryKey: [
      'meta-api-only-signup-configuration',
      membership?.business_id,
      intent,
      platformOnlyImpactConfirmed,
    ],
    queryFn: ({signal}) => api.request<ApiOnlyStartConfiguration>(
      '/whatsapp/onboarding/api-only/start',
      {
        method:'POST',
        body:JSON.stringify({
          intent,
          platform_only_impact_confirmed: platformOnlyImpactConfirmed,
        }),
        signal,
      },
    ),
    enabled: allowed && confirmationReady,
    retry: false,
    staleTime: 60_000,
    gcTime: 0,
  })
  const configurationKey = configuration.data
    ? JSON.stringify(configuration.data)
    : null
  const sdkReady = configurationKey !== null
    && preparedConfiguration === configurationKey
  const sdkFailed = configurationKey !== null
    && failedConfiguration === configurationKey
  const pinValid = /^\d{6}$/.test(registrationPin)

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
      method:'POST',
      body:JSON.stringify(payload),
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
        setRegistrationPin('')
        setPhase('success')
      }
    } catch {
      // A verificação da conexão não deve interromper uma tentativa retomável.
    }
  }, [queryClient, queryKey])

  useEffect(() => {
    if (!allowed || !confirmationReady || !configuration.data || !configurationKey) return
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
  }, [
    allowed,
    confirmationReady,
    configuration.data,
    configurationKey,
    reportObservation,
    sdkAttempt,
  ])

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
      '/whatsapp/onboarding/api-only/complete',
      {
        method:'POST',
        body:JSON.stringify({
          ...result,
          intent,
          platform_only_impact_confirmed: platformOnlyImpactConfirmed,
          registration_pin: registrationPin,
        }),
      },
    ),
    onPhase: (nextPhase, error) => {
      setPhase(nextPhase)
      setMessage(error?.message ?? null)
      if (nextPhase === 'error' || nextPhase === 'success') setResumeAvailable(false)
    },
    onConnected: async (connection: WhatsAppConnection) => {
      let finalConnection=connection
      if(keepCoexistencePreference){
        try{
          finalConnection=await api.request<WhatsAppConnection>(
            '/whatsapp/mode-preference',
            {
              method:'POST',
              body:JSON.stringify({preferred_mode:'coexistence'}),
            },
          )
        }catch{
          // The exclusive connection is already valid. A failed preference save
          // must not turn a successful WhatsApp connection into an error.
        }
      }
      setConnected(finalConnection)
      setRegistrationPin('')
      setResumeAvailable(false)
      queryClient.setQueryData(queryKey, finalConnection)
      await queryClient.invalidateQueries({queryKey, refetchType:'none'})
    },
    onObservation: reportObservation,
  }), [
    attemptKey,
    configuration.data,
    intent,
    keepCoexistencePreference,
    platformOnlyImpactConfirmed,
    queryClient,
    queryKey,
    reconcileConnection,
    registrationPin,
    reportObservation,
    sdkReady,
  ])

  if (!allowed) {
    return (
      <PrimaryButton fullWidth disabled icon={<ShieldCheck size={18} />}>
        Disponível nos pacotes pagos para administradores
      </PrimaryButton>
    )
  }

  const busy = phase === 'opening' || phase === 'processing'
  const preparing = confirmationReady && (
    configuration.isPending
    || (!!configuration.data && !sdkReady && !sdkFailed)
  )
  const buttonLabel = preparing
    ? 'Preparando conexão…'
    : configuration.isError || sdkFailed
      ? 'Tentar preparar novamente'
      : phase === 'waiting'
        ? 'Retomar validação'
        : phase === 'opening'
          ? 'Abrindo a Meta…'
          : phase === 'processing'
            ? 'Conectando número…'
            : phase === 'error'
              ? 'Tentar novamente'
              : phase === 'success'
                ? 'WhatsApp conectado'
                : 'Continuar com a Meta'

  return (
    <div className="embedded-signup-action">
      <label>
        <strong>PIN de segurança do número</strong>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={6}
          value={registrationPin}
          onChange={event => setRegistrationPin(event.target.value.replace(/\D/g,'').slice(0,6))}
          placeholder="6 dígitos"
          disabled={busy || phase === 'success'}
        />
        <small>
          {intent === 'use_existing_number_platform_only'
            ? 'Use o PIN de 6 dígitos deste número. Se a Meta pedir um novo PIN, use o mesmo valor aqui.'
            : 'Escolha um PIN de 6 dígitos para proteger a conexão deste número. Guarde-o em local seguro.'}
        </small>
      </label>
      <PrimaryButton
        fullWidth
        disabled={
          busy
          || preparing
          || phase === 'success'
          || !pinValid
          || !confirmationReady
        }
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
      {phase === 'processing' && <p role="status">Finalizando a conexão do número…</p>}
      {phase === 'success' && <p className="embedded-signup-action__success" role="status">
        WhatsApp conectado à Alovia{connected?.display_phone_number
          ? ` para o número ${connected.display_phone_number}`
          : ''}.
      </p>}
      {phase === 'error' && <p className="embedded-signup-action__error" role="alert">
        {message ?? new EmbeddedSignupCancelledError().message}
      </p>}
    </div>
  )
}
