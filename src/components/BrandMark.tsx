export function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className={`brand-mark${inverse ? ' brand-mark--inverse' : ''}`} aria-hidden="true">
      <svg className="brand-mark__bubble" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        <path d="M32 7a24 24 0 1 1-12.7 44.4L7 55l3.6-12.4A24 24 0 0 1 32 7Z" strokeWidth="6" strokeLinejoin="miter" />
        <g className="brand-mark__snow" transform="translate(32 31)" strokeWidth="2.4">
          {[0, 60, 120, 180, 240, 300].map(angle => (
            <path key={angle} d="M0-12V0m-3-10 3 3 3-3" transform={`rotate(${angle})`} />
          ))}
        </g>
      </svg>
    </span>
  )
}
