import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SocketProvider } from "@/lib/socket-provider"
import { LanguageProvider } from "@/contexts/LanguageContext"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "API Monitoring Dashboard",
  description: "Real-time observability dashboard for monitoring API performance",
  generator: 'v0.dev',
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'API Monitor'
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' }
    ]
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <LanguageProvider>
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <SocketProvider>{children}</SocketProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}



import './globals.css'