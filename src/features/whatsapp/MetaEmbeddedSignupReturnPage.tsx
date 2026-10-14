import { useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { LoadingState } from '../../components/LoadingState'
import { api } from '../../lib/api'
import { useAuth } from '../auth/useAuth'
import type { WhatsAppConnection } from './types'

type ReturnState = 'processing' | 'error'

export function MetaEmbeddedSignupReturnPage() {
  const {user, membership} = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [returnState, setReturnState] = useState<ReturnState>('processing')
  const queryKey = useMemo(
    () => ['whatsapp-connection', user?.id, membership?.business_id],
    [user?.id, membership?.business_id],
  )

  useEffect(() => {
    let active = true
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    const providerError = params.get('error')

    // Remove short-lived OAuth material from the visible URL/history before
    // any network work. The signed state remains only in memory for this turn.
    window.history.replaceState(null, '', '/app/whatsapp/meta-return')

    const returnToConnection = (suffix: string) => {
      if (!active) return
      navigate(`/app/whatsapp/business?${suffix}`, {replace:true})
    }

    const run = async () => {
      if (!state) {
        throw new Error('Missing Meta redirect state')
      }

      if (providerError || !code) {
        try {
          const connection = await api.request<WhatsAppConnection>(
            '/whatsapp/onboarding/embedded-signup/redirect/cancel',
            {
              method:'POST',
              body:JSON.stringify({state}),
            },
          )
          queryClient.setQueryData(queryKey, connection)
        } finally {
          returnToConnection('meta=cancelled')
        }
        return
      }

      const connection = await api.request<WhatsAppConnection>(
        '/whatsapp/onboarding/embedded-signup/complete',
        {
          method:'POST',
          body:JSON.stringify({
            authorization_code:code,
            redirect_state:state,
          }),
        },
      )
      queryClient.setQueryData(queryKey, connection)
      returnToConnection(
        connection.status === 'connected'
          ? 'meta=connected'
          : 'meta=processing',
      )
    }

    void run().catch(() => {
      if (!active) return
      setReturnState('error')
    })

    return () => {
      active = false
    }
  }, [navigate, queryClient, queryKey])

  if (returnState === 'error') {
    return (
      <div className="state-card" role="alert">
        <h2>Não foi possível validar o retorno da Meta</h2>
        <p>Volte para a conexão do WhatsApp e tente novamente.</p>
        <button
          className="compact-button"
          type="button"
          onClick={() => navigate('/app/whatsapp/business', {replace:true})}
        >
          Voltar para a conexão
        </button>
      </div>
    )
  }

  return (
    <div aria-live="polite">
      <LoadingState />
      <p className="route-loading">Validando a autorização com a Meta…</p>
    </div>
  )
}
