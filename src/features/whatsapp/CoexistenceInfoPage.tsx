import { BriefcaseBusiness } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ConnectionInfoPage } from './ConnectionInfoPage'
import { EmbeddedSignupButton } from './EmbeddedSignupButton'
import { WhatsAppBusinessSetupGuide } from './WhatsAppBusinessSetupGuide'

export function CoexistenceInfoPage() {
  const [searchParams]=useSearchParams()
  const changingMode=searchParams.get('troca')==='1'
  if(searchParams.get('preparar')==='1')return <WhatsAppBusinessSetupGuide/>

  return (
    <ConnectionInfoPage
      mode="coexistence"
      icon={BriefcaseBusiness}
      title="Continue com seu WhatsApp Business"
      description={changingMode
        ? 'Sua conexão atual pela Alovia continua funcionando enquanto você autoriza o uso conjunto com o WhatsApp Business.'
        : 'Continue usando seu WhatsApp Business normalmente enquanto a automação atende em paralelo.'}
      benefits={[
        'Seu aplicativo continua fazendo parte do atendimento.',
        'A automação poderá apoiar as conversas e os agendamentos.',
        'A Meta valida sua autorização antes de a conexão ser ativada.',
      ]}
      callout={changingMode
        ? 'Nada é desligado antes da confirmação. A mudança só é aplicada depois que a Meta concluir a nova autorização.'
        : 'A autorização acontece diretamente na Meta. A Alovia não recebe sua senha e não expõe credenciais no navegador.'}
      action={<EmbeddedSignupButton autoStart={searchParams.get('auto')==='1'} />}
    />
  )
}
