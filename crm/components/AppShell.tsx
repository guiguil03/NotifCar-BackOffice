'use client'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthPage = pathname === '/login' || pathname.startsWith('/invoices/') && pathname.endsWith('/print')

  if (isAuthPage) {
    return <>{children}</>
  }

  return (
    <div className="crm-layout">
      <Sidebar />
      <div className="main">
        {children}
      </div>
    </div>
  )
}
