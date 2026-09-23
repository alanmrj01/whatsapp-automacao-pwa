import { useMutation, useQuery } from '@tanstack/react-query'
import { queryClient } from '../../app/queryClient'
import { api } from '../../lib/api'
import { useAuth } from '../auth/useAuth'
import { entitlementsFor, requirePaidAccess } from '../access/entitlements'
import type {
  Appointment,
  AppointmentInput,
  AssistantExclusion,
  AutomationSettings,
  Business,
  CatalogItem,
  ConversationDetail,
  ConversationList,
  ConversationMessage,
  Customer,
  DashboardToday,
  Employee,
  OperationalRole,
  OperationalNotification,
  Service,
  SetupStatus,
  WorkingHours,
} from './types'

const root = (businessId?:string) => ['operations',businessId] as const
const json = (value:object) => JSON.stringify(value)

function usePaidContext() {
  const {membership} = useAuth()
  return {businessId:membership?.business_id,enabled:entitlementsFor(membership).canReadOperationalData,membership}
}

function paidMutation<T>(context:ReturnType<typeof usePaidContext>, action:()=>Promise<T>) {
  requirePaidAccess(context.membership)
  return action()
}

async function invalidate(businessId:string|undefined,...resources:string[]) {
  await Promise.all(resources.map(resource=>queryClient.invalidateQueries({queryKey:[...root(businessId),resource]})))
}

export function useSetupStatus() {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'setup'],queryFn:({signal})=>api.request<SetupStatus>('/setup/status',{signal}),enabled:context.enabled,retry:false})
}
export function useCompleteOnboarding() {
  const context=usePaidContext()
  return useMutation({
    mutationFn:()=>paidMutation(context,()=>api.request<SetupStatus>('/setup/complete',{method:'POST',body:'{}'})),
    onSuccess:()=>invalidate(context.businessId,'setup','business'),
  })
}
export function useDashboardToday() {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'dashboard'],queryFn:({signal})=>api.request<DashboardToday>('/dashboard/today',{signal}),enabled:context.enabled,retry:false})
}
export function useNotifications(unreadOnly=true) {
  const context=usePaidContext()
  return useQuery({
    queryKey:[...root(context.businessId),'notifications',unreadOnly],
    queryFn:({signal})=>api.request<{items:OperationalNotification[]}>(`/notifications?unread_only=${String(unreadOnly)}`,{signal}),
    enabled:context.enabled,
    retry:false,
    refetchInterval:30_000,
    refetchIntervalInBackground:false,
  })
}
export function useMarkNotificationRead() {
  const context=usePaidContext()
  return useMutation({
    mutationFn:(id:string)=>paidMutation(context,()=>api.request<OperationalNotification>(`/notifications/${id}/read`,{method:'PATCH',body:'{}'})),
    onSuccess:()=>invalidate(context.businessId,'notifications'),
  })
}
export function useAppointments(date:string) {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'appointments',date],queryFn:({signal})=>api.request<{items:Appointment[]}>(`/appointments?date=${encodeURIComponent(date)}`,{signal}),enabled:context.enabled,retry:false})
}
export function useAppointmentsRange(startsAt:string,endsBefore:string,enabled=true) {
  const context=usePaidContext()
  const params=new URLSearchParams({starts_at:startsAt,ends_before:endsBefore})
  return useQuery({queryKey:[...root(context.businessId),'appointments-range',startsAt,endsBefore],queryFn:({signal})=>api.request<{items:Appointment[]}>(`/appointments?${params}`,{signal}),enabled:context.enabled&&enabled&&!!startsAt&&!!endsBefore,retry:false})
}
export function useSaveAppointment() {
  const context=usePaidContext()
  return useMutation({mutationFn:({id,values}:{id?:string;values:AppointmentInput})=>paidMutation(context,()=>api.request<Appointment>(id?`/appointments/${id}`:'/appointments',{method:id?'PATCH':'POST',body:json(values)})),onSuccess:()=>invalidate(context.businessId,'appointments','appointments-range','dashboard','setup')})
}
export function useCancelAppointment() {
  const context=usePaidContext()
  return useMutation({mutationFn:(id:string)=>paidMutation(context,()=>api.request<Appointment>(`/appointments/${id}/cancel`,{method:'POST',body:'{}'})),onSuccess:()=>invalidate(context.businessId,'appointments','appointments-range','dashboard')})
}

export function useConversations(search:string,status:string) {
  const context=usePaidContext()
  const params=new URLSearchParams({page:'1',page_size:'50'})
  if(search.trim())params.set('search',search.trim())
  if(status)params.set('status',status)
  return useQuery({queryKey:[...root(context.businessId),'conversations',search,status],queryFn:({signal})=>api.request<ConversationList>(`/conversations?${params}`,{signal}),enabled:context.enabled,retry:false})
}
export function useConversation(id:string|null) {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'conversation',id],queryFn:({signal})=>api.request<ConversationDetail>(`/conversations/${id}`,{signal}),enabled:context.enabled&&!!id,retry:false,refetchInterval:context.enabled&&id?5_000:false})
}
export function useSetConversationPinned() {
  const context=usePaidContext()
  return useMutation({mutationFn:({id,pinned}:{id:string;pinned:boolean})=>paidMutation(context,()=>api.request<ConversationDetail>(`/conversations/${id}/actions`,{method:'PATCH',body:json({pinned})})),onSuccess:()=>invalidate(context.businessId,'conversations','conversation')})
}
export function useSetConversationRead() {
  const context=usePaidContext()
  return useMutation({mutationFn:({id,read}:{id:string;read:boolean})=>paidMutation(context,()=>api.request<ConversationDetail>(`/conversations/${id}/actions`,{method:'PATCH',body:json({read})})),onSuccess:()=>invalidate(context.businessId,'conversations','conversation','dashboard')})
}
export function useDeleteConversation() {
  const context=usePaidContext()
  return useMutation({mutationFn:(id:string)=>paidMutation(context,()=>api.request<void>(`/conversations/${id}`,{method:'DELETE'})),onSuccess:()=>invalidate(context.businessId,'conversations','conversation','dashboard')})
}
export function useUpdateCustomerName() {
  const context=usePaidContext()
  return useMutation({mutationFn:({id,name}:{id:string;name:string|null})=>paidMutation(context,()=>api.request<ConversationDetail>(`/conversations/${id}/customer`,{method:'PATCH',body:json({name})})),onSuccess:()=>invalidate(context.businessId,'conversations','conversation','dashboard')})
}
export function useUpdateConversationAssistant() {
  const context=usePaidContext()
  return useMutation({mutationFn:({id,enabled}:{id:string;enabled:boolean})=>paidMutation(context,()=>api.request<ConversationDetail>(`/conversations/${id}/assistant`,{method:'PATCH',body:json({enabled})})),onSuccess:()=>invalidate(context.businessId,'conversations','conversation','dashboard')})
}
export function useSendConversationMessage() {
  const context=usePaidContext()
  return useMutation({mutationFn:({id,text,idempotencyKey}:{id:string;text:string;idempotencyKey:string})=>paidMutation(context,()=>api.request<ConversationMessage>(`/conversations/${id}/messages`,{method:'POST',headers:{'Idempotency-Key':idempotencyKey},body:json({text})})),onSettled:()=>invalidate(context.businessId,'conversations','conversation','dashboard')})
}

export function useBusiness() {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'business'],queryFn:({signal})=>api.request<Business>('/business',{signal}),enabled:context.enabled,retry:false})
}
export function useUpdateBusiness() {
  const context=usePaidContext()
  return useMutation({mutationFn:(values:Partial<Pick<Business,
    'name'|'responsible_name'|'timezone'|'service_origin_address'|'slot_interval_minutes'|
    'interval_between_services_minutes'|'preparation_minutes'|'finishing_minutes'|
    'minimum_booking_notice_minutes'|'materials_catalog_reviewed'|'agenda_preferences_reviewed'
  >>)=>paidMutation(context,()=>api.request<Business>('/business',{method:'PATCH',body:json(values)})),onSuccess:()=>invalidate(context.businessId,'business','setup')})
}

export function useAssistantExclusions() {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'assistant-exclusions'],queryFn:({signal})=>api.request<{items:AssistantExclusion[]}>('/automation/exclusions',{signal}),enabled:context.enabled,retry:false})
}
export function useAddAssistantExclusion() {
  const context=usePaidContext()
  return useMutation({mutationFn:({whatsapp_id,label,reason,mode='human_only'}:{whatsapp_id:string;label?:string|null;reason?:string|null;mode?:'ignore'|'human_only'})=>paidMutation(context,()=>api.request<AssistantExclusion>('/automation/exclusions',{method:'POST',body:json({whatsapp_id,mode,label:label||null,reason:reason||null,active:true})})),onSuccess:()=>invalidate(context.businessId,'assistant-exclusions','conversation','conversations')})
}
export function useUpdateAssistantExclusion() {
  const context=usePaidContext()
  return useMutation({mutationFn:({id,values}:{id:string;values:Partial<Pick<AssistantExclusion,'mode'|'label'|'reason'|'active'>>})=>paidMutation(context,()=>api.request<AssistantExclusion>(`/automation/exclusions/${id}`,{method:'PATCH',body:json(values)})),onSuccess:()=>invalidate(context.businessId,'assistant-exclusions','conversation','conversations')})
}
export function useRemoveAssistantExclusion() {
  const context=usePaidContext()
  return useMutation({mutationFn:(id:string)=>paidMutation(context,()=>api.request<void>(`/automation/exclusions/${id}`,{method:'DELETE'})),onSuccess:()=>invalidate(context.businessId,'assistant-exclusions','conversation','conversations')})
}

export function useEmployees() {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'employees'],queryFn:({signal})=>api.request<{items:Employee[]}>('/employees',{signal}),enabled:context.enabled,retry:false})
}
export function useCreateEmployee() {
  const context=usePaidContext()
  return useMutation({mutationFn:({name,operational_role}:{name:string;operational_role:OperationalRole})=>paidMutation(context,()=>api.request<Employee>('/employees',{method:'POST',body:json({name,operational_role})})),onSuccess:()=>invalidate(context.businessId,'employees','setup')})
}
export function useUpdateEmployee() {
  const context=usePaidContext()
  return useMutation({mutationFn:({id,values}:{id:string;values:Partial<Pick<Employee,'name'|'active'|'operational_role'>>})=>paidMutation(context,()=>api.request<Employee>(`/employees/${id}`,{method:'PATCH',body:json(values)})),onSuccess:()=>invalidate(context.businessId,'employees','setup')})
}
export function useUpdateEmployeeServices() {
  const context=usePaidContext()
  return useMutation({mutationFn:({id,service_ids}:{id:string;service_ids:string[]})=>paidMutation(context,()=>api.request<Employee>(`/employees/${id}/services`,{method:'PUT',body:json({service_ids})})),onSuccess:()=>invalidate(context.businessId,'employees','setup')})
}

export function useWorkingHours() {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'working-hours'],queryFn:({signal})=>api.request<{items:WorkingHours[]}>('/working-hours',{signal}),enabled:context.enabled,retry:false})
}
export function useCreateWorkingHours() {
  const context=usePaidContext()
  return useMutation({mutationFn:(values:Omit<WorkingHours,'id'|'employee_name'>)=>paidMutation(context,()=>api.request<WorkingHours>('/working-hours',{method:'POST',body:json(values)})),onSuccess:()=>invalidate(context.businessId,'working-hours','setup')})
}
export function useDeleteWorkingHours() {
  const context=usePaidContext()
  return useMutation({mutationFn:(id:string)=>paidMutation(context,()=>api.request<void>(`/working-hours/${id}`,{method:'DELETE'})),onSuccess:()=>invalidate(context.businessId,'working-hours','setup')})
}

export function useAutomationSettings() {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'automation'],queryFn:({signal})=>api.request<AutomationSettings>('/automation',{signal}),enabled:context.enabled,retry:false})
}
export function useUpdateAutomation() {
  const context=usePaidContext()
  return useMutation({mutationFn:(values:Partial<Omit<AutomationSettings,'supported_options'>>)=>paidMutation(context,()=>api.request<AutomationSettings>('/automation',{method:'PATCH',body:json(values)})),onSuccess:()=>invalidate(context.businessId,'automation','setup')})
}

export function useCustomers() {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'customers'],queryFn:({signal})=>api.request<{items:Customer[]}>('/customers',{signal}),enabled:context.enabled,retry:false})
}
export function useCreateCustomer() {
  const context=usePaidContext()
  return useMutation({mutationFn:({name,phone}:{name:string;phone:string})=>paidMutation(context,()=>api.request<Customer>('/customers',{method:'POST',body:json({name,phone})})),onSuccess:()=>invalidate(context.businessId,'customers')})
}

export function useServices() {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'services'],queryFn:({signal})=>api.request<{items:Service[]}>('/services',{signal}),enabled:context.enabled,retry:false})
}
export function useCreateService() {
  const context=usePaidContext()
  return useMutation({mutationFn:(values:Pick<Service,'name'|'duration_minutes'|'price'>)=>paidMutation(context,()=>api.request<Service>('/services',{method:'POST',body:json(values)})),onSuccess:()=>invalidate(context.businessId,'services','setup')})
}
export function useUpdateService() {
  const context=usePaidContext()
  return useMutation({mutationFn:({id,values}:{id:string;values:Partial<Pick<Service,'name'|'duration_minutes'|'price'|'active'|'intent_examples'>>})=>paidMutation(context,()=>api.request<Service>(`/services/${id}`,{method:'PATCH',body:json(values)})),onSuccess:()=>invalidate(context.businessId,'services','setup')})
}

export function useCatalogItems() {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'catalog-items'],queryFn:({signal})=>api.request<{items:CatalogItem[]}>('/catalog-items',{signal}),enabled:context.enabled,retry:false})
}
export function useCreateCatalogItem() {
  const context=usePaidContext()
  return useMutation({mutationFn:(values:Pick<CatalogItem,'kind'|'name'|'description'|'price'|'unit_label'>)=>paidMutation(context,()=>api.request<CatalogItem>('/catalog-items',{method:'POST',body:json(values)})),onSuccess:()=>invalidate(context.businessId,'catalog-items','setup')})
}
export function useUpdateCatalogItem() {
  const context=usePaidContext()
  return useMutation({mutationFn:({id,values}:{id:string;values:Partial<Pick<CatalogItem,'kind'|'name'|'description'|'price'|'unit_label'|'active'>>})=>paidMutation(context,()=>api.request<CatalogItem>(`/catalog-items/${id}`,{method:'PATCH',body:json(values)})),onSuccess:()=>invalidate(context.businessId,'catalog-items','setup')})
}
export function useDeleteCatalogItem() {
  const context=usePaidContext()
  return useMutation({mutationFn:(id:string)=>paidMutation(context,()=>api.request<void>(`/catalog-items/${id}`,{method:'DELETE'})),onSuccess:()=>invalidate(context.businessId,'catalog-items','setup')})
}
