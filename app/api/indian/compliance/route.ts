import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const proxied = await proxyRequest(request, "/api/indian/compliance")
  if (proxied) return proxied

  // Standalone Fallback
  return NextResponse.json({
    dataLocalization: "DPDP Act 2023 - Certain personal and financial logs must reside within Indian borders",
    auditRequirements: "Annual system audits mandatory for NPCI (UPI) and RBI regulated payment systems",
    privacyLaws: "Information Technology Act 2000 & Digital Personal Data Protection Act 2023 compliance",
    securityStandards: "CERT-In mandatory reporting within 6 hours for critical cyber security incidents",
    reporting: "Quarterly availability and performance reports required for public-facing fintech endpoints"
  })
}
