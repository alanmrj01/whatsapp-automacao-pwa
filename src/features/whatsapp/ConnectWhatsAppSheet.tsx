import { ArrowRight, BriefcaseBusiness, Smartphone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '../../components/BottomSheet'

type ConnectWhatsAppSheetProps = {
  open: boolean
  onClose: () => void
}

export function ConnectWhatsAppSheet({ open, onClose }: ConnectWhatsAppSheetProps) {
  const navigate = useNavigate()

  const choose = (path: string) => {
    onClose()
    navigate(path)
  }

  return (
    <BottomSheet
      open={open}
      title="Como você utiliza este número?"
      description="Escolha a opção que combina com o seu atendimento."
      onClose={onClose}
    >
      <button className="choice-row" type="button" onClick={() => choose('/app/whatsapp/business')}>
        <span className="choice-row__icon"><BriefcaseBusiness size={23} /></span>
        <span className="choice-row__copy">
          <strong>Já uso este número no WhatsApp Business</strong>
          <small>Continuar usando WhatsApp Business junto com a automação.</small>
        </span>
        <ArrowRight size={20} aria-hidden="true" />
      </button>
      <button className="choice-row" type="button" onClick={() => choose('/app/whatsapp/exclusivo')}>
        <span className="choice-row__icon"><Smartphone size={23} /></span>
        <span className="choice-row__copy">
          <strong>É um número novo ou exclusivo para automação</strong>
          <small>Usar o número diretamente pela plataforma.</small>
        </span>
        <ArrowRight size={20} aria-hidden="true" />
      </button>
      <p className="sheet-footnote">Nenhuma conexão será feita nesta etapa.</p>
    </BottomSheet>
  )
}
