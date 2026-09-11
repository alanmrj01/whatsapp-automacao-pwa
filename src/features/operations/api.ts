import { useMutation, useQuery } from '@tanstack/react-query'
import { queryClient } from '../../app/queryClient'
import { api } from '../../lib/api'
import { useAuth } from '../auth/useAuth'
import { entitlementsFor, requirePaidAccess } from '../access/entitlements'
import type { Appointment, AppointmentInput, AutomationSettings, Business, ConversationDetail, ConversationList, Customer, DashboardToday, Employee, Service, SetupStatus, WorkingHours } from './types'

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
export function useDashboardToday() {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'dashboard'],queryFn:({signal})=>api.request<DashboardToday>('/dashboard/today',{signal}),enabled:context.enabled,retry:false})
}
export function useAppointments(date:string) {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'appointments',date],queryFn:({signal})=>api.request<{items:Appointment[]}>(`/appointments?date=${encodeURIComponent(date)}`,{signal}),enabled:context.enabled,retry:false})
}
export function useSaveAppointment() {
  const context=usePaidContext()
  return useMutation({mutationFn:({id,values}:{id?:string;values:AppointmentInput})=>paidMutation(context,()=>api.request<Appointment>(id?`/appointments/${id}`:'/appointments',{method:id?'PATCH':'POST',body:json(values)})),onSuccess:()=>invalidate(context.businessId,'appointments','dashboard','setup')})
}
export function useCancelAppointment() {
  const context=usePaidContext()
  return useMutation({mutationFn:(id:string)=>paidMutation(context,()=>api.request<Appointment>(`/appointments/${id}/cancel`,{method:'POST',body:'{}'})),onSuccess:()=>invalidate(context.businessId,'appointments','dashboard')})
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
  return useQuery({queryKey:[...root(context.businessId),'conversation',id],queryFn:({signal})=>api.request<ConversationDetail>(`/conversations/${id}`,{signal}),enabled:context.enabled&&!!id,retry:false})
}
export function useBusiness() {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'business'],queryFn:({signal})=>api.request<Business>('/business',{signal}),enabled:context.enabled,retry:false})
}
export function useUpdateBusiness() {
  const context=usePaidContext()
  return useMutation({mutationFn:(values:Partial<Pick<Business,'name'|'timezone'|'slot_interval_minutes'>>)=>paidMutation(context,()=>api.request<Business>('/business',{method:'PATCH',body:json(values)})),onSuccess:()=>invalidate(context.businessId,'business','setup')})
}
export function useEmployees() {
  const context=usePaidContext()
  return useQuery({queryKey:[...root(context.businessId),'employees'],queryFn:({signal})=>api.request<{items:Employee[]}>('/employees',{signal}),enabled:context.enabled,retry:false})
}
export function useCreateEmployee() {
  const context=usePaidContext()
  return useMutation({mutationFn:(name:string)=>paidMutation(context,()=>api.request<Employee>('/employees',{method:'POST',body:json({name})})),onSuccess:()=>invalidate(context.businessId,'employees','setup')})
}
export function useUpdateEmployee() {
  const context=usePaidContext()
  return useMutation({mutationFn:({id,values}:{id:string;values:Partial<Pick<Employee,'name'|'active'>>})=>paidMutation(context,()=>api.request<Employee>(`/employees/${id}`,{method:'PATCH',body:json(values)})),onSuccess:()=>invalidate(context.businessId,'employees','setup')})
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
  return useMutation({mutationFn:(minutes:number)=>paidMutation(context,()=>api.request<AutomationSettings>('/automation',{method:'PATCH',body:json({human_control_window_minutes:minutes})})),onSuccess:()=>invalidate(context.businessId,'automation','setup')})
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
  return useMutation({mutationFn:(values:Pick<Service,'name'|'duration_minutes'>)=>paidMutation(context,()=>api.request<Service>('/services',{method:'POST',body:json(values)})),onSuccess:()=>invalidate(context.businessId,'services','setup')})
}
export function useUpdateService() {
  const context=usePaidContext()
  return useMutation({mutationFn:({id,values}:{id:string;values:Partial<Pick<Service,'name'|'duration_minutes'|'active'>>})=>paidMutation(context,()=>api.request<Service>(`/services/${id}`,{method:'PATCH',body:json(values)})),onSuccess:()=>invalidate(context.businessId,'services','employees','setup')})
}
