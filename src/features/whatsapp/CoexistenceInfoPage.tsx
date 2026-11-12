import { BriefcaseBusiness } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ConnectionInfoPage } from './ConnectionInfoPage'
import { EmbeddedSignupButton } from './EmbeddedSignupButton'
import { WhatsAppBusinessSetupGuide } from './WhatsAppBusinessSetupGuide'
import { ApiOnlyToCoexistenceGuide } from './ApiOnlyToCoexistenceGuide'

export function CoexistenceInfoPage() {
  const [searchParams]=useSearchParams()
  const changingMode=searchParams.get('troca')==='1'
  if(searchParams.get('preparar')==='1')return <WhatsAppBusinessSetupGuide/>
  if(changingMode)return <ApiOnlyToCoexistenceGuide/>

  return (
    <ConnectionInfoPage
      mode="coexistence"
      icon={BriefcaseBusiness}
      title="Conecte seu WhatsApp à Alovia"
      description={changingMode
        ? 'Sua conexão atual continua funcionando enquanto você autoriza o uso conjunto com o WhatsApp Business.'
        : 'A autorização é feita pela Meta. Você continua usando o WhatsApp Business enquanto a Alovia fica pronta para atender em paralelo.'}
      benefits={[
        'Você continua usando o WhatsApp Business normalmente.',
        'A automação só entra em operação depois da autorização da Meta e da ativação do plano.',
      ]}
      callout={changingMode
        ? 'Nada é desligado antes da confirmação. A mudança só acontece depois que a Meta concluir a nova autorização.'
        : 'Para continuar, autorize a conexão na Meta. A Alovia não solicita sua senha do WhatsApp.'}
      action={<EmbeddedSignupButton autoStart={searchParams.get('auto')==='1'} />}
    />
  )
}
