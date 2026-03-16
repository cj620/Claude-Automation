import { Card } from 'antd'
import type { ReactNode } from 'react'

interface MasterDetailProps {
  sidebar: ReactNode
  sidebarTitle?: string
  sidebarWidth?: number
  content: ReactNode
  contentTitle?: string
}

export default function MasterDetail({
  sidebar,
  sidebarTitle,
  sidebarWidth = 240,
  content,
  contentTitle,
}: MasterDetailProps) {
  return (
    <div style={{ display: 'flex', gap: 16, minHeight: 0 }}>
      <Card
        title={sidebarTitle}
        style={{ width: sidebarWidth, flexShrink: 0 }}
        styles={{ body: { padding: 8, maxHeight: 'calc(100vh - 260px)', overflow: 'auto' } }}
      >
        {sidebar}
      </Card>
      <Card
        title={contentTitle}
        style={{ flex: 1, minWidth: 0 }}
        styles={{ body: { padding: 0 } }}
      >
        {content}
      </Card>
    </div>
  )
}
