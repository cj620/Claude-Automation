import { useEffect, useState } from 'react'
import { Button, Tabs } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '../stores/task-store'
import { useProjectStore } from '../stores/project-store'
import { PageHeader } from '../ai/components'
import { TaskList } from '../ai/patterns'
import { TASK_STATUSES } from '../ai/constants'

export default function Tasks(): React.ReactElement {
  const navigate = useNavigate()
  const { tasks, fetchTasks, deleteTask, retryTask } = useTaskStore()
  const { activeProject } = useProjectStore()
  const [activeTab, setActiveTab] = useState<string>('all')

  useEffect(() => {
    fetchTasks()
  }, [activeProject])

  // 按状态统计任务数量
  const taskCounts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    running: tasks.filter((t) => t.status === 'running').length,
    done: tasks.filter((t) => t.status === 'done').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
  }

  // 根据当前 tab 过滤任务
  const filteredTasks =
    activeTab === 'all'
      ? tasks
      : tasks.filter((t) => t.status === activeTab)

  const tabItems = [
    { key: 'all', label: `全部 (${taskCounts.all})` },
    ...TASK_STATUSES.map((status) => ({
      key: status,
      label: `${status.charAt(0).toUpperCase() + status.slice(1)} (${taskCounts[status]})`,
    })),
  ]

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

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 16 }}
      />

      <TaskList
        tasks={filteredTasks}
        onEdit={(id) => navigate(`/tasks/${id}/edit`)}
        onDelete={(id) => deleteTask(id)}
        onRetry={(id) => retryTask(id)}
        onDuplicate={(id) => navigate(`/tasks/new?source=${id}`)}
      />
    </div>
  )
}
