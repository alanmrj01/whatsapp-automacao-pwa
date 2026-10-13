import { ArrowRight } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomSheet } from '../../components/BottomSheet'
import { api } from '../../lib/api'
import { useAuth } from '../auth/useAuth'

type ReengagementPromptData = {
  id:string
  campaign:'upgrade'|'whatsapp_activation'
  step:number
  title:string
  body:string
  cta_label:string
  cta_path:string
}

export function ReengagementPrompt(){
  const {user,membership}=useAuth()
  const navigate=useNavigate()
  const queryClient=useQueryClient()
  const [closed,setClosed]=useState(false)
  const allowedRole=membership?.role==='owner'||membership?.role==='admin'
  const queryKey=['reengagement-prompt',user?.id,membership?.business_id] as const
  const prompt=useQuery({
    queryKey,
    queryFn:()=>api.request<ReengagementPromptData|null>(
      '/reengagement/claim',
      {method:'POST',body:'{}'},
    ),
    enabled:!!user&&!!membership&&allowedRole,
    retry:false,
    staleTime:15*60_000,
    gcTime:30*60_000,
    refetchOnWindowFocus:false,
  })
  const interaction=useMutation({
    mutationFn:({id,action}:{id:string;action:'dismiss'|'cta'})=>api.request<void>(
      `/reengagement/${id}/${action}`,
      {method:'POST',body:'{}'},
    ),
  })
  const data=prompt.data
  const close=()=>{
    if(!data)return
    setClosed(true)
    queryClient.setQueryData(queryKey,null)
    interaction.mutate({id:data.id,action:'dismiss'})
  }
  const act=()=>{
    if(!data)return
    setClosed(true)
    queryClient.setQueryData(queryKey,null)
    interaction.mutate({id:data.id,action:'cta'})
    navigate(safeTarget(data.cta_path))
  }

  if(!data||closed)return null
  return <BottomSheet
    open
    title={data.title}
    description={data.body}
    onClose={close}
  >
    <div className="upgrade-prompt upgrade-prompt--compact reengagement-prompt">
      <span className="eyebrow">{data.campaign==='upgrade'?'Um próximo passo para sua operação':'Falta pouco para ativar o canal'}</span>
      <div className="upgrade-prompt__actions">
        <button className="primary-button" type="button" onClick={act}>
          {data.cta_label}<ArrowRight size={17}/>
        </button>
        <button className="compact-button" type="button" onClick={close}>Agora não</button>
      </div>
    </div>
  </BottomSheet>
}

function safeTarget(value:string){
  return value.startsWith('/app/')?value:'/app'
}
