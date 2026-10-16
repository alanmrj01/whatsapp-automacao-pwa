import { Lightbulb } from 'lucide-react'

export function DemoInsight({children}:{children:string}) {
  return <aside className="demo-insight"><Lightbulb size={17}/><span>{children}</span></aside>
}
