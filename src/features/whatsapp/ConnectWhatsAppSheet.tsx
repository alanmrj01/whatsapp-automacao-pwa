import { ArrowRight, BriefcaseBusiness, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '../../components/BottomSheet'

type ConnectWhatsAppSheetProps = {
  open: boolean
  onClose: () => void
}

export function ConnectWhatsAppSheet({ open, onClose }: ConnectWhatsAppSheetProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState<'goal' | 'current'>('goal')

  const close = () => {
    setStep('goal')
    onClose()
  }

  const choose = (path: string) => {
    close()
    navigate(path)
  }

  return (
    <BottomSheet
      open={open}
      title={step === 'goal' ? 'Como você quer usar a Alovia com este número?' : 'Como você usa este número hoje?'}
      description={step === 'goal' ? 'Escolha como prefere acompanhar seus atendimentos.' : 'Vamos orientar você até a conexão.'}
      onClose={close}
    >
      {step === 'goal' ? (
        <>
          <button className="choice-row" type="button" onClick={() => choose('/app/whatsapp/exclusivo')}>
            <span className="choice-row__icon"><Smartphone size={23} /></span>
            <span className="choice-row__copy">
              <strong>Atender e acompanhar tudo pela Alovia</strong>
              <small>As conversas deste número ficam centralizadas na Alovia. O aplicativo WhatsApp não poderá ser usado simultaneamente com esse número.</small>
            </span>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
          <button className="choice-row" type="button" onClick={() => setStep('current')}>
            <span className="choice-row__icon"><BriefcaseBusiness size={23} /></span>
            <span className="choice-row__copy">
              <strong>Continuar usando também o WhatsApp Business</strong>
              <small>Quero acompanhar as conversas no WhatsApp Business e usar a automação da Alovia.</small>
            </span>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
        </>
      ) : (
        <>
          <button className="choice-row" type="button" onClick={() => choose('/app/whatsapp/business')}>
            <span className="choice-row__icon"><BriefcaseBusiness size={23} /></span>
            <span className="choice-row__copy">
              <strong>Já utilizo o WhatsApp Business</strong>
              <small>Continuar para a conexão oficial com a Meta.</small>
            </span>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
          <button className="choice-row" type="button" onClick={() => choose('/app/whatsapp/business?orientar=1')}>
            <span className="choice-row__icon"><Smartphone size={23} /></span>
            <span className="choice-row__copy">
              <strong>Ainda não tenho o WhatsApp Business</strong>
              <small>Receber orientação para instalar e configurar antes de conectar.</small>
            </span>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
          <button className="compact-button" type="button" onClick={() => setStep('goal')}>Voltar</button>
        </>
      )}
      <p className="sheet-footnote">A conexão só será ativada após sua confirmação e a autorização oficial da Meta.</p>
    </BottomSheet>
  )
}
