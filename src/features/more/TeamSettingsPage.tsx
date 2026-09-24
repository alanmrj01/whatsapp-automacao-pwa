import { Plus, Save, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { ErrorState } from '../../components/ErrorState'
import { InfoHelp } from '../../components/InfoHelp'
import { LoadingState } from '../../components/LoadingState'
import { RequiredLabel } from '../../components/RequiredLabel'
import { StatusBadge } from '../../components/StatusBadge'
import { canConfigureWhatsApp } from '../auth/types'
import { useAuth } from '../auth/useAuth'
import { useCreateEmployee, useEmployees, useUpdateEmployee } from '../operations/api'
import type { Employee, OperationalRole } from '../operations/types'

const roles:Record<OperationalRole,string>={technician:'Técnico',assistant:'Auxiliar',administrator:'Administrador'}

export function TeamSettingsPage(){
  const employees=useEmployees()
  const canEdit=canConfigureWhatsApp(useAuth().membership?.role)
  const create=useCreateEmployee()
  const [name,setName]=useState('')
  const [role,setRole]=useState<OperationalRole>('technician')
  if(employees.isPending)return <Shell><LoadingState/></Shell>
  if(employees.isError||!employees.data)return <Shell><ErrorState onRetry={()=>void employees.refetch()}/></Shell>
  return <Shell>
    <section className="operational-heading"><div><span className="eyebrow">Empresa</span><h1>Técnicos e responsáveis</h1></div><InfoHelp title="Técnicos e responsáveis">Um técnico ativo pode ser alocado em qualquer serviço. Você não precisa configurar serviços por técnico.</InfoHelp></section>
    {canEdit&&<form className="settings-form settings-form--inline" onSubmit={event=>{event.preventDefault();create.mutate({name,operational_role:role},{onSuccess:()=>{setName('');setRole('technician')}})}}>
      <label><RequiredLabel>Novo profissional</RequiredLabel><input required minLength={2} value={name} onChange={event=>setName(event.target.value)}/></label>
      <label><RequiredLabel>Função</RequiredLabel><select value={role} onChange={event=>setRole(event.target.value as OperationalRole)}>{Object.entries(roles).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
      {create.isError&&<MutationError/>}
      <button className="primary-button" disabled={create.isPending||!name.trim()}><Plus size={18}/>{create.isPending?'Adicionando…':'Adicionar profissional'}</button>
    </form>}
    <div className="settings-list">{employees.data.items.map(item=><EmployeeEditor employee={item} canEdit={canEdit} key={item.id}/>)}{!employees.data.items.length&&<p className="settings-empty">Nenhum profissional cadastrado.</p>}</div>
  </Shell>
}

function EmployeeEditor({employee,canEdit}:{employee:Employee;canEdit:boolean}){
  const update=useUpdateEmployee()
  const [name,setName]=useState(employee.name)
  const [role,setRole]=useState<OperationalRole>(employee.operational_role)
  const [saved,setSaved]=useState(false)
  return <article className="settings-editor">
    <div className="settings-editor__heading"><UsersRound/><input aria-label="Nome do profissional" value={name} disabled={!canEdit} onChange={event=>setName(event.target.value)}/><StatusBadge tone={employee.active?'success':'neutral'}>{employee.active?'Ativo':'Inativo'}</StatusBadge></div>
    <label><RequiredLabel>Função operacional</RequiredLabel><select value={role} disabled={!canEdit} onChange={event=>setRole(event.target.value as OperationalRole)}>{Object.entries(roles).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label>
    {update.isError&&<MutationError/>}{saved&&<p className="form-success">Profissional salvo.</p>}
    {canEdit&&<div className="settings-editor__actions"><button className="danger-button" type="button" disabled={update.isPending} onClick={()=>update.mutate({id:employee.id,values:{active:!employee.active}})}>{employee.active?'Desativar':'Ativar'}</button><button className="compact-button" type="button" disabled={update.isPending} onClick={()=>{setSaved(false);update.mutate({id:employee.id,values:{name,operational_role:role}},{onSuccess:()=>setSaved(true)})}}><Save size={16}/>{update.isPending?'Salvando…':'Salvar'}</button></div>}
  </article>
}

function MutationError(){return <p className="form-error" role="alert">Não foi possível salvar. Tente novamente.</p>}
function Shell({children}:{children:React.ReactNode}){return <div className="page-stack operational-page compact-page settings-page">{children}</div>}
