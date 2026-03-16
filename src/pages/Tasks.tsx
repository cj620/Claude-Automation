import { useEffect } from 'react'
import { Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '../stores/task-store'
import { PageHeader } from '../ai/components'
import { KanbanBoard } from '../ai/patterns'

const COLUMNS = [
  { status: 'pending' as const, title: 'Pending' },
  { status: 'running' as const, title: 'Running' },
  { status: 'done' as const, title: 'Done' },
  { status: 'failed' as const, title: 'Failed' },
]

export default function Tasks(): React.ReactElement {
  const navigate = useNavigate()
  const { tasks, fetchTasks, deleteTask, retryTask } = useTaskStore()

  useEffect(() => {
    fetchTasks()
  }, [])

  return (
    <div>
      <PageHeader
        title="任务"
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tasks/new')}>
            新建任务
          </Button>
        }
      />

      <KanbanBoard
        columns={COLUMNS}
        tasks={tasks}
        onEdit={(id) => navigate(`/tasks/${id}/edit`)}
        onDelete={(id) => deleteTask(id)}
        onRetry={(id) => retryTask(id)}
      />
    </div>
  )
}
