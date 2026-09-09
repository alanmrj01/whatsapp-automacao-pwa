export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
export type ConversationStatus = 'waiting' | 'in_progress' | 'answered'

export type Appointment = {
  id:string
  customer_id:string
  customer_name:string
  customer_phone:string|null
  service_id:string
  service_name:string
  employee_id:string
  employee_name:string
  starts_at:string
  ends_at:string
  status:AppointmentStatus
  notes:string|null
}
export type AppointmentInput = {
  customer_id:string
  service_id:string
  employee_id:string
  starts_at:string
  ends_at:string
  status:AppointmentStatus
  notes:string|null
}
export type DashboardToday = {
  metrics:{waiting_count:number;in_progress_count:number;appointments_today_count:number;completed_today_count:number}
  upcoming_appointments:Appointment[]
}
export type Conversation = {
  id:string
  customer_id:string
  customer_name:string
  customer_phone:string|null
  last_content:string|null
  last_message_at:string|null
  status:ConversationStatus
  unread_count:number
  priority:boolean
  assignee_name:string|null
}
export type ConversationList = {items:Conversation[];page:number;page_size:number;total:number}
export type ConversationMessage = {id:string;direction:'inbound'|'outbound';message_type:string;body:string|null;status:string;created_at:string}
export type ConversationDetail = Conversation & {messages:ConversationMessage[]}
export type SetupStatus = {company:boolean;business_hours:boolean;automation:boolean;agenda:boolean;whatsapp:boolean;completed:number;total:5;next_step:'company'|'business_hours'|'automation'|'agenda'|'whatsapp'|'complete'}
export type Business = {id:string;name:string;timezone:string;slot_interval_minutes:number}
export type Employee = {id:string;name:string;active:boolean;service_ids:string[]}
export type WorkingHours = {id:string;employee_id:string;employee_name:string;weekday:number;start_time:string;end_time:string}
export type AutomationSettings = {human_control_window_minutes:number;supported_options:string[]}
export type Customer = {id:string;name:string;phone:string|null}
export type Service = {id:string;name:string;duration_minutes:number;active:boolean}
