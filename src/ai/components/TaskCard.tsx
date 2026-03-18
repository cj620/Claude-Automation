import { Card, Typography, Popconfirm, Button, Space } from 'antd'
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
  return (
    <Card
      size="small"
      className="ai-glow-hover"
      style={{ marginBottom: 8 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
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
        </div>
        <Space size={4}>
          {task.status === 'pending' && onEdit && (
            <Button type="text" size="small" icon={<EditOutlined />} onClick={onEdit} />
          )}
          {task.status === 'failed' && onRetry && (
            <Button type="text" size="small" icon={<ReloadOutlined />} onClick={onRetry} />
          )}
          {task.status !== 'running' && onDelete && (
            <Popconfirm title="确认删除此任务？" onConfirm={onDelete}>
              <Button type="text" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      </div>
    </Card>
  )
}
