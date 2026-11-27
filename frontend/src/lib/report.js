// PDF security-report generator (Synopsis Module 10).
import { prettyTerm } from './format'
const COLORS = { High: [255, 77, 109], Medium: [217, 154, 8], Low: [16, 170, 120] }

export async function downloadReport(r) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const M = 48
  let y = 0

  const ensure = (need) => {
    if (y + need > H - 60) { doc.addPage(); y = M }
  }
  const heading = (t, keep = 60) => {
    ensure(keep)
    y += 10
    doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(20, 30, 60)
    doc.text(t, M, y); y += 6
    doc.setDrawColor(34, 211, 238); doc.setLineWidth(1.5); doc.line(M, y, M + 40, y); y += 16
  }
  const para = (t, size = 10, color = [60, 70, 90]) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(...color)
    const lines = doc.splitTextToSize(String(t), W - 2 * M)
    lines.forEach((ln) => { ensure(14); doc.text(ln, M, y); y += size + 4 })
  }

  // Header band
  doc.setFillColor(6, 10, 22); doc.rect(0, 0, W, 96, 'F')
  doc.setFillColor(34, 211, 238); doc.rect(0, 96, W, 3, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(22)
  doc.text('PhishGuard AI', M, 48)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(160, 175, 210)
  doc.text('Security Analysis Report', M, 68)
  doc.text(`Generated ${new Date().toLocaleString()}`, W - M, 48, { align: 'right' })
  doc.text(`Report ID: ${r._id || 'n/a'}`, W - M, 68, { align: 'right' })
  y = 132

  // Verdict box
  const c = COLORS[r.risk_level] || COLORS.Low
  doc.setFillColor(c[0], c[1], c[2]); doc.roundedRect(M, y, W - 2 * M, 74, 8, 8, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(24)
  doc.text(r.prediction.toUpperCase(), M + 20, y + 34)
  doc.setFontSize(11); doc.setFont('helvetica', 'normal')
  doc.text(`${r.risk_level} risk  ·  score ${r.risk_score}/100  ·  ${r.confidence}% confidence`, M + 20, y + 56)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(34)
  doc.text(String(r.risk_score), W - M - 20, y + 48, { align: 'right' })
  y += 100

  heading('Analysed input')
  doc.setFont('courier', 'normal'); doc.setFontSize(9); doc.setTextColor(40, 50, 70)
  doc.splitTextToSize(String(r.input).slice(0, 2500), W - 2 * M).forEach((ln) => { ensure(12); doc.text(ln, M, y); y += 12 })
  y += 6

  heading('Summary')
  para(r.summary)
  const meta = [
    ['Analysis type', r.analysis_type],
    ['Prediction', r.prediction],
    ['Risk level', r.risk_level],
    ['Risk score', `${r.risk_score} / 100`],
    ['Confidence', `${r.confidence}%`],
    ['Models used', (r.models_used || []).join(', ')],
    ['Date / time', r.timestamp ? new Date(r.timestamp).toLocaleString() : new Date().toLocaleString()],
  ]
  y += 4
  meta.forEach(([k, v]) => {
    ensure(16)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(90, 100, 120); doc.text(k, M, y)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(30, 40, 60)
    const lines = doc.splitTextToSize(String(v), W - 2 * M - 120)
    lines.forEach((ln, i) => { doc.text(ln, M + 120, y + i * 13) })
    y += 13 * lines.length + 4
  })

  heading('Detected indicators')
  ;(r.indicators || []).forEach((ind) => {
    ensure(34)
    const sc = ind.severity === 'high' ? COLORS.High : ind.severity === 'medium' ? COLORS.Medium : ind.severity === 'safe' ? COLORS.Low : [120, 130, 200]
    doc.setFillColor(...sc); doc.circle(M + 4, y - 3, 3.5, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(30, 40, 60)
    doc.text(`${ind.title}  [${ind.severity}]`, M + 16, y); y += 13
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(90, 100, 120)
    doc.splitTextToSize(ind.detail, W - 2 * M - 16).forEach((ln) => { ensure(12); doc.text(ln, M + 16, y); y += 12 })
    y += 6
  })

  const contribs = r.feature_contributions || r.term_contributions
  if (contribs?.length) {
    heading(r.analysis_type === 'URL' ? 'Model explanation: feature contributions (log-odds)' : 'Model explanation: influential terms (log-odds)', 120)
    const maxAbs = Math.max(...contribs.map((x) => Math.abs(x.contribution)), 0.01)
    const mid = M + 260, half = (W - M - mid - 50)
    contribs.slice(0, 10).forEach((x) => {
      ensure(18)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(50, 60, 80)
      const label = x.label ? `${x.label} = ${x.value}` : `"${prettyTerm(x.term)}"`
      doc.text(doc.splitTextToSize(label, 240)[0], M, y)
      const w = (Math.abs(x.contribution) / maxAbs) * half
      if (x.contribution > 0) { doc.setFillColor(...COLORS.High); doc.rect(mid, y - 8, w, 9, 'F') }
      else { doc.setFillColor(...COLORS.Low); doc.rect(mid - w, y - 8, w, 9, 'F') }
      doc.setDrawColor(200, 205, 220); doc.line(mid, y - 11, mid, y + 3)
      doc.setTextColor(90, 100, 120); doc.text((x.contribution > 0 ? '+' : '') + x.contribution.toFixed(2), W - M, y, { align: 'right' })
      y += 17
    })
    para('Positive values pushed the model towards "phishing"; negative values towards "legitimate".', 8.5, [130, 140, 160])
  }

  heading('Recommendations')
  ;(r.recommendations || []).forEach((t, i) => para(`${i + 1}.  ${t}`, 10, [30, 40, 60]))

  // Footer on every page
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p)
    doc.setFontSize(8); doc.setTextColor(140, 150, 170); doc.setFont('helvetica', 'normal')
    doc.text('PhishGuard AI · Machine-learning predictions are advisory and not a guarantee of safety.', M, H - 28)
    doc.text(`Page ${p} of ${pages}`, W - M, H - 28, { align: 'right' })
  }
  doc.save(`phishguard-report-${(r._id || Date.now()).toString().slice(-8)}.pdf`)
}
