import { NextResponse } from "next/server"
import { proxyRequest } from "@/lib/api-proxy"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const proxied = await proxyRequest(request, "/api/indian/holidays")
  if (proxied) return proxied

  // Standalone Fallback
  const currentYear = new Date().getFullYear()
  const holidays = [
    { name: "Republic Day", date: `${currentYear}-01-26`, type: "National" },
    { name: "Independence Day", date: `${currentYear}-08-15`, type: "National" },
    { name: "Gandhi Jayanti", date: `${currentYear}-10-02`, type: "National" },
    { name: "Diwali", date: `${currentYear}-11-12`, type: "Religious" },
    { name: "Holi", date: `${currentYear}-03-25`, type: "Religious" },
    { name: "Eid al-Fitr", date: `${currentYear}-04-10`, type: "Religious" },
    { name: "Christmas", date: `${currentYear}-12-25`, type: "Religious" },
    { name: "Durga Puja", date: `${currentYear}-10-20`, type: "Religious" },
    { name: "Ganesh Chaturthi", date: `${currentYear}-09-07`, type: "Religious" },
    { name: "Pongal", date: `${currentYear}-01-14`, type: "Regional", region: "South" },
    { name: "Bihu", date: `${currentYear}-04-15`, type: "Regional", region: "East" },
    { name: "Onam", date: `${currentYear}-08-20`, type: "Regional", region: "South" }
  ]
  const dateStr = new Date().toISOString().split("T")[0]
  const todayHoliday = holidays.find((h) => h.date === dateStr) || null

  return NextResponse.json({ holidays, todayHoliday })
}
