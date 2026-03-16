import { Card, Tag } from 'antd'
import StatusBadge from '../components/StatusBadge'
import TaskCard from '../components/TaskCard'
import EmptyState from '../components/EmptyState'
import { type TaskStatus, STATUS_MAP } from '../constants'

interface Task {
  id: string
  name: string
  status: TaskStatus
  updatedAt: string
}

interface KanbanColumn {
  status: TaskStatus
  title: string
}

interface KanbanBoardProps {
  columns: KanbanColumn[]
  tasks: Task[]
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onRetry?: (id: string) => void
}

export default function KanbanBoard({ columns, tasks, onEdit, onDelete, onRetry }: KanbanBoardProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
        gap: 16,
      }}
    >
      {columns.map((col) => {
        const columnTasks = tasks.filter((t) => t.status === col.status)
        return (
          <Card
            key={col.status}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <StatusBadge status={col.status} />
                <span>{col.title}</span>
                <Tag style={{ marginLeft: 'auto' }}>{columnTasks.length}</Tag>
              </div>
            }
            styles={{
              body: {
                padding: 8,
                maxHeight: 'calc(100vh - 280px)',
                overflow: 'auto',
              },
            }}
          >
            {columnTasks.length === 0 ? (
              <EmptyState type="no-tasks" description="无任务" />
            ) : (
              columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEdit ? () => onEdit(task.id) : undefined}
                  onDelete={onDelete ? () => onDelete(task.id) : undefined}
                  onRetry={onRetry ? () => onRetry(task.id) : undefined}
                />
              ))
            )}
          </Card>
        )
      })}
    </div>
  )
}
