import { Card, Typography } from 'antd'
import type { ReactNode } from 'react'
import type { TaskStatus } from '../constants'

interface StatCardProps {
  title: string
  value: number
  icon: ReactNode
  status?: TaskStatus
  onClick?: () => void
}

const statusColorVar: Record<string, string> = {
  pending: '--ai-color-status-pending',
  running: '--ai-color-status-running',
  done: '--ai-color-status-done',
  failed: '--ai-color-status-failed',
}

export default function StatCard({ title, value, icon, status, onClick }: StatCardProps) {
  const accentVar = status ? statusColorVar[status] : '--ai-color-status-running'

  return (
    <Card
      className="ai-glow-hover"
      hoverable={!!onClick}
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderColor: 'var(--ai-color-glow)',
        transition: 'all 0.25s ease',
      }}
      styles={{ body: { padding: '20px 24px' } }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Typography.Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
            {title}
          </Typography.Text>
          <Typography.Text
            strong
            style={{
              fontSize: 28,
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
              color: value > 0 ? `var(${accentVar})` : undefined,
            }}
          >
            {value}
          </Typography.Text>
        </div>
        <span style={{ fontSize: 24, color: `var(${accentVar})`, opacity: 0.6 }}>
          {icon}
        </span>
      </div>
    </Card>
  )
}
