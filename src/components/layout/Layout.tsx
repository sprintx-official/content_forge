import type { ReactNode } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div
      className="flex min-h-screen flex-col bg-[#0a0e1a] text-[#f9fafb]"
      style={{
        backgroundImage: `
          radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '32px 32px',
      }}
    >
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pt-20 pb-12 sm:px-6 lg:px-8">
        {children}
      </main>

      <Footer />
    </div>
  )
}
