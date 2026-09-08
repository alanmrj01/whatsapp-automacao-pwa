import { CircleHelp } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { BottomSheet } from './BottomSheet'

type InfoHelpProps = {
  title: string
  children: string
}

function useDesktopPointer() {
  const [desktop,setDesktop] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(min-width: 700px) and (hover: hover)')
    const update = () => setDesktop(media.matches)
    update()
    media.addEventListener('change',update)
    return () => media.removeEventListener('change',update)
  },[])
  return desktop
}

export function InfoHelp({title,children}:InfoHelpProps) {
  const [open,setOpen] = useState(false)
  const desktop = useDesktopPointer()
  const id = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event:KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('keydown',close)
    return () => document.removeEventListener('keydown',close)
  },[open])

  const close = () => {
    setOpen(false)
    window.setTimeout(() => triggerRef.current?.focus(),0)
  }

  return <span
    className="info-help"
    onMouseLeave={()=>desktop&&setOpen(false)}
    onBlur={event=>desktop&&(!event.relatedTarget||event.relatedTarget instanceof Node&&!event.currentTarget.contains(event.relatedTarget))&&setOpen(false)}
  >
    <button
      ref={triggerRef}
      type="button"
      className="info-help__trigger"
      aria-label={`Mais informações sobre ${title}`}
      aria-expanded={open}
      aria-controls={id}
      onMouseEnter={()=>desktop&&setOpen(true)}
      onFocus={()=>desktop&&setOpen(true)}
      onClick={()=>setOpen(value=>!value)}
    ><CircleHelp size={18}/></button>
    {desktop && open && <span id={id} className="info-help__popover" role="tooltip"><strong>{title}</strong>{children}</span>}
    {!desktop && <BottomSheet open={open} title={title} onClose={close}><p id={id} className="info-help__sheet-copy">{children}</p></BottomSheet>}
  </span>
}
