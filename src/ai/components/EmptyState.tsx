import { Typography } from 'antd'
import {
  InboxOutlined,
  FileTextOutlined,
  CodeOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons'
import type { ReactNode } from 'react'

type EmptyType = 'no-tasks' | 'no-reports' | 'no-logs' | 'no-project'

interface EmptyStateProps {
  type: EmptyType
  description?: string
  action?: ReactNode
}

const CONFIG: Record<EmptyType, { icon: typeof InboxOutlined; text: string }> = {
  'no-tasks': { icon: InboxOutlined, text: '暂无任务' },
  'no-reports': { icon: FileTextOutlined, text: '暂无报告' },
  'no-logs': { icon: CodeOutlined, text: '暂无日志' },
  'no-project': { icon: FolderOpenOutlined, text: '请先选择项目' },
}

export default function EmptyState({ type, description, action }: EmptyStateProps) {
  const config = CONFIG[type]
  const Icon = config.icon

  return (
    <div style={{ textAlign: 'center', padding: '48px 24px' }}>
      <Icon style={{ fontSize: 48, color: 'var(--ai-color-status-pending)', opacity: 0.4, marginBottom: 16 }} />
      <Typography.Text
        type="secondary"
        style={{ display: 'block', fontSize: 14, marginBottom: description ? 4 : 16 }}
      >
        {description || config.text}
      </Typography.Text>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}
