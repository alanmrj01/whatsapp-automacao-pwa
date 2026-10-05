import { Smartphone } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiOnlyEmbeddedSignupButton } from './ApiOnlyEmbeddedSignupButton'
import { ConnectionInfoPage } from './ConnectionInfoPage'

export function ApiOnlyInfoPage() {
  const [searchParams] = useSearchParams()
  const fromCoexistence = searchParams.get('origem') === 'coexistence'
  const [impactConfirmed, setImpactConfirmed] = useState(false)
  const intent = fromCoexistence
    ? 'use_existing_number_platform_only' as const
    : 'use_new_or_dedicated_number' as const

  return (
    <ConnectionInfoPage
      mode="api_only"
      icon={Smartphone}
      title={fromCoexistence
        ? 'Usar este número exclusivamente na Alovia'
        : 'Atendimento centralizado'}
      description={fromCoexistence
        ? 'Esta alternativa migra o número para a Cloud API e concentra o atendimento na Alovia.'
        : 'O atendimento automático e o atendimento humano deste número serão feitos pela plataforma.'}
      benefits={fromCoexistence ? [
        'Use esta opção somente se o modo conjunto com o WhatsApp Business não puder ser concluído.',
        'Depois da migração, este número deixa de operar normalmente no aplicativo WhatsApp Business.',
        'Conversas e agendamentos passam a ser operados pela Alovia usando a conexão oficial da Meta.',
      ] : [
        'O número será dedicado ao atendimento da empresa.',
        'Conversas e agendamentos ficarão organizados em um só lugar.',
        'A autorização e o registro do número acontecem pela conexão oficial da Meta.',
      ]}
      callout={fromCoexistence
        ? 'Essa mudança altera a forma de uso do número. A Alovia nunca troca para o modo exclusivo sem sua confirmação.'
        : 'Use um número novo ou que você decidiu dedicar ao atendimento pela Alovia.'}
      action={
        <div className="api-only-onboarding-action">
          {fromCoexistence && <label className="onboarding-choice">
            <input
              type="checkbox"
              checked={impactConfirmed}
              onChange={event => setImpactConfirmed(event.target.checked)}
            />
            <span>
              <strong>Entendi a mudança deste número</strong>
              <small>
                Confirmo que quero deixar de usar este número no aplicativo WhatsApp Business
                e passar a utilizá-lo exclusivamente pela Alovia.
              </small>
            </span>
          </label>}
          <ApiOnlyEmbeddedSignupButton
            intent={intent}
            platformOnlyImpactConfirmed={!fromCoexistence || impactConfirmed}
          />
        </div>
      }
    />
  )
}
