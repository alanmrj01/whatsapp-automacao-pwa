import type { AccessMode } from './types'
import type { PlatformBusiness } from './platformAdmin'

export function withBusinessAccess(
  businesses: PlatformBusiness[],
  businessId: string,
  accessMode: AccessMode,
) {
  return businesses.map(business => business.id === businessId
    ? {...business, access_mode: accessMode}
    : business)
}
