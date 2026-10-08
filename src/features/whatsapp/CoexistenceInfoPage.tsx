import { BriefcaseBusiness } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ConnectionInfoPage } from './ConnectionInfoPage'
import { EmbeddedSignupButton } from './EmbeddedSignupButton'
import { WhatsAppBusinessSetupGuide } from './WhatsAppBusinessSetupGuide'

export function CoexistenceInfoPage() {
  const [searchParams]=useSearchParams()
  if(searchParams.get('preparar')==='1')return <WhatsAppBusinessSetupGuide/>

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
      action={<EmbeddedSignupButton autoStart={searchParams.get('auto')==='1'} />}
    />
  )
}
