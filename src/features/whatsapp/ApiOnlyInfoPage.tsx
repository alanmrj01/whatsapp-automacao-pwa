import { AlertTriangle, Check } from 'lucide-react'
import { useState } from 'react'
import { ApiOnlyEmbeddedSignupButton } from './ApiOnlyEmbeddedSignupButton'

export function ApiOnlyInfoPage() {
  const [impactConfirmed,setImpactConfirmed]=useState(false)
  const [backupConfirmed,setBackupConfirmed]=useState(false)
  const ready=impactConfirmed&&backupConfirmed

  return <div className="page-stack connection-info-page whatsapp-exclusive-choice">
    <section className="whatsapp-exclusive-choice__intro">
      <span className="eyebrow">Forma de atendimento</span>
      <h1>Atender e acompanhar tudo pela Alovia</h1>
      <p>Seus clientes continuam falando com o mesmo número. Sua equipe acompanha as novas conversas e os agendamentos dentro da Alovia.</p>
    </section>

    <section className="whatsapp-exclusive-summary" aria-labelledby="exclusive-summary-title">
      <h2 id="exclusive-summary-title">Como funciona</h2>
      <ul>
        <li><Check size={17}/><span><strong>Seus clientes continuam usando o WhatsApp normalmente.</strong><small>O número continua sendo da sua empresa.</small></span></li>
        <li><Check size={17}/><span><strong>O atendimento fica centralizado na Alovia.</strong><small>As novas conversas são vistas e respondidas pelo app Alovia.</small></span></li>
        <li className="whatsapp-exclusive-summary__warning"><AlertTriangle size={17}/><span><strong>Este número pode deixar de funcionar no app WhatsApp ou WhatsApp Business.</strong><small>Enquanto estiver no modo exclusivo, o atendimento acontece pela Alovia.</small></span></li>
      </ul>
    </section>

    <section className="sheet-warning" role="note">
      <strong>Antes de continuar, proteja suas conversas</strong>
      <p>Se este número já é usado no WhatsApp ou WhatsApp Business, faça um backup válido antes da mudança. Sem backup, você poderá perder o histórico existente no aplicativo.</p>
    </section>

    <label className="whatsapp-exclusive-confirmation__check">
      <input type="checkbox" checked={backupConfirmed} onChange={event=>setBackupConfirmed(event.target.checked)}/>
      <span>Já fiz o backup do que preciso ou este número não possui histórico que eu precise preservar.</span>
    </label>
    <label className="whatsapp-exclusive-confirmation__check">
      <input type="checkbox" checked={impactConfirmed} onChange={event=>setImpactConfirmed(event.target.checked)}/>
      <span>Entendi que vou acompanhar este número pela Alovia e que ele pode não ficar disponível no aplicativo WhatsApp.</span>
    </label>

    <ApiOnlyEmbeddedSignupButton platformOnlyImpactConfirmed={ready}/>
  </div>
}
