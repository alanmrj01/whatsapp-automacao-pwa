import { Check } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ApiOnlyEmbeddedSignupButton } from './ApiOnlyEmbeddedSignupButton'

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
    <div className="page-stack connection-info-page whatsapp-exclusive-choice">
      <section className="whatsapp-exclusive-choice__intro">
        <span className="eyebrow">Forma de atendimento</span>
        <h1>Usar este número exclusivamente na Alovia</h1>
        <p>
          Seus clientes continuam falando com este número pelo WhatsApp.
          O que muda é onde sua equipe atende.
        </p>
      </section>

      <section className="whatsapp-exclusive-summary" aria-labelledby="exclusive-summary-title">
        <h2 id="exclusive-summary-title">O que muda no dia a dia</h2>
        <ul>
          <li>
            <Check size={17} aria-hidden="true" />
            <span>
              <strong>Seus clientes continuam usando o mesmo número.</strong>
              <small>Eles enviam mensagens pelo WhatsApp normalmente.</small>
            </span>
          </li>
          <li className="whatsapp-exclusive-summary__warning">
            <Check size={17} aria-hidden="true" />
            <span>
              <strong>Você atende dentro da Alovia.</strong>
              <small>As novas conversas são vistas e respondidas pela Alovia.</small>
            </span>
          </li>
          <li className="whatsapp-exclusive-summary__warning">
            <Check size={17} aria-hidden="true" />
            <span>
              <strong>Esse número não fica disponível no app WhatsApp Business.</strong>
              <small>Enquanto estiver conectado dessa forma, o atendimento desse número acontece pela Alovia.</small>
            </span>
          </li>
        </ul>
        <p className="whatsapp-exclusive-summary__ownership">
          <strong>O número continua sendo da sua empresa.</strong> A Alovia conecta este número à automação e centraliza o atendimento.
        </p>
      </section>

      {fromCoexistence && (
        <section className="whatsapp-exclusive-confirmation">
          <button
            className="compact-button"
            type="button"
            onClick={() => navigate(
              '/app/whatsapp/exclusivo' + (fromOnboarding ? '?from=onboarding' : ''),
            )}
          >
            Quero usar outro número
          </button>

          <div className="whatsapp-exclusive-confirmation__notice">
            <strong>Antes de usar este mesmo número</strong>
            <p>
              Faça backup do que precisar e retire este número do app WhatsApp Business.
              As conversas antigas do aplicativo não são transferidas para a Alovia.
            </p>
          </div>

          <label className="whatsapp-exclusive-confirmation__check">
            <input
              type="checkbox"
              checked={impactConfirmed}
              onChange={event => setImpactConfirmed(event.target.checked)}
            />
            <span>
              Entendi que vou atender este número pela Alovia, e não pelo app WhatsApp Business.
            </span>
          </label>

          <label className="whatsapp-exclusive-confirmation__check">
            <input
              type="checkbox"
              checked={appRemovedConfirmed}
              onChange={event => setAppRemovedConfirmed(event.target.checked)}
            />
            <span>Já retirei este número do app WhatsApp Business.</span>
          </label>
        </section>
      )}

      <ApiOnlyEmbeddedSignupButton
        intent={intent}
        platformOnlyImpactConfirmed={migrationReady}
      />
    </div>
  )
}
