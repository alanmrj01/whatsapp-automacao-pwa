import { BriefcaseBusiness } from 'lucide-react'
import { ConnectionInfoPage } from './ConnectionInfoPage'
import { EmbeddedSignupButton } from './EmbeddedSignupButton'

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
        'A Meta valida sua autorização antes de a conexão ser ativada.',
      ]}
      callout="A autorização acontece diretamente na Meta. A Alovia não recebe sua senha e não expõe credenciais no navegador."
      action={<EmbeddedSignupButton />}
    />
  )
}
