import { MapPin, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { RequiredLabel } from '../../components/RequiredLabel'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { lookupPostalCode, useBusiness, useUpdateBusiness } from '../operations/api'

export function CompanySettingsPage() {
  const business=useBusiness()
  const update=useUpdateBusiness()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  const data=business.data

  const [name,setName]=useState('')
  const [responsible,setResponsible]=useState('')
  const [postalCode,setPostalCode]=useState('')
  const [street,setStreet]=useState('')
  const [neighborhood,setNeighborhood]=useState('')
  const [number,setNumber]=useState('')
  const [city,setCity]=useState('')
  const [state,setState]=useState('')
  const [timezone,setTimezone]=useState('America/Sao_Paulo')
  const [validatedPostalCode,setValidatedPostalCode]=useState('')
  const [postalStatus,setPostalStatus]=useState<'idle'|'loading'|'valid'|'invalid'>('idle')
  const [postalMessage,setPostalMessage]=useState('')
  const [attempted,setAttempted]=useState(false)
  const [saved,setSaved]=useState(false)

  useEffect(()=>{
    if(!data)return
    setName(data.name)
    setResponsible(data.responsible_name??'')
    setPostalCode(data.service_origin_postal_code?formatPostalCode(data.service_origin_postal_code):'')
    setStreet(data.service_origin_street??'')
    setNeighborhood(data.service_origin_neighborhood??'')
    setNumber(data.service_origin_number??'')
    setCity(data.service_origin_city??'')
    setState(data.service_origin_state??'')
    setTimezone(data.timezone)
    if(data.service_origin_postal_code&&data.service_origin_validated_at){
      setValidatedPostalCode(data.service_origin_postal_code)
      setPostalStatus('valid')
    }
  },[data])

  if(business.isPending)return <Shell><LoadingState/></Shell>
  if(business.isError||!data)return <Shell><ErrorState onRetry={()=>void business.refetch()}/></Shell>

  const postalDigits=postalCode.replace(/\D/g,'')
  const missing={
    name:name.trim().length<2,
    responsible:responsible.trim().length<2,
    postal:postalDigits.length!==8||validatedPostalCode!==postalDigits||postalStatus!=='valid',
    street:street.trim().length<2,
    neighborhood:neighborhood.trim().length<2,
    number:number.trim().length<1,
    city:city.trim().length<2,
  }

  const resolvePostalCode=async()=>{
    const digits=postalCode.replace(/\D/g,'')
    if(digits.length!==8){
      setPostalStatus('invalid')
      setValidatedPostalCode('')
      setPostalMessage('Informe um CEP com 8 números.')
      return null
    }
    setPostalStatus('loading')
    setPostalMessage('Validando CEP…')
    try{
      const address=await lookupPostalCode(digits)
      setPostalCode(formatPostalCode(address.postal_code))
      if(address.street)setStreet(address.street)
      if(address.neighborhood)setNeighborhood(address.neighborhood)
      setCity(address.city)
      setState(address.state)
      setValidatedPostalCode(address.postal_code)
      setPostalStatus('valid')
      setPostalMessage('CEP validado. Confira o número antes de salvar.')
      return address
    }catch{
      setPostalStatus('invalid')
      setValidatedPostalCode('')
      setPostalMessage('CEP não encontrado ou indisponível para validação.')
      return null
    }
  }

  const submit=async(event:React.FormEvent)=>{
    event.preventDefault()
    if(!canEdit)return
    setSaved(false)
    setAttempted(true)

    const lookup=validatedPostalCode===postalDigits&&postalStatus==='valid'
      ? null
      : await resolvePostalCode()

    const finalPostal=lookup?.postal_code??postalDigits
    const finalStreet=(lookup?.street||street).trim()
    const finalNeighborhood=(lookup?.neighborhood||neighborhood).trim()
    const finalCity=(lookup?.city||city).trim()
    const finalState=(lookup?.state||state).trim().toUpperCase()

    if(
      name.trim().length<2||
      responsible.trim().length<2||
      finalPostal.length!==8||
      finalStreet.length<2||
      finalNeighborhood.length<2||
      !number.trim()||
      finalCity.length<2||
      finalState.length!==2
    )return

    await update.mutateAsync({
      name:name.trim(),
      responsible_name:responsible.trim(),
      service_origin_postal_code:finalPostal,
      service_origin_street:finalStreet,
      service_origin_neighborhood:finalNeighborhood,
      service_origin_number:number.trim(),
      service_origin_city:finalCity,
      service_origin_state:finalState,
      timezone,
    })
    setSaved(true)
    setAttempted(false)
  }

  return <Shell>
    <Heading/>
    <form className="settings-form" noValidate onSubmit={event=>void submit(event)}>
      <label><RequiredLabel>Nome da empresa</RequiredLabel><input className={attempted&&missing.name?'field-invalid':''} aria-invalid={attempted&&missing.name} value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/>{attempted&&missing.name&&<FieldError>Informe o nome da empresa.</FieldError>}</label>
      <label><RequiredLabel>Responsável pela empresa</RequiredLabel><input className={attempted&&missing.responsible?'field-invalid':''} aria-invalid={attempted&&missing.responsible} value={responsible} disabled={!canEdit} onChange={event=>setResponsible(event.target.value)} placeholder="Nome de quem responde pela operação"/>{attempted&&missing.responsible&&<FieldError>Informe o responsável pela empresa.</FieldError>}</label>

      <section className="company-address-settings">
        <div className="company-address-settings__heading">
          <MapPin size={19}/>
          <div><strong>Endereço da Empresa</strong><span>Endereço de saída dos técnicos</span></div>
        </div>

        <label>
          <RequiredLabel>CEP</RequiredLabel>
          <input
            inputMode="numeric"
            maxLength={9}
            className={attempted&&missing.postal?'field-invalid':''}
            aria-invalid={attempted&&missing.postal}
            value={postalCode}
            disabled={!canEdit}
            onChange={event=>{
              setPostalCode(formatPostalCode(event.target.value))
              setPostalStatus('idle')
              setValidatedPostalCode('')
              setPostalMessage('')
              setSaved(false)
            }}
            onBlur={()=>{if(canEdit)void resolvePostalCode()}}
            placeholder="00000-000"
          />
          {postalMessage&&<small className={postalStatus==='invalid'?'field-error':'settings-field-help'}>{postalMessage}</small>}
        </label>

        <div className="company-address-settings__grid">
          <label><RequiredLabel>Rua</RequiredLabel><input className={attempted&&missing.street?'field-invalid':''} aria-invalid={attempted&&missing.street} value={street} disabled={!canEdit} onChange={event=>{setStreet(event.target.value);setSaved(false)}}/>{attempted&&missing.street&&<FieldError>Informe a rua.</FieldError>}</label>
          <label><RequiredLabel>Bairro</RequiredLabel><input className={attempted&&missing.neighborhood?'field-invalid':''} aria-invalid={attempted&&missing.neighborhood} value={neighborhood} disabled={!canEdit} onChange={event=>{setNeighborhood(event.target.value);setSaved(false)}}/>{attempted&&missing.neighborhood&&<FieldError>Informe o bairro.</FieldError>}</label>
          <label><RequiredLabel>Número</RequiredLabel><input className={attempted&&missing.number?'field-invalid':''} aria-invalid={attempted&&missing.number} value={number} disabled={!canEdit} onChange={event=>{setNumber(event.target.value);setSaved(false)}} placeholder="Ex.: 160"/>{attempted&&missing.number&&<FieldError>Informe o número.</FieldError>}</label>
          <label><RequiredLabel>Cidade</RequiredLabel><input className={attempted&&missing.city?'field-invalid':''} aria-invalid={attempted&&missing.city} value={city} disabled={!canEdit} onChange={event=>{setCity(event.target.value);setSaved(false)}}/>{attempted&&missing.city&&<FieldError>Informe a cidade.</FieldError>}</label>
        </div>

        {state&&<small className="settings-field-help">UF identificada pelo CEP: <strong>{state}</strong></small>}
        <div className="settings-note settings-note--important">
          <strong>Validação do endereço</strong>
          <span>O CEP é validado antes do salvamento e rua, bairro, cidade e UF precisam permanecer coerentes com ele. O número também é obrigatório para reduzir erros no cálculo de deslocamento.</span>
        </div>
      </section>

      <label><RequiredLabel>Fuso horário</RequiredLabel><input value={timezone} readOnly aria-readonly="true" disabled={!canEdit}/></label>

      {update.isError&&<p className="form-error" role="alert">Não foi possível salvar. Revise os campos destacados e tente novamente.</p>}
      {saved&&<p className="form-success">Dados salvos.</p>}
      {canEdit&&<button className="primary-button" disabled={update.isPending||postalStatus==='loading'}><Save size={18}/>{update.isPending?'Salvando…':'Salvar dados'}</button>}
    </form>
  </Shell>
}

function FieldError({children}:{children:React.ReactNode}){return <small className="field-error" role="alert">{children}</small>}
function formatPostalCode(value:string){const digits=value.replace(/\D/g,'').slice(0,8);return digits.length>5?`${digits.slice(0,5)}-${digits.slice(5)}`:digits}

function Heading(){
  return <section className="operational-heading"><div><span className="eyebrow">Empresa</span><h1>Dados da empresa</h1></div><InfoHelp title="Dados da empresa">Informações da operação. O endereço da empresa é usado como base para o cálculo de deslocamento entre serviços.</InfoHelp></section>
}
function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
