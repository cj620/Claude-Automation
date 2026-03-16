import {
  ClockCircleOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed'

export interface StatusConfig {
  label: string
  labelZh: string
  cssVar: string
  icon: typeof ClockCircleOutlined
  antdTagColor: string
}

export const TASK_STATUSES: TaskStatus[] = ['pending', 'running', 'done', 'failed']

export const STATUS_MAP: Record<TaskStatus, StatusConfig> = {
  pending: {
    label: 'Pending',
    labelZh: '待执行',
    cssVar: '--ai-color-status-pending',
    icon: ClockCircleOutlined,
    antdTagColor: 'default',
  },
  running: {
    label: 'Running',
    labelZh: '执行中',
    cssVar: '--ai-color-status-running',
    icon: SyncOutlined,
    antdTagColor: 'processing',
  },
  done: {
    label: 'Done',
    labelZh: '已完成',
    cssVar: '--ai-color-status-done',
    icon: CheckCircleOutlined,
    antdTagColor: 'success',
  },
  failed: {
    label: 'Failed',
    labelZh: '失败',
    cssVar: '--ai-color-status-failed',
    icon: CloseCircleOutlined,
    antdTagColor: 'error',
  },
}
