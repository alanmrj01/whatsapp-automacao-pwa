import { AlertTriangle, ArrowRight, Download, ShieldCheck } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { queryClient } from '../../app/queryClient'
import { api } from '../../lib/api'
import { useAuth } from '../auth/useAuth'
import { useConnection } from './useConnection'
import type { WhatsAppConnection } from './types'

const ANDROID_URL='https://play.google.com/store/apps/details?id=com.whatsapp.w4b'
const IOS_URL='https://apps.apple.com/app/whatsapp-business/id1386412985'

export function ApiOnlyToCoexistenceGuide(){
  const {user,membership}=useAuth()
  const connection=useConnection()
  const navigate=useNavigate()
  const [searchParams]=useSearchParams()
  const fromOnboarding=searchParams.get('from')==='onboarding'
  const [temporaryPauseConfirmed,setTemporaryPauseConfirmed]=useState(false)
  const [phoneAvailableConfirmed,setPhoneAvailableConfirmed]=useState(false)
  const [preparedLocally,setPreparedLocally]=useState(false)
  const [businessReady,setBusinessReady]=useState(false)
  const storeUrl=/iPad|iPhone|iPod/.test(navigator.userAgent)?IOS_URL:ANDROID_URL
  const queryKey=['whatsapp-connection',user?.id,membership?.business_id]
  const prepared=preparedLocally||(
    connection.data?.status==='disconnected'
    && connection.data?.preferred_mode==='coexistence'
  )

  const prepare=useMutation({
    mutationFn:()=>api.request<WhatsAppConnection>(
      '/whatsapp/mode-switch/prepare-coexistence',
      {
        method:'POST',
        body:JSON.stringify({
          confirm_temporary_interruption:temporaryPauseConfirmed,
          confirm_phone_available:phoneAvailableConfirmed,
        }),
      },
    ),
    onSuccess:async(next)=>{
      setPreparedLocally(true)
      queryClient.setQueryData(queryKey,next)
      await queryClient.invalidateQueries({queryKey,refetchType:'none'})
    },
  })

  const continueToMeta=()=>{
    const query=new URLSearchParams({auto:'1'})
    if(fromOnboarding)query.set('from','onboarding')
    navigate(`/app/whatsapp/business?${query.toString()}`,{replace:true})
  }

  return <div className="page-stack connection-info-page">
    <section className="connection-card connection-card--alovia">
      <span className="eyebrow">Mudança assistida</span>
      <h1>Usar WhatsApp Business e Alovia juntos</h1>
      <p>
        Vamos mover este número do uso exclusivo pela Alovia para o uso conjunto.
        A Alovia mantém a conexão atual até você autorizar a preparação abaixo.
      </p>
    </section>

    {!prepared&&<section className="account-note" role="alert">
      <AlertTriangle size={20} aria-hidden="true"/>
      <div>
        <strong>Haverá uma pausa temporária neste número</strong>
        <span>
          Para colocar um número que hoje está exclusivo na Cloud API de volta no
          WhatsApp Business, precisamos primeiro retirar o registro exclusivo da
          Meta. Depois disso, configure o número no WhatsApp Business e conclua
          novamente a autorização oficial. Não feche esta tela até ler os passos.
        </span>
      </div>
    </section>}

    {!prepared&&<section className="connection-card">
      <span className="eyebrow">Passo 1 de 3</span>
      <h2>Prepare a mudança</h2>
      <p>
        As conversas que já estão na Alovia continuam preservadas na Alovia.
        Elas não são copiadas automaticamente para o aplicativo WhatsApp Business.
      </p>
      <label className="whatsapp-exclusive-confirmation__check">
        <input
          type="checkbox"
          checked={temporaryPauseConfirmed}
          onChange={event=>setTemporaryPauseConfirmed(event.target.checked)}
        />
        <span>Entendi que o atendimento deste número ficará temporariamente pausado durante a mudança.</span>
      </label>
      <label className="whatsapp-exclusive-confirmation__check">
        <input
          type="checkbox"
          checked={phoneAvailableConfirmed}
          onChange={event=>setPhoneAvailableConfirmed(event.target.checked)}
        />
        <span>Estou com o celular e o número disponíveis para concluir a ativação no WhatsApp Business.</span>
      </label>
      <button
        className="primary-button"
        type="button"
        disabled={!temporaryPauseConfirmed||!phoneAvailableConfirmed||prepare.isPending}
        onClick={()=>prepare.mutate()}
      >
        <ShieldCheck size={18}/>
        {prepare.isPending?'Preparando mudança…':'Preparar mudança com segurança'}
      </button>
      {prepare.isError&&<p className="form-error" role="alert">
        Não foi possível preparar a mudança. Sua conexão atual não foi alterada. Tente novamente.
      </p>}
    </section>}

    {prepared&&<section className="connection-card">
      <span className="eyebrow">Passo 2 de 3</span>
      <h2>Ative este número no WhatsApp Business</h2>
      <p>
        Agora abra o WhatsApp Business e cadastre este mesmo número. Use a loja
        oficial abaixo se precisar instalar ou abrir o aplicativo.
      </p>
      <a className="primary-button" href={storeUrl} target="_blank" rel="noreferrer">
        <Download size={18}/>Abrir WhatsApp Business
      </a>
      <label className="whatsapp-exclusive-confirmation__check">
        <input
          type="checkbox"
          checked={businessReady}
          onChange={event=>setBusinessReady(event.target.checked)}
        />
        <span>Este número já está funcionando no WhatsApp Business.</span>
      </label>
    </section>}

    {prepared&&<section className="connection-card">
      <span className="eyebrow">Passo 3 de 3</span>
      <h2>Conecte WhatsApp Business + Alovia</h2>
      <p>
        Com o número ativo no WhatsApp Business, a próxima etapa abre a
        autorização oficial da Meta para tentar o uso conjunto.
      </p>
      <button
        className="primary-button"
        type="button"
        disabled={!businessReady}
        onClick={continueToMeta}
      >
        Continuar com a Meta<ArrowRight size={17}/>
      </button>
      <small>
        A disponibilidade do uso conjunto é confirmada pela Meta durante a autorização.
      </small>
    </section>}
  </div>
}
