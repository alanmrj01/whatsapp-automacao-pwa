import { ArrowRight, BriefcaseBusiness, Smartphone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '../../components/BottomSheet'

type ConnectWhatsAppSheetProps = {
  open: boolean
  onClose: () => void
  source?: 'onboarding' | 'app'
}

export function ConnectWhatsAppSheet({
  open,
  onClose,
  source = 'app',
}: ConnectWhatsAppSheetProps) {
  const navigate = useNavigate()

  const choose = (path: string) => {
    onClose()
    const suffix = source === 'onboarding' ? '?from=onboarding' : ''
    navigate(path + suffix)
  }

  return (
    <BottomSheet
      open={open}
      title="Como você quer usar este número?"
      description="Escolha onde você quer atender as conversas."
      onClose={onClose}
    >
      <button className="choice-row" type="button" onClick={() => choose('/app/whatsapp/business')}>
        <span className="choice-row__icon"><BriefcaseBusiness size={23} /></span>
        <span className="choice-row__copy">
          <strong>Continuar usando o WhatsApp Business</strong>
          <small>O número continua no aplicativo e também funciona com a Alovia.</small>
        </span>
        <ArrowRight size={20} aria-hidden="true" />
      </button>
      <button className="choice-row" type="button" onClick={() => choose('/app/whatsapp/exclusivo')}>
        <span className="choice-row__icon"><Smartphone size={23} /></span>
        <span className="choice-row__copy">
          <strong>Usar este número somente na Alovia</strong>
          <small>As conversas serão vistas e respondidas dentro da Alovia.</small>
        </span>
        <ArrowRight size={20} aria-hidden="true" />
      </button>
      <p className="sheet-footnote">Você verá exatamente o que muda antes de confirmar.</p>
    </BottomSheet>
  )
}
