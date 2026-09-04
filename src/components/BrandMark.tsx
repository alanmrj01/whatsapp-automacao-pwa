import { Snowflake } from 'lucide-react'

export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`brand-mark${inverse ? ' brand-mark--inverse' : ''}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false">
        <path d="M32 8C18.7 8 8 17.4 8 29c0 6.4 3.3 12.2 8.6 16.1L13.7 56l11.6-6.5c2.1.4 4.4.6 6.7.6 13.3 0 24-9.4 24-21S45.3 8 32 8Z" />
      </svg>
      <Snowflake className="brand-mark__snow" size={20} strokeWidth={2.4} />
    </span>
  )
}
