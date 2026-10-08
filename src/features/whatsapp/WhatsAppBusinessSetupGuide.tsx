import { AlertTriangle, ArrowRight, CheckCircle2, Download, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

const ANDROID_URL='https://play.google.com/store/apps/details?id=com.whatsapp.w4b'
const IOS_URL='https://apps.apple.com/app/whatsapp-business/id1386412985'

export function WhatsAppBusinessSetupGuide(){
  const navigate=useNavigate()
  const [searchParams]=useSearchParams()
  const [backupConfirmed,setBackupConfirmed]=useState(false)
  const [businessReady,setBusinessReady]=useState(false)
  const [storeOpened,setStoreOpened]=useState(false)
  const fromOnboarding=searchParams.get('from')==='onboarding'
  const storeUrl=/iPad|iPhone|iPod/.test(navigator.userAgent)?IOS_URL:ANDROID_URL

  const continueToMeta=()=>{
    const query=new URLSearchParams({auto:'1'})
    if(fromOnboarding)query.set('from','onboarding')
    navigate(`/app/whatsapp/business?${query.toString()}`,{replace:true})
  }

  return <div className="page-stack connection-info-page">
    <section className="connection-card connection-card--alovia">
      <span className="eyebrow">Preparação rápida</span>
      <h1>Vamos deixar seu número pronto para a Alovia</h1>
      <p>Não ter o WhatsApp Business ainda não impede você de começar. Siga estes passos e depois continuamos a conexão pela Meta.</p>
    </section>

    <section className="account-note" role="alert">
      <AlertTriangle size={20} aria-hidden="true"/>
      <div>
        <strong>Primeiro, proteja suas conversas</strong>
        <span>Antes de trocar o WhatsApp comum pelo WhatsApp Business, faça um backup das conversas que deseja preservar. Sem um backup válido, mensagens antigas podem ser perdidas durante a mudança.</span>
      </div>
    </section>

    <section className="connection-card">
      <span className="eyebrow">Passo 1 de 3</span>
      <h2>Faça o backup no WhatsApp atual</h2>
      <p>No WhatsApp, abra Configurações → Conversas → Backup de conversas e confirme que o backup terminou.</p>
      <label className="whatsapp-exclusive-confirmation__check">
        <input type="checkbox" checked={backupConfirmed} onChange={event=>setBackupConfirmed(event.target.checked)}/>
        <span>Já fiz o backup das conversas que preciso preservar.</span>
      </label>
    </section>

    <section className="connection-card">
      <span className="eyebrow">Passo 2 de 3</span>
      <h2>Instale ou abra o WhatsApp Business</h2>
      <p>Use a loja oficial do seu celular. Se o WhatsApp Business já estiver instalado, a loja mostrará a opção de abrir o aplicativo.</p>
      <a className="primary-button" href={storeUrl} target="_blank" rel="noreferrer" aria-disabled={!backupConfirmed} onClick={event=>{if(!backupConfirmed)event.preventDefault();else setStoreOpened(true)}}>
        <Download size={18}/>Abrir WhatsApp Business
      </a>
      {!backupConfirmed&&<small>Confirme o backup antes de continuar.</small>}
      {storeOpened&&<p role="status">Após configurar seu número no WhatsApp Business, volte a esta tela da Alovia.</p>}
    </section>

    <section className="connection-card">
      <span className="eyebrow">Passo 3 de 3</span>
      <h2>Configure este número no WhatsApp Business</h2>
      <p>Abra o WhatsApp Business e conclua a ativação deste mesmo número. Quando ele estiver funcionando no Business, volte para a Alovia. A disponibilidade do uso simultâneo depende de uma validação da Meta; instalar o aplicativo não garante aprovação.</p>
      <label className="whatsapp-exclusive-confirmation__check">
        <input type="checkbox" disabled={!backupConfirmed} checked={businessReady} onChange={event=>setBusinessReady(event.target.checked)}/>
        <span>Este número já está funcionando no WhatsApp Business.</span>
      </label>
      <button className="primary-button" type="button" disabled={!backupConfirmed||!businessReady} onClick={continueToMeta}>
        <ShieldCheck size={18}/>Continuar conexão com a Meta<ArrowRight size={17}/>
      </button>
      {businessReady&&<p className="form-success"><CheckCircle2 size={17}/>Tudo pronto. A próxima etapa é a autorização oficial da Meta.</p>}
    </section>
  </div>
}
