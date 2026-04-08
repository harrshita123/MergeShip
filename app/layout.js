import './globals.css'
import { Inter, Outfit } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

export const metadata = {
  title: 'MergeShip — Level Up Your Open Source Journey',
  description:
    'MergeShip turns open source into a skill-building RPG. Gamified issues, XP, achievements, and community for contributors and maintainers.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} dark`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);',
          }}
        />
      </head>
      <body className="min-h-screen bg-[#060611] text-[#F8F8FF] antialiased">
        {children}
      </body>
    </html>
  )
}
