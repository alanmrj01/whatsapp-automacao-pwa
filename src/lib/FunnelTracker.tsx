import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { trackEvent } from './tracking'
import { useAuth } from '../features/auth/useAuth'

function routeGroup(pathname:string) {
  if(pathname==='/') return 'landing'
  if(pathname==='/criar-conta') return 'signup'
  if(pathname.includes('/checkout')) return 'checkout'
  if(pathname.includes('/plano')) return 'plan'
  if(pathname.includes('/conversas')) return 'conversations'
  if(pathname.includes('/agenda')) return 'agenda'
  if(pathname.includes('/mais')) return 'settings'
  if(pathname.startsWith('/app')) return 'app_home'
  return 'other'
}

function normalizedLabel(element: Element) {
  const explicit = element.getAttribute('data-track-action')
  if (explicit) return explicit.slice(0,120)
  return (element.textContent ?? '').replace(/\s+/g,' ').trim().slice(0,120) || element.tagName.toLowerCase()
}

export function FunnelTracker() {
  const location = useLocation()
  const auth = useAuth()
  const lastPage = useRef('')
  const membership = auth.membership
  const demo = membership?.access_mode === 'free' || membership?.account_state === 'demo'
  const surface = location.pathname === '/' ? 'landing' : demo ? 'demo' : 'app'

  useEffect(() => {
    const key = `${location.pathname}${location.search}:${surface}`
    if (lastPage.current === key) return
    lastPage.current = key
    trackEvent(demo ? 'demo_page_view' : 'page_view', {
      query_present: Boolean(location.search),
      access_mode: membership?.access_mode ?? null,
      account_state: membership?.account_state ?? null,
      route_group: routeGroup(location.pathname),
      funnel_stage: demo ? 'demo_exploration' : location.pathname === '/' ? 'landing' : 'app',
    }, {
      surface,
      businessId: auth.user?.active_business_id,
      userId: auth.user?.id,
    })
  }, [auth.user?.active_business_id, auth.user?.id, demo, location.pathname, location.search, membership?.access_mode, membership?.account_state, surface])

  useEffect(() => {
    if (!demo) return
    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('button,a,[role="button"]') : null
      if (!target) return
      const href = target instanceof HTMLAnchorElement ? target.getAttribute('href') : null
      trackEvent('demo_interaction', {
        action: normalizedLabel(target),
        element: target.tagName.toLowerCase(),
        route_group: routeGroup(location.pathname),
        target_path: href?.startsWith('/') ? href.slice(0,255) : null,
        funnel_stage:'demo_exploration',
      }, {
        surface: 'demo',
        businessId: auth.user?.active_business_id,
        userId: auth.user?.id,
      })
    }
    document.addEventListener('click', onClick, {capture:true})
    return () => document.removeEventListener('click', onClick, {capture:true})
  }, [auth.user?.active_business_id, auth.user?.id, demo, location.pathname])

  return null
}
