import { Table, Button, Space, Popconfirm } from 'antd'
import { EditOutlined, DeleteOutlined, ReloadOutlined, CopyOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import StatusBadge from '../components/StatusBadge'
import EmptyState from '../components/EmptyState'
import { type TaskStatus } from '../constants'

interface Task {
  id: string
  name: string
  status: TaskStatus
  updatedAt: string
}

interface TaskListProps {
  tasks: Task[]
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  onRetry?: (id: string) => void
  onDuplicate?: (id: string) => void
}

export default function TaskList({ tasks, onEdit, onDelete, onRetry, onDuplicate }: TaskListProps) {
  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: Task) => (
        <a onClick={() => onEdit?.(record.id)} style={{ cursor: 'pointer' }}>
          {name}
        </a>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: TaskStatus) => <StatusBadge status={status} />,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (value: string) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: Task) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => onEdit?.(record.id)}
          />
          {record.status === 'failed' && (
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => onRetry?.(record.id)}
              title="重试"
            />
          )}
          {record.status === 'done' && (
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => onDuplicate?.(record.id)}
              title="再次执行"
            />
          )}
          <Popconfirm
            title="确认删除"
            description="确定要删除这个任务吗？"
            onConfirm={() => onDelete?.(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  if (tasks.length === 0) {
    return <EmptyState type="no-tasks" description="暂无任务" />
  }

  return (
    <Table
      columns={columns}
      dataSource={tasks}
      rowKey="id"
      size="small"
      pagination={false}
    />
  )
}
