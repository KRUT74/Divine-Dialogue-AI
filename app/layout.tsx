import type { Metadata, Viewport } from "next"
import { EB_Garamond, Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const garamond = EB_Garamond({ subsets: ["latin"], variable: "--font-garamond" })

export const metadata: Metadata = {
  title: "Divine Dialogue",
  description:
    "An AI guide to six world traditions: daily blessings, questions answered with care, and scripture explained.",
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${garamond.variable}`}>
      <body>{children}</body>
    </html>
  )
}
