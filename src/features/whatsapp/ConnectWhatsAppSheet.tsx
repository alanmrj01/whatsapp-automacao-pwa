import { ArrowRight, BriefcaseBusiness, Check, Smartphone } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { BottomSheet } from '../../components/BottomSheet'
import type { WhatsAppConnectionMode } from './types'

type ConnectWhatsAppSheetProps = {
  open: boolean
  onClose: () => void
  currentMode?: WhatsAppConnectionMode | null
}

export function ConnectWhatsAppSheet({ open, onClose, currentMode=null }: ConnectWhatsAppSheetProps) {
  const navigate = useNavigate()
  const {pathname} = useLocation()
  const [step, setStep] = useState<'goal' | 'current'>('goal')
  const fromOnboarding = pathname === '/app/onboarding'
  const changingMode = currentMode !== null

  const close = () => {
    setStep('goal')
    onClose()
  }

  const choose = (path: string, params: Record<string,string> = {}) => {
    const query = new URLSearchParams(params)
    if (fromOnboarding) query.set('from','onboarding')
    close()
    navigate(path + (query.size ? `?${query.toString()}` : ''))
  }

  const chooseExclusive = () => {
    if(currentMode==='coexistence'){
      choose('/app/whatsapp/exclusivo',{origem:'coexistence',troca:'1'})
      return
    }
    choose('/app/whatsapp/exclusivo')
  }

  const chooseCoexistence = () => {
    if(currentMode==='api_only'){
      choose('/app/whatsapp/business',{preparar:'1',troca:'1'})
      return
    }
    setStep('current')
  }

  return (
    <BottomSheet
      open={open}
      title={step === 'goal'
        ? changingMode ? 'Como você quer usar este número?' : 'Como você quer usar a Alovia com este número?'
        : 'Como você usa este número hoje?'}
      description={step === 'goal'
        ? changingMode ? 'A forma atual continua funcionando até a nova conexão ser confirmada.' : 'Escolha como prefere acompanhar seus atendimentos.'
        : 'Vamos orientar você até a conexão.'}
      onClose={close}
    >
      {step === 'goal' ? (
        <>
          <button className="choice-row" type="button" disabled={currentMode==='api_only'} onClick={chooseExclusive}>
            <span className="choice-row__icon"><Smartphone size={23} /></span>
            <span className="choice-row__copy">
              <strong>Atender e acompanhar tudo pela Alovia {currentMode==='api_only'?'(atual)':''}</strong>
              <small>As conversas deste número ficam centralizadas na Alovia. O aplicativo WhatsApp não fica disponível simultaneamente com esse número.</small>
            </span>
            {currentMode==='api_only'?<Check size={20} aria-hidden="true"/>:<ArrowRight size={20} aria-hidden="true" />}
          </button>
          <button className="choice-row" type="button" disabled={currentMode==='coexistence'} onClick={chooseCoexistence}>
            <span className="choice-row__icon"><BriefcaseBusiness size={23} /></span>
            <span className="choice-row__copy">
              <strong>Continuar usando também o WhatsApp Business {currentMode==='coexistence'?'(atual)':''}</strong>
              <small>Você acompanha as conversas no WhatsApp Business e usa a automação da Alovia em paralelo.</small>
            </span>
            {currentMode==='coexistence'?<Check size={20} aria-hidden="true"/>:<ArrowRight size={20} aria-hidden="true" />}
          </button>
        </>
      ) : (
        <>
          <button className="choice-row" type="button" onClick={() => choose('/app/whatsapp/business', {auto:'1'})}>
            <span className="choice-row__icon"><BriefcaseBusiness size={23} /></span>
            <span className="choice-row__copy">
              <strong>Já utilizo o WhatsApp Business</strong>
              <small>Continuar para a conexão oficial com a Meta.</small>
            </span>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
          <button className="choice-row" type="button" onClick={() => choose('/app/whatsapp/business', {preparar:'1'})}>
            <span className="choice-row__icon"><Smartphone size={23} /></span>
            <span className="choice-row__copy">
              <strong>Ainda não tenho o WhatsApp Business</strong>
              <small>A Alovia acompanha você para proteger as conversas, instalar o Business e conectar.</small>
            </span>
            <ArrowRight size={20} aria-hidden="true" />
          </button>
          <button className="compact-button" type="button" onClick={() => setStep('goal')}>Voltar</button>
        </>
      )}
      <p className="sheet-footnote">{changingMode
        ? 'Sua conexão atual não é desligada antes da confirmação da nova forma de uso.'
        : 'A conexão só será ativada após sua confirmação e a autorização oficial da Meta.'}</p>
    </BottomSheet>
  )
}
