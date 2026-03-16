import { Card, Typography, Popconfirm } from 'antd'
import { EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import StatusBadge from './StatusBadge'
import type { TaskStatus } from '../constants'

interface Task {
  id: string
  name: string
  status: TaskStatus
  updatedAt: string
}

interface TaskCardProps {
  task: Task
  onEdit?: () => void
  onDelete?: () => void
  onRetry?: () => void
}

export default function TaskCard({ task, onEdit, onDelete, onRetry }: TaskCardProps) {
  const actions: React.ReactNode[] = []

  if (task.status === 'pending' && onEdit) {
    actions.push(<EditOutlined key="edit" onClick={onEdit} />)
  }
  if (task.status === 'failed' && onRetry) {
    actions.push(<ReloadOutlined key="retry" onClick={onRetry} />)
  }
  if (task.status !== 'running' && onDelete) {
    actions.push(
      <Popconfirm key="delete" title="确认删除此任务？" onConfirm={onDelete}>
        <DeleteOutlined />
      </Popconfirm>
    )
  }

  return (
    <Card
      size="small"
      className="ai-glow-hover"
      actions={actions.length > 0 ? actions : undefined}
      style={{ marginBottom: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <StatusBadge status={task.status} size="small" />
        <Typography.Text strong ellipsis style={{ flex: 1 }}>
          {task.name}
        </Typography.Text>
      </div>
      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
        {task.id.slice(0, 8)}
        <span style={{ margin: '0 6px', opacity: 0.3 }}>|</span>
        {new Date(task.updatedAt).toLocaleDateString()}
      </Typography.Text>
    </Card>
  )
}
