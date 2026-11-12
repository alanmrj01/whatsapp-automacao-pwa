import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'

type BottomSheetProps = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  dismissible?: boolean
  children: ReactNode
}

export function BottomSheet({
  open,
  title,
  description,
  onClose,
  dismissible = true,
  children,
}: BottomSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="sheet-layer"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        if (dismissible) onClose()
      }}
    >
      <section className="bottom-sheet">
        <div className="bottom-sheet__handle" aria-hidden="true" />
        <div className="bottom-sheet__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p id={descriptionId}>{description}</p>}
          </div>
          {dismissible&&<button className="icon-button" type="button" aria-label="Fechar" onClick={onClose}>
            <X size={21} />
          </button>}
        </div>
        <div className="bottom-sheet__content">{children}</div>
      </section>
      {dismissible
        ? <button
            className="sheet-backdrop"
            type="button"
            aria-label="Fechar"
            tabIndex={-1}
            aria-hidden="true"
            onClick={onClose}
          />
        : <div className="sheet-backdrop" aria-hidden="true" />}
    </dialog>
  )
}
