import { Check, Info, MessageCircleMore, ShieldCheck, Smartphone } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { StatusBadge } from '../../components/StatusBadge'
import type { WhatsAppConnectionMode } from './types'
import { OnboardingPlanStatus } from './OnboardingPlanStatus'
import { connectionModeLabels } from './connectionPresentation'

type ConnectionInfoPageProps = {
  mode: WhatsAppConnectionMode
  icon: LucideIcon
  title: string
  description: string
  benefits: string[]
}

export function ConnectionInfoPage({
  mode,
  icon: Icon,
  title,
  description,
  benefits,
}: ConnectionInfoPageProps) {
  return (
    <div className="page-stack connection-info-page">
      <section className="connection-info-hero">
        <span className="connection-info-hero__icon"><Icon size={29} /></span>
        <StatusBadge tone="info" withDot={false}>{connectionModeLabels[mode]}</StatusBadge>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>

      <section className="benefits-card">
        <h2>Como vai funcionar</h2>
        <ul>
          {benefits.map((benefit) => (
            <li key={benefit}>
              <span><Check size={17} /></span>
              {benefit}
            </li>
          ))}
        </ul>
      </section>

      <section className="informative-callout">
        <Info size={19} />
        <p>Esta tela apenas prepara o fluxo. Nenhuma conexão será realizada agora.</p>
      </section>

      <PrimaryButton fullWidth disabled icon={<ShieldCheck size={18} />}>
        Conexão pela Meta será habilitada após configuração
      </PrimaryButton>
      <OnboardingPlanStatus mode={mode} />
      <div className="connection-mode-symbols" aria-hidden="true">
        <MessageCircleMore size={19} />
        <span />
        <Smartphone size={19} />
      </div>
    </div>
  )
}
