/** Card wrapper that tracks the pointer to paint a radial spotlight (see .spotlight in CSS). */
export default function Spotlight({ as: Tag = 'div', className = '', children, ...rest }) {
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return <Tag className={`card spotlight ${className}`} onMouseMove={onMove} {...rest}>{children}</Tag>
}
