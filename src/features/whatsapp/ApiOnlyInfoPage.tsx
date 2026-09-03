import { Smartphone } from 'lucide-react'
import { ConnectionInfoPage } from './ConnectionInfoPage'

export function ApiOnlyInfoPage() {
  return (
    <ConnectionInfoPage
      mode="api_only"
      icon={Smartphone}
      title="Atendimento centralizado"
      description="O atendimento automático e o atendimento humano deste número serão feitos pela plataforma."
      benefits={[
        'O número será dedicado ao atendimento da empresa.',
        'Conversas e agendamentos ficarão organizados em um só lugar.',
        'A conexão oficial será configurada em uma próxima etapa.',
      ]}
    />
  )
}
