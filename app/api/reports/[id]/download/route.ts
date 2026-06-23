import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

/**
 * Build a minimal but fully standards-compliant PDF 1.4 document.
 * All byte offsets in the xref table are computed from the actual Buffer sizes
 * so every PDF reader (Preview, Acrobat, Chrome, Edge) can open it without errors.
 */
function buildMockPDF(reportId: string): Buffer {
  const lines: string[] = []
  lines.push(`API Observability Dashboard — Mock Report`)
  lines.push(`Report ID : ${reportId}`)
  lines.push(`Generated : ${new Date().toLocaleString()}`)
  lines.push(`Mode      : Mock (no live backend connected)`)
  lines.push(``)
  lines.push(`======================================================`)
  lines.push(`This is a sample PDF report generated in mock mode.`)
  lines.push(`Connect a live backend to download real report data.`)
  lines.push(`======================================================`)
  lines.push(``)
  lines.push(`Sections included in live reports:`)
  lines.push(`  • Executive Summary`)
  lines.push(`  • Performance Metrics (P95 / P99 latency)`)
  lines.push(`  • Error Analysis`)
  lines.push(`  • Service Availability / SLA Compliance`)
  lines.push(`  • Recommendations`)
  lines.push(``)

  const text = lines.join("\n")

  // Build PDF content stream (BT … ET block)
  const streamLines: string[] = ["BT", "/F1 10 Tf", "12 TL", "50 780 Td"]
  text.split("\n").forEach((line) => {
    const escaped = line
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
    streamLines.push(`(${escaped}) Tj T*`)
  })
  streamLines.push("ET")
  const stream = streamLines.join("\n")
  const streamLen = Buffer.byteLength(stream, "latin1")

  // Build PDF objects
  const hdr   = `%PDF-1.4\n`
  const obj1  = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`
  const obj2  = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n`
  const obj3  = `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /MediaBox [0 0 595 842] /Contents 4 0 R >>\nendobj\n`
  const obj4  = `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}\nendstream\nendobj\n`

  const off1 = Buffer.byteLength(hdr, "latin1")
  const off2 = off1 + Buffer.byteLength(obj1, "latin1")
  const off3 = off2 + Buffer.byteLength(obj2, "latin1")
  const off4 = off3 + Buffer.byteLength(obj3, "latin1")
  const startXref = off4 + Buffer.byteLength(obj4, "latin1")

  const pad = (n: number) => String(n).padStart(10, "0")
  const xref =
    `xref\n0 5\n` +
    `0000000000 65535 f \n` +
    `${pad(off1)} 00000 n \n` +
    `${pad(off2)} 00000 n \n` +
    `${pad(off3)} 00000 n \n` +
    `${pad(off4)} 00000 n \n` +
    `trailer\n<< /Size 5 /Root 1 0 R >>\n` +
    `startxref\n${startXref}\n%%EOF\n`

  return Buffer.concat([
    Buffer.from(hdr,  "latin1"),
    Buffer.from(obj1, "latin1"),
    Buffer.from(obj2, "latin1"),
    Buffer.from(obj3, "latin1"),
    Buffer.from(obj4, "latin1"),
    Buffer.from(xref, "latin1"),
  ])
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // Try live backend first; fall through to mock PDF on 404
  const proxied = await proxyRequest(request, `/api/reports/${id}/download`, { fallbackOn404: true })
  if (proxied) return proxied

  // Mock fallback: return a real, openable PDF
  const pdf = buildMockPDF(id)
  return new Response(pdf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report-${id}.pdf"`,
      "Content-Length": String(pdf.length),
      "Cache-Control": "no-store",
    },
  })
}
