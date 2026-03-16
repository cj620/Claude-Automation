import { useEffect, useState } from 'react'
import { Button, List, Typography, Progress, Card } from 'antd'
import { PlayCircleOutlined, StopOutlined, ClearOutlined } from '@ant-design/icons'
import { useRunnerStore } from '../stores/runner-store'
import { useTaskStore } from '../stores/task-store'
import { useProjectStore } from '../stores/project-store'
import { PageHeader, LogViewer, StatusBadge, EmptyState } from '../ai/components'
import { MasterDetail } from '../ai/layouts'

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
    <div>
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

      <MasterDetail
        sidebarTitle="任务"
        sidebarWidth={200}
        sidebar={
          taskNames.length === 0 ? (
            <EmptyState type="no-logs" description="暂无执行记录" />
          ) : (
            <List
              size="small"
              dataSource={taskNames}
              renderItem={(name) => (
                <List.Item
                  onClick={() => setSelectedTask(selectedTask === name ? null : name)}
                  style={{
                    cursor: 'pointer',
                    background: selectedTask === name ? 'var(--ai-color-glow)' : undefined,
                    padding: '8px 12px',
                    borderRadius: 4,
                    transition: 'background 0.2s',
                  }}
                >
                  <Typography.Text ellipsis>{name}</Typography.Text>
                </List.Item>
              )}
            />
          )
        }
        contentTitle={selectedTask ? `日志: ${selectedTask}` : '全部日志'}
        content={<LogViewer logs={filteredLogs} loading={isRunning} />}
      />
    </div>
  )
}
