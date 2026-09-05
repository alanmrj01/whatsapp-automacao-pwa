import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ExternalLink, RotateCw, ShieldCheck } from 'lucide-react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { api } from '../../lib/api'
import { useAuth } from '../auth/useAuth'
import {
  canStartEmbeddedSignup,
  createEmbeddedSignupRunner,
  EmbeddedSignupCancelledError,
  launchMetaEmbeddedSignup,
  prepareMetaEmbeddedSignup,
  type EmbeddedSignupConfiguration,
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

  useEffect(() => {
    if (!allowed || !configuration.data || !configurationKey) return
    let active = true
    void prepareMetaEmbeddedSignup(configuration.data)
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
  }, [allowed, configuration.data, configurationKey, sdkAttempt])

  const run = useMemo(() => createEmbeddedSignupRunner({
    start: () => {
      if (!configuration.data || !sdkReady) throw new Error('Meta unavailable')
      return configuration.data
    },
    launch: launchMetaEmbeddedSignup,
    complete: (result: EmbeddedSignupResult) => api.request<WhatsAppConnection>(
      '/whatsapp/onboarding/embedded-signup/complete',
      {method:'POST', body:JSON.stringify(result)},
    ),
    onPhase: (nextPhase, error) => {
      setPhase(nextPhase)
      setMessage(error?.message ?? null)
    },
    onConnected: async (connection: WhatsAppConnection) => {
      setConnected(connection)
      queryClient.setQueryData(queryKey, connection)
      await queryClient.invalidateQueries({queryKey, refetchType:'none'})
    },
  }), [configuration.data, queryClient, queryKey, sdkReady])

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
      {busy && <p role="status">Conclua a autorização na janela segura da Meta.</p>}
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
