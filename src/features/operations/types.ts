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
  reschedule_pending:boolean
  rescheduled:boolean
  reschedule_preferred_starts_at:string|null
}
export type AppointmentRescheduleConflict = {
  appointment_id:string
  customer_name:string
  service_name:string
  starts_at:string
}
export type AppointmentRescheduleResult = {
  status:'pending'|'conflict'
  appointment_id:string
  reason:'appointment_conflict'|'slot_unavailable'|null
  displaced_appointment_ids:string[]
  conflicts:AppointmentRescheduleConflict[]
  message_ids:string[]
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
  customer_whatsapp_id?:string|null
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
export type ConversationMessage = {
  id:string
  direction:'inbound'|'outbound'
  message_type:string
  body:string|null
  status:string
  created_at:string
  media_mime_type:string|null
  media_filename:string|null
  media_url:string|null
}
export type ConversationDetail = Conversation & {
  messages:ConversationMessage[]
  assistant_enabled:boolean
  automation_suppressed_until:string|null
  free_form_window_open:boolean
  free_form_window_expires_at:string|null
}

export type ConversationMessageDelta = {
  items:ConversationMessage[]
  latest_at:string|null
}

export type ConversationBulkAction =
  | 'mark_read'