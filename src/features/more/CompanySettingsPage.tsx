import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { RequiredLabel } from '../../components/RequiredLabel'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { useBusiness, useUpdateBusiness } from '../operations/api'

export function CompanySettingsPage() {
  const business=useBusiness()
  const update=useUpdateBusiness()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  const data=business.data
  const [name,setName]=useState('')
  const [responsible,setResponsible]=useState('')
  const [address,setAddress]=useState('')
  const [timezone,setTimezone]=useState('')
  const [saved,setSaved]=useState(false)

  useEffect(()=>{
    if(!data)return
    setName(data.name)
    setResponsible(data.responsible_name??'')
    setAddress(data.service_origin_address??'')
    setTimezone(data.timezone)
  },[data])

  if(business.isPending)return <Shell><LoadingState/></Shell>
  if(business.isError||!data)return <Shell><ErrorState onRetry={()=>void business.refetch()}/></Shell>

  return <Shell>
    <Heading/>
    <form className="settings-form" onSubmit={event=>{
      event.preventDefault()
      setSaved(false)
      update.mutate({
        name,
        responsible_name:responsible.trim()||null,
        service_origin_address:address.trim()||null,
        timezone,
      },{onSuccess:()=>setSaved(true)})
    }}>
      <label><RequiredLabel>Nome da empresa</RequiredLabel><input required minLength={2} maxLength={255} value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/></label>
      <label><RequiredLabel>Responsável pela empresa</RequiredLabel><input required minLength={2} maxLength={255} value={responsible} disabled={!canEdit} onChange={event=>setResponsible(event.target.value)} placeholder="Nome de quem responde pela operação"/></label>
      <label><RequiredLabel>Endereço de saída para o primeiro atendimento</RequiredLabel><input required minLength={5} maxLength={500} value={address} disabled={!canEdit} onChange={event=>setAddress(event.target.value)} placeholder="Rua, número, bairro, cidade - UF"/><small className="settings-field-help">Pode ser a empresa, oficina ou residência de onde o técnico normalmente inicia o dia.</small></label>
      <label><RequiredLabel>Fuso horário</RequiredLabel><input required value={timezone} disabled={!canEdit} onChange={event=>setTimezone(event.target.value)}/></label>
      {update.isError&&<p className="form-error" role="alert">Não foi possível salvar. Tente novamente.</p>}
      {saved&&<p className="form-success">Dados salvos.</p>}
      {canEdit&&<button className="primary-button" disabled={update.isPending}><Save size={18}/>{update.isPending?'Salvando…':'Salvar dados'}</button>}
    </form>
  </Shell>
}

function Heading(){
  return <section className="operational-heading"><div><span className="eyebrow">Empresa</span><h1>Dados da empresa</h1></div><InfoHelp title="Dados da empresa">Informações da operação. O endereço serve como origem do primeiro deslocamento do dia.</InfoHelp></section>
}
function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
