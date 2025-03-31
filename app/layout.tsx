import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SocketProvider } from "@/lib/socket-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "API Monitoring Dashboard",
  description: "Real-time observability dashboard for monitoring API performance",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <SocketProvider>{children}</SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}



import './globals.css'