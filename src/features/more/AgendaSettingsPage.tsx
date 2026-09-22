import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { useBusiness, useUpdateBusiness } from '../operations/api'

export function AgendaSettingsPage(){
  const business=useBusiness()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  if(business.isPending)return <Shell><LoadingState/></Shell>
  if(business.isError||!business.data)return <Shell><ErrorState onRetry={()=>void business.refetch()}/></Shell>
  return <Shell>
    <section className="operational-heading"><div><span className="eyebrow">Agenda</span><h1>Agenda e disponibilidade</h1></div><InfoHelp title="Agenda e disponibilidade">Deixe um campo vazio para o ALOVIA decidir automaticamente de acordo com o serviço e a logística. O deslocamento é calculado separadamente.</InfoHelp></section>
    <AgendaForm business={business.data} canEdit={canEdit}/>
  </Shell>
}

function AgendaForm({business,canEdit}:{business:import('../operations/types').Business;canEdit:boolean}){
  const update=useUpdateBusiness()
  const [interval,setInterval]=useState('')
  const [preparation,setPreparation]=useState('')
  const [finishing,setFinishing]=useState('')
  const [notice,setNotice]=useState('')
  const [saved,setSaved]=useState(false)

  useEffect(()=>{
    setInterval(business.interval_between_services_minutes==null?'':String(business.interval_between_services_minutes))
    setPreparation(business.preparation_minutes==null?'':String(business.preparation_minutes))
    setFinishing(business.finishing_minutes==null?'':String(business.finishing_minutes))
    setNotice(business.minimum_booking_notice_minutes==null?'':String(business.minimum_booking_notice_minutes))
  },[business])

  const optionalNumber=(value:string)=>value.trim()===''?null:Number(value)
  return <form className="settings-form" onSubmit={event=>{
    event.preventDefault()
    setSaved(false)
    update.mutate({
      interval_between_services_minutes:optionalNumber(interval),
      preparation_minutes:optionalNumber(preparation),
      finishing_minutes:optionalNumber(finishing),
      minimum_booking_notice_minutes:optionalNumber(notice),
      agenda_preferences_reviewed:true,
    },{onSuccess:()=>setSaved(true)})
  }}>
    <AutoField label="Intervalo entre um serviço e outro" value={interval} setValue={setInterval} disabled={!canEdit} max={240} help="Tempo operacional livre entre atendimentos, sem contar deslocamento."/>
    <AutoField label="Tempo de preparação" value={preparation} setValue={setPreparation} disabled={!canEdit} max={240} help="Tempo para organizar ferramentas e logística antes de começar."/>
    <AutoField label="Tempo após finalizar o serviço" value={finishing} setValue={setFinishing} disabled={!canEdit} max={240} help="Tempo para finalizar o atendimento e guardar ferramentas."/>
    <AutoField label="Antecedência mínima para um novo agendamento" value={notice} setValue={setNotice} disabled={!canEdit} max={10080} help="Tempo mínimo entre o pedido do cliente e o início do atendimento."/>
    <p className="settings-note">Em modo automático, os tempos de preparação, finalização e intervalo são decididos pelo ALOVIA e limitados a um total operacional de até 50 minutos, sem contar deslocamento. O primeiro deslocamento usa o endereço da empresa; os demais usam a sequência de atendimentos do técnico quando houver cálculo de rota disponível.</p>
    {update.isError&&<p className="form-error" role="alert">Não foi possível salvar. Tente novamente.</p>}
    {saved&&<p className="form-success">Preferências de agenda salvas.</p>}
    {canEdit&&<button className="primary-button" disabled={update.isPending}><Save size={18}/>{update.isPending?'Salvando…':'Salvar agenda e disponibilidade'}</button>}
  </form>
}

function AutoField({label,value,setValue,disabled,max,help}:{label:string;value:string;setValue:(value:string)=>void;disabled:boolean;max:number;help:string}){
  const automatic=value.trim()===''
  return <label>{label}<div className="settings-number-with-unit"><input type="number" min={0} max={max} value={value} disabled={disabled} onChange={event=>setValue(event.target.value)} placeholder="Automático pelo ALOVIA"/><span>min</span></div><small className="settings-field-help">{automatic?'Automático pelo ALOVIA. ':''}{help}</small></label>
}

function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
