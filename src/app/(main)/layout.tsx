import { ClientHeader } from "@/components/layout/client-header"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div style={{ flexShrink: 0 }}>
        <ClientHeader />
      </div>
      <main style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
