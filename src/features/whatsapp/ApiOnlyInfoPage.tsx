import { Smartphone } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApiOnlyEmbeddedSignupButton } from './ApiOnlyEmbeddedSignupButton'
import { ConnectionInfoPage } from './ConnectionInfoPage'

export function ApiOnlyInfoPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromCoexistence = searchParams.get('origem') === 'coexistence'
  const fromOnboarding = searchParams.get('from') === 'onboarding'
  const [impactConfirmed, setImpactConfirmed] = useState(false)
  const [appRemovedConfirmed, setAppRemovedConfirmed] = useState(false)
  const intent = fromCoexistence
    ? 'use_existing_number_platform_only' as const
    : 'use_new_or_dedicated_number' as const
  const migrationReady = !fromCoexistence || (impactConfirmed && appRemovedConfirmed)

  return (
    <ConnectionInfoPage
      mode="api_only"
      icon={Smartphone}
      title={fromCoexistence
        ? 'Usar WhatsApp exclusivamente na Alovia'
        : 'Atendimento centralizado'}
      description={fromCoexistence
        ? 'Se a coexistência não puder ser concluída, você pode usar outro número ou migrar este número para a Cloud API.'
        : 'O atendimento automático e o atendimento humano deste número serão feitos pela plataforma.'}
      benefits={fromCoexistence ? [
        'Se você quiser preservar este WhatsApp Business como está, use outro número exclusivo na Alovia.',
        'Para migrar o mesmo número, a conta desse número precisa deixar o WhatsApp Business app antes do cadastro na Cloud API.',
        'Na migração exclusiva, o histórico existente do aplicativo não é levado para a Cloud API.',
      ] : [
        'O número será dedicado ao atendimento da empresa.',
        'Conversas e agendamentos ficarão organizados em um só lugar.',
        'A autorização e o registro do número acontecem pela conexão oficial da Meta.',
      ]}
      callout={fromCoexistence
        ? 'A Alovia nunca remove nem migra seu número automaticamente. Faça backup do que precisar antes de optar pela migração exclusiva.'
        : 'Use um número novo ou que você decidiu dedicar ao atendimento pela Alovia.'}
      action={
        <div className="api-only-onboarding-action">
          {fromCoexistence && <>
            <button
              className="compact-button"
              type="button"
              onClick={() => navigate(
                '/app/whatsapp/exclusivo' + (fromOnboarding ? '?from=onboarding' : ''),
              )}
            >
              Prefiro usar outro número
            </button>
            <div className="embedded-signup-fallback">
              <strong>Quero migrar este mesmo número</strong>
              <p>
                Antes de continuar, faça backup do que precisar e remova este número do
                WhatsApp Business app. A Meta não permite registrar o mesmo número no
                fluxo padrão da Cloud API enquanto ele continuar ativo no aplicativo.
              </p>
            </div>
            <label className="onboarding-choice">
              <input
                type="checkbox"
                checked={impactConfirmed}
                onChange={event => setImpactConfirmed(event.target.checked)}
              />
              <span>
                <strong>Entendi a mudança deste número</strong>
                <small>
                  Sei que ele deixará de operar no WhatsApp Business app e que o histórico
                  existente do aplicativo não será migrado para a Cloud API.
                </small>
              </span>
            </label>
            <label className="onboarding-choice">
              <input
                type="checkbox"
                checked={appRemovedConfirmed}
                onChange={event => setAppRemovedConfirmed(event.target.checked)}
              />
              <span>
                <strong>O número já não está ativo no WhatsApp Business app</strong>
                <small>
                  Confirmo que concluí a remoção necessária antes de iniciar o cadastro
                  exclusivo pela Meta.
                </small>
              </span>
            </label>
          </>}
          <ApiOnlyEmbeddedSignupButton
            intent={intent}
            platformOnlyImpactConfirmed={migrationReady}
          />
        </div>
      }
    />
  )
}
