import { AlertTriangle, ArrowLeft, ArrowRight, BriefcaseBusiness, Download, Smartphone } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '../../components/BottomSheet'
import { api } from '../../lib/api'

type ConnectWhatsAppSheetProps = {
  open: boolean
  onClose: () => void
  fromOnboarding?: boolean
}

type Step = 'usage' | 'current' | 'migration'

const ANDROID_BUSINESS_URL='https://play.google.com/store/apps/details?id=com.whatsapp.w4b'
const IOS_BUSINESS_URL='https://apps.apple.com/br/app/whatsapp-business/id1386412985'

export function ConnectWhatsAppSheet({
  open,
  onClose,
  fromOnboarding=false,
}: ConnectWhatsAppSheetProps) {
  const navigate=useNavigate()
  const [step,setStep]=useState<Step>('usage')
  const [backupConfirmed,setBackupConfirmed]=useState(false)
  const [businessReady,setBusinessReady]=useState(false)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState(false)
  const storeUrl=useMemo(
    ()=>/iPad|iPhone|iPod/i.test(navigator.userAgent)?IOS_BUSINESS_URL:ANDROID_BUSINESS_URL,
    [],
  )

  const finish=async(
    desiredMode:'coexistence'|'api_only',
    setupSource:'business_app'|'migrated_to_business'|'exclusive',
    path:string,
  )=>{
    setSaving(true)
    setError(false)
    try{
      await api.request('/whatsapp/preferences',{
        method:'POST',
        body:JSON.stringify({
          desired_mode:desiredMode,
          setup_source:setupSource,
        }),
      })
      onClose()
      const join=path.includes('?')?'&':'?'
      navigate(`${path}${join}autostart=1${fromOnboarding?'&from=onboarding':''}`)
    }catch{
      setError(true)
    }finally{
      setSaving(false)
    }
  }

  const close=()=>{
    setStep('usage')
    setBackupConfirmed(false)
    setBusinessReady(false)
    setError(false)
    onClose()
  }

  const title=step==='usage'
    ? 'Como você quer usar a Alovia com este número?'
    : step==='current'
      ? 'Como você usa este número hoje?'
      : 'Prepare o WhatsApp Business'

  const description=step==='usage'
    ? 'Escolha como sua equipe prefere acompanhar as conversas. Você poderá alterar essa opção depois.'
    : step==='current'
      ? 'Isso define o caminho mais rápido para colocar a automação para funcionar.'
      : 'São poucos passos. A Alovia acompanha você até a conexão com a Meta.'

  return <BottomSheet open={open} title={title} description={description} onClose={close}>
    {step==='usage'&&<>
      <button className="choice-row" type="button" disabled={saving} onClick={()=>void finish('api_only','exclusive','/app/whatsapp/exclusivo')}>
        <span className="choice-row__icon"><Smartphone size={23}/></span>
        <span className="choice-row__copy">
          <strong>Atender e acompanhar tudo pela Alovia</strong>
          <small>As novas conversas e os agendamentos ficam centralizados no app Alovia.</small>
        </span>
        <ArrowRight size={20}/>
      </button>
      <button className="choice-row" type="button" disabled={saving} onClick={()=>setStep('current')}>
        <span className="choice-row__icon"><BriefcaseBusiness size={23}/></span>
        <span className="choice-row__copy">
          <strong>Usar a Alovia e o WhatsApp Business juntos</strong>
          <small>Continue acompanhando o número no WhatsApp Business enquanto a Alovia trabalha em paralelo.</small>
        </span>
        <ArrowRight size={20}/>
      </button>
    </>}

    {step==='current'&&<>
      <button className="choice-row" type="button" disabled={saving} onClick={()=>void finish('coexistence','business_app','/app/whatsapp/business')}>
        <span className="choice-row__icon"><BriefcaseBusiness size={23}/></span>
        <span className="choice-row__copy">
          <strong>Já uso este número no WhatsApp Business</strong>
          <small>Ótimo. Vamos direto para a autorização oficial da Meta.</small>
        </span>
        <ArrowRight size={20}/>
      </button>
      <button className="choice-row" type="button" disabled={saving} onClick={()=>setStep('migration')}>
        <span className="choice-row__icon"><Download size={23}/></span>
        <span className="choice-row__copy">
          <strong>Uso o WhatsApp comum ou ainda não tenho o Business</strong>
          <small>A Alovia mostra como fazer a mudança e depois continua a conexão.</small>
        </span>
        <ArrowRight size={20}/>
      </button>
      <button className="sheet-back-button" type="button" onClick={()=>setStep('usage')}><ArrowLeft size={17}/>Voltar</button>
    </>}

    {step==='migration'&&<>
      <section className="sheet-warning" role="note">
        <AlertTriangle size={20}/>
        <div>
          <strong>Faça o backup antes de mudar</strong>
          <p>Antes de passar este número do WhatsApp comum para o WhatsApp Business, faça um backup válido das suas conversas. Sem backup, você poderá perder o histórico existente.</p>
        </div>
      </section>
      <ol className="assisted-setup-list">
        <li><strong>1. Faça o backup</strong><span>No WhatsApp atual, confirme que o backup terminou antes de seguir.</span></li>
        <li><strong>2. Instale ou abra o WhatsApp Business</strong><span>Use a loja oficial do seu celular e configure este mesmo número.</span></li>
        <li><strong>3. Restaure o histórico quando o WhatsApp Business oferecer essa opção</strong><span>Depois, volte para a Alovia. Nós continuamos daqui.</span></li>
      </ol>
      <a className="primary-button assisted-store-button" href={storeUrl} target="_blank" rel="noreferrer">
        <Download size={18}/>Instalar ou abrir WhatsApp Business
      </a>
      <label className="whatsapp-exclusive-confirmation__check">
        <input type="checkbox" checked={backupConfirmed} onChange={event=>setBackupConfirmed(event.target.checked)}/>
        <span>Já fiz o backup do que preciso.</span>
      </label>
      <label className="whatsapp-exclusive-confirmation__check">
        <input type="checkbox" checked={businessReady} onChange={event=>setBusinessReady(event.target.checked)}/>
        <span>Já configurei este número no WhatsApp Business e estou pronto para continuar.</span>
      </label>
      <button
        className="primary-button"
        type="button"
        disabled={!backupConfirmed||!businessReady||saving}
        onClick={()=>void finish('coexistence','migrated_to_business','/app/whatsapp/business')}
      >
        {saving?'Preparando…':'Continuar conexão'}<ArrowRight size={18}/>
      </button>
      <button className="sheet-back-button" type="button" onClick={()=>setStep('current')}><ArrowLeft size={17}/>Voltar</button>
    </>}

    {error&&<p className="form-error" role="alert">Não foi possível salvar essa escolha. Confira sua conexão com a internet e tente novamente.</p>}
    <p className="sheet-footnote">A autorização do número acontece diretamente com a Meta. A Alovia não pede sua senha do WhatsApp.</p>
  </BottomSheet>
}
