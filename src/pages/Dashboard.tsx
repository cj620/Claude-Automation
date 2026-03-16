import { useEffect } from 'react'
import { Card, Button } from 'antd'
import {
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '../stores/task-store'
import { useRunnerStore } from '../stores/runner-store'
import { PageHeader, StatCard, TaskCard, EmptyState } from '../ai/components'

export default function Dashboard(): React.ReactElement {
  const navigate = useNavigate()
  const { tasks, fetchTasks } = useTaskStore()
  const { start, isRunning } = useRunnerStore()

  useEffect(() => {
    fetchTasks()
  }, [])

  const counts = {
    pending: tasks.filter((t) => t.status === 'pending').length,
    running: tasks.filter((t) => t.status === 'running').length,
    done: tasks.filter((t) => t.status === 'done').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
  }

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return (
    <div>
      <PageHeader
        title="概览"
        actions={
          <>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tasks/new')}>
              新建任务
            </Button>
            <Button
              icon={<PlayCircleOutlined />}
              onClick={async () => {
                await start()
                navigate('/execution')
              }}
              disabled={isRunning || counts.pending === 0}
              loading={isRunning}
            >
              {isRunning ? '执行中...' : '开始执行'}
            </Button>
          </>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard title="待执行" value={counts.pending} icon={<ClockCircleOutlined />} status="pending" />
        <StatCard title="执行中" value={counts.running} icon={<SyncOutlined />} status="running" />
        <StatCard title="已完成" value={counts.done} icon={<CheckCircleOutlined />} status="done" />
        <StatCard title="已失败" value={counts.failed} icon={<CloseCircleOutlined />} status="failed" />
      </div>

      <Card title="最近任务">
        {recentTasks.length === 0 ? (
          <EmptyState
            type="no-tasks"
            action={
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tasks/new')}>
                创建第一个任务
              </Button>
            }
          />
        ) : (
          <div>
            {recentTasks.map((task, i) => (
              <div key={task.id} className="ai-stagger-item" style={{ animationDelay: `${i * 60}ms` }}>
                <TaskCard
                  task={task}
                  onEdit={task.status === 'pending' ? () => navigate(`/tasks/${task.id}/edit`) : undefined}
                />
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
