export type MembershipRole = 'owner' | 'admin' | 'attendant' | 'viewer'
export type Membership = { business_id: string; business_name: string; role: MembershipRole }
export type SessionUser = {
  id: string
  email: string
  platform_role: 'super_admin' | null
  active_business_id: string | null
  memberships: Membership[]
}

export function canConfigureWhatsApp(role?: MembershipRole) {
  return role === 'owner' || role === 'admin'
}

export function homeFor(user: SessionUser) {
  return user.platform_role === 'super_admin' ? '/admin' : '/app'
}
