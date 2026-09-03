import { BriefcaseBusiness } from 'lucide-react'
import { ConnectionInfoPage } from './ConnectionInfoPage'

export function CoexistenceInfoPage() {
  return (
    <ConnectionInfoPage
      mode="coexistence"
      icon={BriefcaseBusiness}
      title="Continue com seu WhatsApp Business"
      description="Continue usando seu WhatsApp Business normalmente enquanto a automação atende em paralelo."
      benefits={[
        'Seu aplicativo continua fazendo parte do atendimento.',
        'A automação poderá apoiar as conversas e os agendamentos.',
        'A conexão oficial será configurada em uma próxima etapa.',
      ]}
    />
  )
}
