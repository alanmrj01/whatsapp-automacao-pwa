import { ArrowLeft, ArrowRight, Download, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import {
  emptyWhatsAppBusinessPreparation,
  loadWhatsAppBusinessPreparation,
  saveWhatsAppBusinessPreparation,
  type WhatsAppBusinessPreparationProgress,
  type WhatsAppBusinessPreparationStep,
} from './businessPreparation'

const ANDROID_URL='https://play.google.com/store/apps/details?id=com.whatsapp.w4b'
const IOS_URL='https://apps.apple.com/app/whatsapp-business/id1386412985'

type EditableProgress=Omit<WhatsAppBusinessPreparationProgress,'updatedAt'>

export function WhatsAppBusinessSetupGuide(){
  const navigate=useNavigate()
  const [searchParams]=useSearchParams()
  const {membership}=useAuth()
  const businessId=membership?.business_id
  const fromOnboarding=searchParams.get('from')==='onboarding'
  const storeUrl=/iPad|iPhone|iPod/.test(navigator.userAgent)?IOS_URL:ANDROID_URL
  const [progress,setProgress]=useState<EditableProgress>(() => {
    const saved=loadWhatsAppBusinessPreparation(businessId)
    return saved
      ? {
          step:saved.step,
          backupConfirmed:saved.backupConfirmed,
          appReady:saved.appReady,
          businessReady:saved.businessReady,
        }
      : emptyWhatsAppBusinessPreparation()
  })

  useEffect(()=>{
    const saved=loadWhatsAppBusinessPreparation(businessId)
    if(!saved)return
    setProgress({
      step:saved.step,
      backupConfirmed:saved.backupConfirmed,
      appReady:saved.appReady,
      businessReady:saved.businessReady,
    })
  },[businessId])

  useEffect(()=>{
    saveWhatsAppBusinessPreparation(businessId,progress)
  },[businessId,progress])

  const patch=(next:Partial<EditableProgress>)=>{
    setProgress(current=>({...current,...next}))
  }

  const setStep=(step:WhatsAppBusinessPreparationStep)=>{
    patch({step})
    window.scrollTo({top:0,behavior:'smooth'})
  }

  const leaveForLater=()=>{
    saveWhatsAppBusinessPreparation(businessId,progress)
    navigate(fromOnboarding?'/app/onboarding':'/app/whatsapp',{replace:true})
  }

  const back=()=>{
    if(progress.step===1){
      navigate(fromOnboarding?'/app/onboarding':'/app/whatsapp')
      return
    }
    setStep((progress.step-1) as WhatsAppBusinessPreparationStep)
  }

  const continueToMeta=()=>{
    if(!progress.businessReady)return
    saveWhatsAppBusinessPreparation(businessId,progress)
    const query=new URLSearchParams({auto:'1'})
    if(fromOnboarding)query.set('from','onboarding')
    navigate(`/app/whatsapp/business?${query.toString()}`,{replace:true})
  }

  return <div className="page-stack connection-info-page">
    <section className="connection-card">
      <span className="eyebrow">Passo {progress.step} de 3</span>

      {progress.step===1&&<>
        <h1>Proteja suas conversas</h1>
        <p>Antes de trocar para o WhatsApp Business, faça um backup das conversas que quer manter.</p>
        <div className="whatsapp-exclusive-confirmation">
          <div className="whatsapp-exclusive-confirmation__notice">
            <strong>Como fazer</strong>
            <p>WhatsApp → Configurações → Conversas → Backup de conversas.</p>
          </div>
          <label className="whatsapp-exclusive-confirmation__check">
            <input
              type="checkbox"
              checked={progress.backupConfirmed}
              onChange={event=>patch({
                backupConfirmed:event.target.checked,
                ...(event.target.checked?{}:{appReady:false,businessReady:false}),
              })}
            />
            <span>Já fiz o backup das conversas que quero preservar.</span>
          </label>
        </div>
        <button
          className="primary-button primary-button--full"
          type="button"
          disabled={!progress.backupConfirmed}
          onClick={()=>setStep(2)}
        >
          Continuar<ArrowRight size={17}/>
        </button>
      </>}

      {progress.step===2&&<>
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
            checked={progress.appReady}
            onChange={event=>patch({
              appReady:event.target.checked,
              ...(event.target.checked?{}:{businessReady:false}),
            })}
          />
          <span>Já instalei ou abri o WhatsApp Business.</span>
        </label>
        <button
          className="primary-button primary-button--full"
          type="button"
          disabled={!progress.appReady}
          onClick={()=>setStep(3)}
        >
          Continuar<ArrowRight size={17}/>
        </button>
      </>}

      {progress.step===3&&<>
        <h1>Ative este número</h1>
        <p>Use o mesmo número no WhatsApp Business e conclua a ativação. Depois volte para a Alovia.</p>
        <div className="whatsapp-exclusive-confirmation__notice">
          <strong>Importante</strong>
          <p>O uso simultâneo com a Alovia depende da validação da Meta.</p>
        </div>
        <label className="whatsapp-exclusive-confirmation__check">
          <input
            type="checkbox"
            checked={progress.businessReady}
            onChange={event=>patch({businessReady:event.target.checked})}
          />
          <span>Este número já está funcionando no WhatsApp Business.</span>
        </label>
        <button
          className="primary-button primary-button--full"
          type="button"
          disabled={!progress.businessReady}
          onClick={continueToMeta}
        >
          <ShieldCheck size={18}/>Continuar com a Meta<ArrowRight size={17}/>
        </button>
      </>}

      <button className="compact-button" type="button" onClick={back}>
        <ArrowLeft size={16}/>{progress.step===1?'Voltar':'Etapa anterior'}
      </button>
      <button className="compact-button" type="button" onClick={leaveForLater}>
        Fazer depois
      </button>
    </section>
  </div>
}
