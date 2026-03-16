import { useEffect } from 'react'
import { Card, Col, Row, Statistic, List, Tag, Button, Space, Empty } from 'antd'
import {
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  PlusOutlined,
  PlayCircleOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '../stores/task-store'
import { useRunnerStore } from '../stores/runner-store'

const STATUS_CONFIG = {
  pending: { color: 'default', label: 'Pending' },
  running: { color: 'processing', label: 'Running' },
  done: { color: 'success', label: 'Done' },
  failed: { color: 'error', label: 'Failed' }
} as const

export default function Dashboard(): React.ReactElement {
  const navigate = useNavigate()
  const { tasks, fetchTasks } = useTaskStore()
  const { start, isRunning } = useRunnerStore()

  useEffect(() => {
    fetchTasks()
  }, [])

  const counts = {
    pending: tasks.filter(t => t.status === 'pending').length,
    running: tasks.filter(t => t.status === 'running').length,
    done: tasks.filter(t => t.status === 'done').length,
    failed: tasks.filter(t => t.status === 'failed').length
  }

  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card><Statistic title="Pending" value={counts.pending} prefix={<ClockCircleOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Running" value={counts.running} prefix={<SyncOutlined />} valueStyle={{ color: '#1890ff' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Done" value={counts.done} prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={6}>
          <Card><Statistic title="Failed" value={counts.failed} prefix={<CloseCircleOutlined />} valueStyle={{ color: '#ff4d4f' }} /></Card>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tasks/new')}>
          新建任务
        </Button>
        <Button
          icon={<PlayCircleOutlined />}
          onClick={start}
          disabled={isRunning || counts.pending === 0}
          loading={isRunning}
        >
          {isRunning ? '执行中...' : '开始执行'}
        </Button>
      </Space>

      <Card title="最近任务">
        {recentTasks.length === 0 ? (
          <Empty description="暂无任务" />
        ) : (
          <List
            dataSource={recentTasks}
            renderItem={(task) => (
              <List.Item>
                <List.Item.Meta title={task.name} description={task.id} />
                <Tag color={STATUS_CONFIG[task.status].color}>{STATUS_CONFIG[task.status].label}</Tag>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  )
}
