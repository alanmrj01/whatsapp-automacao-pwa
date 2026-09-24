import type { ReactNode } from 'react'

export function RequiredLabel({children}:{children:ReactNode}) {
  return <span className="required-field-label">{children}<span className="required-field-star" aria-hidden="true">*</span></span>
}
