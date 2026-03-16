import { useEffect } from 'react'
import { Card, Col, Row, Tag, Button, Space, Popconfirm, Empty, Typography } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTaskStore } from '../stores/task-store'

const COLUMNS = [
  { status: 'pending' as const, title: 'Pending', color: '#d9d9d9' },
  { status: 'running' as const, title: 'Running', color: '#1890ff' },
  { status: 'done' as const, title: 'Done', color: '#52c41a' },
  { status: 'failed' as const, title: 'Failed', color: '#ff4d4f' }
]

export default function Tasks(): React.ReactElement {
  const navigate = useNavigate()
  const { tasks, fetchTasks, deleteTask, retryTask } = useTaskStore()

  useEffect(() => {
    fetchTasks()
  }, [])

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/tasks/new')}>
          新建任务
        </Button>
      </Space>

      <Row gutter={16}>
        {COLUMNS.map(col => {
          const columnTasks = tasks.filter(t => t.status === col.status)
          return (
            <Col span={6} key={col.status}>
              <Card
                title={
                  <Space>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                    {col.title}
                    <Tag>{columnTasks.length}</Tag>
                  </Space>
                }
                styles={{ body: { padding: 8, maxHeight: 'calc(100vh - 280px)', overflow: 'auto' } }}
              >
                {columnTasks.length === 0 ? (
                  <Empty description="无任务" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  columnTasks.map(task => (
                    <Card
                      key={task.id}
                      size="small"
                      style={{ marginBottom: 8 }}
                      actions={[
                        ...(col.status === 'pending' ? [
                          <EditOutlined key="edit" onClick={() => navigate(`/tasks/${task.id}/edit`)} />
                        ] : []),
                        ...(col.status === 'failed' ? [
                          <ReloadOutlined key="retry" onClick={() => retryTask(task.id)} />
                        ] : []),
                        ...(col.status !== 'running' ? [
                          <Popconfirm
                            key="delete"
                            title="确认删除此任务？"
                            onConfirm={() => deleteTask(task.id)}
                          >
                            <DeleteOutlined />
                          </Popconfirm>
                        ] : [])
                      ]}
                    >
                      <Typography.Text strong ellipsis>{task.name}</Typography.Text>
                      <br />
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {task.id}
                      </Typography.Text>
                    </Card>
                  ))
                )}
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}
