import {
  CalendarDays,
  Home,
  Menu,
  MessageCircleMore,
  MessagesSquare,
} from 'lucide-react'

export const navigationItems = [
  { label: 'Início', to: '/app', icon: Home, end: true },
  { label: 'Agenda', to: '/app/agenda', icon: CalendarDays, end: false },
  { label: 'Conversas', to: '/app/conversas', icon: MessagesSquare, end: false },
  { label: 'WhatsApp', to: '/app/whatsapp', icon: MessageCircleMore, end: false },
  { label: 'Mais', to: '/app/mais', icon: Menu, end: false },
] as const
