import type { ReactNode } from 'react'

type SectionProps = {
  title: string
  action?: ReactNode
  children: ReactNode
}

export function Section({ title, action, children }: SectionProps) {
  return (
    <section className="section-block">
      <div className="section-block__header">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}
