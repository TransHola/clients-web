import { ClientHeader } from '@/components/layout/client-header'
import { PortalAccessGuard } from '@/components/layout/portal-access-guard'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div style={{ flexShrink: 0 }}>
        <ClientHeader />
      </div>
      <main style={{ flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
        <PortalAccessGuard>{children}</PortalAccessGuard>
      </main>
    </div>
  )
}
