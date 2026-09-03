import { ArrowRight, Cable, LockKeyhole, MessageCircleMore } from 'lucide-react'
import { useState } from 'react'
import { PrimaryButton } from '../../components/PrimaryButton'
import { mockWhatsAppConnection } from '../../lib/mocks'
import { ConnectWhatsAppSheet } from './ConnectWhatsAppSheet'
import { ConnectionStatusBadge } from './ConnectionStatusBadge'

export function WhatsAppPage() {
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  return (
    <div className="page-stack whatsapp-page">
      <section className="connection-card">
        <div className="connection-card__illustration" aria-hidden="true">
          <MessageCircleMore size={34} />
          <span className="connection-card__indicator" />
        </div>
        <span className="eyebrow">Canal de atendimento</span>
        <h1>WhatsApp</h1>
        <ConnectionStatusBadge status={mockWhatsAppConnection.status} />
        <p>
          Conecte seu número para ativar automação de atendimento e agendamentos.
        </p>
        <PrimaryButton
          fullWidth
          icon={<ArrowRight size={19} />}
          onClick={() => setIsSheetOpen(true)}
        >
          Conectar WhatsApp
        </PrimaryButton>
      </section>

      <section className="security-note">
        <span><LockKeyhole size={19} /></span>
        <div>
          <strong>Conexão segura</strong>
          <p>A conexão oficial será disponibilizada após a configuração do serviço.</p>
        </div>
      </section>

      <section className="feature-note">
        <Cable size={20} />
        <p>Nenhum dado será enviado à Meta nesta demonstração.</p>
      </section>

      <ConnectWhatsAppSheet open={isSheetOpen} onClose={() => setIsSheetOpen(false)} />
    </div>
  )
}
