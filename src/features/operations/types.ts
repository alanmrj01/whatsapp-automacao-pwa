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

export type OperationalNotification = {
  id:string
  appointment_id:string
  event_type:'automatic_booking_confirmed'
  title:string
  body:string
  target_path:string
  read:boolean
  created_at:string
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
  pinned:boolean
  manual_unread:boolean
  assignee_name:string|null
}
export type ConversationList = {items:Conversation[];page:number;page_size:number;total:number}
export type ConversationMessage = {id:string;direction:'inbound'|'outbound';message_type:string;body:string|null;status:string;created_at:string}
export type ConversationDetail = Conversation & {
  messages:ConversationMessage[]
  assistant_enabled:boolean
  automation_suppressed_until:string|null
  free_form_window_open:boolean
  free_form_window_expires_at:string|null
}

export type SetupStep = 'company'|'team'|'business_hours'|'services'|'materials'|'agenda'|'whatsapp'|'complete'
export type SetupStatus = {
  company:boolean
  team:boolean
  business_hours:boolean
  services:boolean
  materials:boolean
  agenda:boolean
  whatsapp:boolean
  completed:number
  total:7
  next_step:SetupStep
  onboarding_completed:boolean
  onboarding_completed_at:string|null
  onboarding_version:number
  blocking_reasons:string[]
}

export type Business = {
  id:string
  name:string
  responsible_name:string|null
  timezone:string
  service_origin_address:string|null
  slot_interval_minutes:number
  interval_between_services_minutes:number|null
  preparation_minutes:number|null
  finishing_minutes:number|null
  minimum_booking_notice_minutes:number|null
  materials_catalog_reviewed:boolean
  agenda_preferences_reviewed:boolean
  onboarding_completed_at:string|null
  onboarding_version:number
}

export type OperationalRole = 'technician'|'assistant'|'administrator'
export type Employee = {id:string;name:string;active:boolean;operational_role:OperationalRole;service_ids:string[]}
export type BusinessHours = {
  weekdays:number[]
  weekday_start_time:string|null
  weekday_end_time:string|null
  weekend_holiday_enabled:boolean
  weekend_holiday_start_time:string|null
  weekend_holiday_end_time:string|null
}
export type WorkingHours = {id:string;employee_id:string;employee_name:string;weekday:number;start_time:string;end_time:string}

export type AutomationSettings = {
  assistant_enabled:boolean
  human_control_window_minutes:number
  greeting_message:string
  fallback_message:string
  handoff_message:string
  supported_options:string[]
}
export type AssistantExclusion = {
  id:string
  whatsapp_id:string
  mode:'ignore'|'human_only'
  label:string|null
  reason:string|null
  active:boolean
}

export type Customer = {id:string;name:string;phone:string|null}

export type Service = {
  id:string
  name:string
  duration_minutes:number
  price:number|string|null
  active:boolean
  intent_examples:string[]
}

export type CatalogItem = {
  id:string
  kind:'material'|'equipment'
  name:string
  description:string|null
  price:number|string|null
  unit_label:string|null
  preset_key:string|null
  active:boolean
}
