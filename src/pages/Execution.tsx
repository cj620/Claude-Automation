import { useEffect, useRef, useState } from 'react'
import { Button, Space, Card, List, Typography, Progress } from 'antd'
import { PlayCircleOutlined, StopOutlined, ClearOutlined } from '@ant-design/icons'
import { useRunnerStore } from '../stores/runner-store'
import { useTaskStore } from '../stores/task-store'

export default function Execution(): React.ReactElement {
  const { isRunning, logs, currentTask, start, stop, clearLogs, initEventListener } = useRunnerStore()
  const { tasks, fetchTasks } = useTaskStore()
  const logEndRef = useRef<HTMLDivElement>(null)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)

  useEffect(() => {
    fetchTasks()
    const unsubscribe = initEventListener()
    return unsubscribe
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const pendingCount = tasks.filter(t => t.status === 'pending').length
  const doneCount = tasks.filter(t => t.status === 'done').length
  const totalCount = tasks.length

  const filteredLogs = selectedTask
    ? logs.filter(l => l.taskName === selectedTask)
    : logs

  const taskNames = [...new Set(logs.map(l => l.taskName))]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
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
        <Button icon={<ClearOutlined />} onClick={clearLogs}>清除日志</Button>
        {isRunning && currentTask && (
          <Typography.Text type="secondary">正在执行: {currentTask}</Typography.Text>
        )}
      </Space>

      {totalCount > 0 && (
        <Progress
          percent={totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}
          format={() => `${doneCount}/${totalCount}`}
          style={{ marginBottom: 16 }}
        />
      )}

      <div style={{ display: 'flex', gap: 16 }}>
        <Card title="任务" style={{ width: 200, flexShrink: 0 }}>
          <List
            size="small"
            dataSource={taskNames}
            renderItem={name => (
              <List.Item
                onClick={() => setSelectedTask(selectedTask === name ? null : name)}
                style={{
                  cursor: 'pointer',
                  background: selectedTask === name ? '#e6f7ff' : undefined
                }}
              >
                <Typography.Text ellipsis>{name}</Typography.Text>
              </List.Item>
            )}
          />
        </Card>

        <Card
          title={selectedTask ? `日志: ${selectedTask}` : '全部日志'}
          style={{ flex: 1 }}
          styles={{
            body: {
              background: '#1e1e1e',
              color: '#d4d4d4',
              fontFamily: 'Consolas, Monaco, monospace',
              fontSize: 13,
              padding: 16,
              maxHeight: 'calc(100vh - 320px)',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all'
            }
          }}
        >
          {filteredLogs.length === 0 ? (
            <span style={{ color: '#666' }}>等待执行...</span>
          ) : (
            filteredLogs.map((log, i) => <div key={i}>{log.line}</div>)
          )}
          <div ref={logEndRef} />
        </Card>
      </div>
    </div>
  )
}
