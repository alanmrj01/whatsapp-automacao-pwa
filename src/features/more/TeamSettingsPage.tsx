import { Plus, Save, Trash2, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { RequiredLabel } from '../../components/RequiredLabel'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import {
  useCreateEmployee,
  useDeleteEmployee,
  useEmployees,
  useServices,
  useUpdateEmployee,
  useUpdateEmployeeServices,
} from '../operations/api'
import type { Employee, OperationalRole, Service } from '../operations/types'

type TeamRole='technician'|'assistant'
const roles:Record<TeamRole,string>={technician:'Técnico',assistant:'Auxiliar'}

export function TeamSettingsPage(){
  const employees=useEmployees()
  const services=useServices()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  const create=useCreateEmployee()
  const updateServices=useUpdateEmployeeServices()
  const [name,setName]=useState('')
  const [role,setRole]=useState<TeamRole>('technician')
  const activeServices=services.data?.items.filter(item=>item.active)??[]
  const [selectedServices,setSelectedServices]=useState<string[]>([])

  useEffect(()=>{
    if(role==='technician'&&!selectedServices.length&&activeServices.length){
      setSelectedServices(activeServices.map(item=>item.id))
    }
    if(role==='assistant'&&selectedServices.length)setSelectedServices([])
  },[role,activeServices.length])

  if(employees.isPending||services.isPending)return <Shell><LoadingState/></Shell>
  if(employees.isError||services.isError||!employees.data||!services.data)return <Shell><ErrorState onRetry={()=>{void employees.refetch();void services.refetch()}}/></Shell>

  const add=async()=>{
    const created=await create.mutateAsync({name:name.trim(),operational_role:role})
    if(role==='technician'&&selectedServices.length!==activeServices.length){
      await updateServices.mutateAsync({id:created.id,service_ids:selectedServices})
    }
    setName('')
    setRole('technician')
    setSelectedServices(activeServices.map(item=>item.id))
  }

  return <Shell>
    <section className="operational-heading"><div><span className="eyebrow">Empresa</span><h1>Técnicos</h1></div><InfoHelp title="Técnicos">Técnicos entram na capacidade da agenda e podem ter serviços específicos. Auxiliares são ajudantes e nunca ocupam uma vaga de atendimento sozinhos.</InfoHelp></section>
    {canEdit&&<form className="settings-form settings-form--inline" onSubmit={event=>{event.preventDefault();void add()}}>
      <label><RequiredLabel>Nome</RequiredLabel><input required minLength={2} value={name} onChange={event=>setName(event.target.value)} placeholder="Nome do profissional"/></label>
      <label><RequiredLabel>Cargo</RequiredLabel><select value={role} onChange={event=>setRole(event.target.value as TeamRole)}>{Object.entries(roles).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      {role==='technician'&&<ServiceSelector services={activeServices} selected={selectedServices} onChange={setSelectedServices}/>}
      {(create.isError||updateServices.isError)&&<MutationError/>}
      <button className="primary-button" disabled={create.isPending||updateServices.isPending||!name.trim()||role==='technician'&&!selectedServices.length}><Plus size={18}/>{create.isPending?'Adicionando…':'Adicionar profissional'}</button>
    </form>}
    <div className="settings-list">{employees.data.items.filter(item=>item.active&&item.operational_role!=='administrator').map(item=><EmployeeEditor employee={item} services={activeServices} canEdit={canEdit} key={item.id}/>)}{!employees.data.items.some(item=>item.active&&item.operational_role!=='administrator')&&<p className="settings-empty">Nenhum profissional cadastrado.</p>}</div>
  </Shell>
}

function EmployeeEditor({employee,services,canEdit}:{employee:Employee;services:Service[];canEdit:boolean}){
  const update=useUpdateEmployee()
  const updateServices=useUpdateEmployeeServices()
  const remove=useDeleteEmployee()
  const [name,setName]=useState(employee.name)
  const [role,setRole]=useState<TeamRole>(employee.operational_role==='assistant'?'assistant':'technician')
  const [serviceIds,setServiceIds]=useState(employee.service_ids)
  const [saved,setSaved]=useState(false)

  useEffect(()=>{setServiceIds(employee.service_ids)},[employee.service_ids.join('|')])

  const changeRole=(next:TeamRole)=>{
    setRole(next)
    if(next==='assistant')setServiceIds([])
    else if(!serviceIds.length)setServiceIds(services.map(item=>item.id))
  }
  const save=async()=>{
    setSaved(false)
    await update.mutateAsync({id:employee.id,values:{name:name.trim(),operational_role:role as OperationalRole}})
    if(role==='technician')await updateServices.mutateAsync({id:employee.id,service_ids:serviceIds})
    setSaved(true)
  }

  return <article className="settings-editor">
    <div className="settings-editor__heading"><UsersRound/><input aria-label="Nome do profissional" value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/></div>
    <label><RequiredLabel>Cargo</RequiredLabel><select value={role} disabled={!canEdit} onChange={event=>changeRole(event.target.value as TeamRole)}>{Object.entries(roles).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
    {role==='technician'&&<ServiceSelector services={services} selected={serviceIds} onChange={setServiceIds} disabled={!canEdit}/>}
    {(update.isError||updateServices.isError||remove.isError)&&<MutationError/>}{saved&&<p className="form-success">Profissional salvo.</p>}
    {canEdit&&<div className="settings-editor__actions"><button className="danger-button" type="button" disabled={remove.isPending} onClick={()=>remove.mutate(employee.id)} aria-label={`Excluir ${employee.name}`}><Trash2 size={16}/>Excluir</button><button className="compact-button" type="button" disabled={update.isPending||updateServices.isPending||!name.trim()||role==='technician'&&!serviceIds.length} onClick={()=>void save()}><Save size={16}/>{update.isPending||updateServices.isPending?'Salvando…':'Salvar'}</button></div>}
  </article>
}

function ServiceSelector({services,selected,onChange,disabled=false}:{services:Service[];selected:string[];onChange:(ids:string[])=>void;disabled?:boolean}){
  const toggle=(id:string)=>onChange(selected.includes(id)?selected.filter(item=>item!==id):[...selected,id])
  return <fieldset className="technician-service-selector"><legend><RequiredLabel>Função operacional</RequiredLabel></legend><small>Todos os serviços ficam selecionados por padrão. Desmarque apenas o que este técnico não realiza.</small><div>{services.map(service=><label key={service.id}><input type="checkbox" checked={selected.includes(service.id)} disabled={disabled} onChange={()=>toggle(service.id)}/><span>{service.name}</span></label>)}</div>{!services.length&&<small>Nenhum serviço ativo no catálogo.</small>}</fieldset>
}

function MutationError(){return <p className="form-error" role="alert">Não foi possível salvar. Tente novamente.</p>}
function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
