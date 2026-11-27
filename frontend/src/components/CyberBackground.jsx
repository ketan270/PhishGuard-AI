import { useEffect, useRef } from 'react'

/** Animated "threat network": drifting nodes, connecting links and travelling packets.
 *  Some nodes are flagged red (threats) and get intercepted by a cyan pulse. */
export default function CyberBackground() {
  const ref = useRef(null)
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let w, h, dpr, nodes = [], packets = [], raf, t = 0
    const mouse = { x: -9999, y: -9999 }

    const init = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.width = window.innerWidth * dpr
      h = canvas.height = window.innerHeight * dpr
      canvas.style.width = window.innerWidth + 'px'
      canvas.style.height = window.innerHeight + 'px'
      const count = Math.min(90, Math.floor((window.innerWidth * window.innerHeight) / 16000))
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25 * dpr, vy: (Math.random() - 0.5) * 0.25 * dpr,
        r: (Math.random() * 1.6 + 0.6) * dpr, threat: Math.random() < 0.08, phase: Math.random() * Math.PI * 2,
      }))
      packets = []
    }
    const LINK = 150
    const draw = () => {
      t += 1
      ctx.clearRect(0, 0, w, h)
      const link = LINK * dpr
      for (const n of nodes) {
        if (!reduce) { n.x += n.vx; n.y += n.vy }
        if (n.x < 0 || n.x > w) n.vx *= -1
        if (n.y < 0 || n.y > h) n.vy *= -1
        const dx = n.x - mouse.x * dpr, dy = n.y - mouse.y * dpr
        const md = Math.hypot(dx, dy)
        if (md < 120 * dpr && md > 0) { n.x += (dx / md) * 0.6 * dpr; n.y += (dy / md) * 0.6 * dpr }
      }
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          const d = Math.hypot(a.x - b.x, a.y - b.y)
          if (d < link) {
            const alpha = (1 - d / link) * 0.22
            ctx.strokeStyle = a.threat || b.threat ? `rgba(255,77,109,${alpha * 0.9})` : `rgba(80,180,255,${alpha})`
            ctx.lineWidth = dpr * 0.6
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
            if (!reduce && Math.random() < 0.0009) packets.push({ a, b, p: 0 })
          }
        }
      }
      for (const n of nodes) {
        const pulse = n.threat ? 0.5 + 0.5 * Math.sin(t * 0.05 + n.phase) : 1
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.r * (n.threat ? 1.6 : 1), 0, Math.PI * 2)
        ctx.fillStyle = n.threat ? `rgba(255,77,109,${0.5 + pulse * 0.5})` : 'rgba(140,200,255,0.75)'
        ctx.fill()
        if (n.threat) {
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r * (4 + pulse * 6), 0, Math.PI * 2)
          ctx.strokeStyle = `rgba(255,77,109,${0.25 * (1 - pulse)})`; ctx.lineWidth = dpr; ctx.stroke()
        }
      }
      packets = packets.filter((pk) => pk.p <= 1)
      for (const pk of packets) {
        pk.p += 0.012
        const x = pk.a.x + (pk.b.x - pk.a.x) * pk.p, y = pk.a.y + (pk.b.y - pk.a.y) * pk.p
        ctx.beginPath(); ctx.arc(x, y, 1.8 * dpr, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(34,211,238,0.95)'; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 10 * dpr; ctx.fill(); ctx.shadowBlur = 0
      }
      raf = requestAnimationFrame(draw)
    }
    const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY }
    const onVis = () => { if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(draw) }
    init(); draw()
    window.addEventListener('resize', init)
    window.addEventListener('pointermove', onMove)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', init)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])
  return <canvas ref={ref} className="bg-canvas" aria-hidden style={{ opacity: 0.55 }} />
}
