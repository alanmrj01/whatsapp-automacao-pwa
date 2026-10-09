import { ArrowLeft, ArrowRight, Download, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const ANDROID_URL='https://play.google.com/store/apps/details?id=com.whatsapp.w4b'
const IOS_URL='https://apps.apple.com/app/whatsapp-business/id1386412985'

type Step=1|2|3

function parseStep(value:string|null):Step{
  return value==='2'?2:value==='3'?3:1
}

export function WhatsAppBusinessSetupGuide(){
  const navigate=useNavigate()
  const [searchParams]=useSearchParams()
  const fromOnboarding=searchParams.get('from')==='onboarding'
  const step=parseStep(searchParams.get('passo'))
  const [backupConfirmed,setBackupConfirmed]=useState(false)
  const [appReady,setAppReady]=useState(false)
  const [businessReady,setBusinessReady]=useState(false)
  const storeUrl=/iPad|iPhone|iPod/.test(navigator.userAgent)?IOS_URL:ANDROID_URL

  const goToStep=(next:Step)=>{
    const query=new URLSearchParams({preparar:'1',passo:String(next)})
    if(fromOnboarding)query.set('from','onboarding')
    navigate(`/app/whatsapp/business?${query.toString()}`,{replace:true})
    window.scrollTo({top:0,behavior:'smooth'})
  }

  const leaveForLater=()=>{
    const query=new URLSearchParams({preparacao:String(step)})
    navigate(
      fromOnboarding
        ? '/app/onboarding'
        : `/app/whatsapp?${query.toString()}`,
      {replace:true},
    )
  }

  const back=()=>{
    if(step===1){
      navigate(fromOnboarding?'/app/onboarding':'/app/whatsapp')
      return
    }
    goToStep((step-1) as Step)
  }

  const continueToMeta=()=>{
    if(!businessReady)return
    const query=new URLSearchParams({auto:'1'})
    if(fromOnboarding)query.set('from','onboarding')
    navigate(`/app/whatsapp/business?${query.toString()}`,{replace:true})
  }

  return <div className="page-stack connection-info-page">
    <section className="connection-card">
      <span className="eyebrow">Passo {step} de 3</span>

      {step===1&&<>
        <h1>Proteja suas conversas</h1>
        <p>Antes de trocar para o WhatsApp Business, faça um backup das conversas que quer manter.</p>
        <div className="whatsapp-exclusive-confirmation">
          <div className="whatsapp-exclusive-confirmation__notice">
            <strong>Como fazer</strong>
            <p>WhatsApp → Configurações → Conversas → Backup de conversas.</p>
          </div>
          <div className="whatsapp-exclusive-confirmation__notice">
            <strong>Importante</strong>
            <p>Sem um backup válido, mensagens antigas podem ser perdidas durante a mudança.</p>
          </div>
          <label className="whatsapp-exclusive-confirmation__check">
            <input
              type="checkbox"
              checked={backupConfirmed}
              onChange={event=>setBackupConfirmed(event.target.checked)}
            />
            <span>Já fiz o backup das conversas que quero preservar.</span>
          </label>
        </div>
        <button
          className="primary-button primary-button--full"
          type="button"
          disabled={!backupConfirmed}
          onClick={()=>goToStep(2)}
        >
          Continuar<ArrowRight size={17}/>
        </button>
      </>}

      {step===2&&<>
        <h1>Abra o WhatsApp Business</h1>
        <p>Se ainda não tiver o aplicativo, instale pela loja oficial. Se já tiver, apenas abra.</p>
        <a
          className="primary-button primary-button--full"
          href={storeUrl}
          target="_blank"
          rel="noreferrer"
        >
          <Download size={18}/>Abrir WhatsApp Business
        </a>
        <label className="whatsapp-exclusive-confirmation__check">
          <input
            type="checkbox"
            checked={appReady}
            onChange={event=>setAppReady(event.target.checked)}
          />
          <span>Já instalei ou abri o WhatsApp Business.</span>
        </label>
        <button
          className="primary-button primary-button--full"
          type="button"
          disabled={!appReady}
          onClick={()=>goToStep(3)}
        >
          Continuar<ArrowRight size={17}/>
        </button>
      </>}

      {step===3&&<>
        <h1>Ative este número</h1>
        <p>Use o mesmo número no WhatsApp Business e conclua a ativação. Depois volte para a Alovia.</p>
        <div className="whatsapp-exclusive-confirmation__notice">
          <strong>Importante</strong>
          <p>O uso simultâneo com a Alovia depende da validação da Meta.</p>
        </div>
        <label className="whatsapp-exclusive-confirmation__check">
          <input
            type="checkbox"
            checked={businessReady}
            onChange={event=>setBusinessReady(event.target.checked)}
          />
          <span>Este número já está funcionando no WhatsApp Business.</span>
        </label>
        <button
          className="primary-button primary-button--full"
          type="button"
          disabled={!businessReady}
          onClick={continueToMeta}
        >
          <ShieldCheck size={18}/>Continuar com a Meta<ArrowRight size={17}/>
        </button>
      </>}

      <button className="compact-button" type="button" onClick={back}>
        <ArrowLeft size={16}/>{step===1?'Voltar':'Etapa anterior'}
      </button>
      <button className="compact-button" type="button" onClick={leaveForLater}>
        Fazer depois
      </button>
    </section>
  </div>
}
