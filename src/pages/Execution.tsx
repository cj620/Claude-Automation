import { useEffect, useState } from 'react'
import { Button, Select, Progress } from 'antd'
import { PlayCircleOutlined, StopOutlined, ClearOutlined } from '@ant-design/icons'
import { useRunnerStore } from '../stores/runner-store'
import { useTaskStore } from '../stores/task-store'
import { useProjectStore } from '../stores/project-store'
import { PageHeader, LogViewer, EmptyState } from '../ai/components'

export default function Execution(): React.ReactElement {
  const { isRunning, logs, currentTask, start, stop, clearLogs } = useRunnerStore()
  const { tasks, fetchTasks } = useTaskStore()
  const { activeProject } = useProjectStore()
  const [selectedTask, setSelectedTask] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks()
  }, [activeProject])

  const pendingCount = tasks.filter((t) => t.status === 'pending').length
  const doneCount = tasks.filter((t) => t.status === 'done').length
  const totalCount = tasks.length

  const filteredLogs = selectedTask ? logs.filter((l) => l.taskName === selectedTask) : logs
  const taskNames = [...new Set(logs.map((l) => l.taskName))]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <PageHeader
        title="执行"
        subtitle={isRunning && currentTask ? `正在执行: ${currentTask}` : undefined}
        actions={
          <>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={start}
              disabled={isRunning || pendingCount === 0}
            >
              开始执行
            </Button>
            <Button danger icon={<StopOutlined />} onClick={stop} disabled={!isRunning}>
              停止
            </Button>
            <Button icon={<ClearOutlined />} onClick={clearLogs}>
              清除日志
            </Button>
          </>
        }
      />

      {totalCount > 0 && (
        <Progress
          percent={totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}
          format={() => `${doneCount}/${totalCount}`}
          style={{ marginBottom: 16 }}
          strokeColor="#00E5CC"
        />
      )}

      <Select
        value={selectedTask || 'all'}
        onChange={(value) => setSelectedTask(value === 'all' ? null : value)}
        options={[
          { value: 'all', label: `全部 (${logs.length})` },
          ...taskNames.map((name) => ({
            value: name,
            label: `${name} (${logs.filter((l) => l.taskName === name).length})`,
          })),
        ]}
        style={{ width: 260, marginBottom: 16, minHeight: 32 }}
        placeholder="筛选任务"
        showSearch
      />

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {taskNames.length === 0 ? (
          <EmptyState type="no-logs" description="暂无执行记录" />
        ) : (
          <LogViewer
            logs={filteredLogs}
            loading={isRunning}
            style={{ flex: 1, minHeight: 0, maxHeight: 'none' }}
          />
        )}
      </div>
    </div>
  )
}
