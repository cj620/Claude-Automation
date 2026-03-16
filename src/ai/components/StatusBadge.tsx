import { Typography } from 'antd'
import { STATUS_MAP, type TaskStatus } from '../constants'

interface StatusBadgeProps {
  status: TaskStatus
  size?: 'small' | 'default'
  showLabel?: boolean
}

export default function StatusBadge({ status, size = 'default', showLabel = false }: StatusBadgeProps) {
  const config = STATUS_MAP[status]
  const dotSize = size === 'small' ? 6 : 8
  const isRunning = status === 'running'

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: size === 'small' ? 4 : 6 }}>
      <span
        className={isRunning ? 'ai-dot-glow' : undefined}
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          background: `var(${config.cssVar})`,
          flexShrink: 0,
        }}
      />
      {showLabel && (
        <Typography.Text
          style={{
            fontSize: size === 'small' ? 11 : 12,
            color: `var(${config.cssVar})`,
            lineHeight: 1,
          }}
        >
          {config.label}
        </Typography.Text>
      )}
    </span>
  )
}
