import { useEffect, useState } from 'react'
import { Button, Switch, Select, TimePicker, InputNumber, Checkbox, Card, List, Popconfirm, Space, Typography, message } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useSchedulerStore } from '../stores/scheduler-store'
import { useProjectStore } from '../stores/project-store'
import { PageHeader, EmptyState } from '../ai/components'

const PRESET_OPTIONS = [
  { value: 'daily', label: '每天' },
  { value: 'interval', label: '每隔 N 小时' },
  { value: 'weekdays', label: '工作日' },
  { value: 'custom', label: '自定义' },
]

const DAY_OPTIONS = [
  { label: '周日', value: 0 },
  { label: '周一', value: 1 },
  { label: '周二', value: 2 },
  { label: '周三', value: 3 },
  { label: '周四', value: 4 },
  { label: '周五', value: 5 },
  { label: '周六', value: 6 },
]

function describePreset(preset: { type: string; hour?: number; minute?: number; hours?: number; days?: number[] }): string {
  const pad = (n: number): string => String(n).padStart(2, '0')
  switch (preset.type) {
    case 'daily':
      return `每天 ${pad(preset.hour ?? 0)}:${pad(preset.minute ?? 0)}`
    case 'interval':
      return `每隔 ${preset.hours ?? 1} 小时`
    case 'weekdays':
      return `工作日 ${pad(preset.hour ?? 0)}:${pad(preset.minute ?? 0)}`
    case 'custom': {
      const dayNames = ['日', '一', '二', '三', '四', '五', '六']
      const days = (preset.days ?? []).map(d => `周${dayNames[d]}`).join('、')
      return `${days} ${pad(preset.hour ?? 0)}:${pad(preset.minute ?? 0)}`
    }
    default:
      return '未知'
  }
}

function formatTime(iso?: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.toLocaleDateString('zh-CN')} ${d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
}

export default function Schedules(): React.ReactElement {
  const { schedules, loading, fetchSchedules, addSchedule, removeSchedule, toggleSchedule } = useSchedulerStore()
  const { activeProject } = useProjectStore()
  const [showForm, setShowForm] = useState(false)
  const [presetType, setPresetType] = useState<string>('daily')
  const [time, setTime] = useState<dayjs.Dayjs>(dayjs().hour(9).minute(0))
  const [intervalHours, setIntervalHours] = useState(4)
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchSchedules()
  }, [activeProject])

  const handleAdd = async (): Promise<void> => {
    let preset: unknown
    let name: string

    switch (presetType) {
      case 'daily':
        preset = { type: 'daily', hour: time.hour(), minute: time.minute() }
        name = `每天 ${time.format('HH:mm')}`
        break
      case 'interval':
        preset = { type: 'interval', hours: intervalHours }
        name = `每隔 ${intervalHours} 小时`
        break
      case 'weekdays':
        preset = { type: 'weekdays', hour: time.hour(), minute: time.minute() }
        name = `工作日 ${time.format('HH:mm')}`
        break
      case 'custom':
        preset = { type: 'custom', days: selectedDays, hour: time.hour(), minute: time.minute() }
        name = `自定义 ${time.format('HH:mm')}`
        break
      default:
        return
    }

    setAdding(true)
    try {
      await addSchedule(name, preset as never)
      message.success('定时计划已添加')
      setShowForm(false)
    } catch (err) {
      console.error('添加定时计划失败:', err)
      message.error(`添加失败: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setAdding(false)
    }
  }

  const enabledCount = schedules.filter(s => s.enabled).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <PageHeader
        title="定时任务"
        subtitle={enabledCount > 0 ? `${enabledCount} 个定时计划运行中` : undefined}
        actions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setShowForm(!showForm)}
          >
            添加定时
          </Button>
        }
      />

      {showForm && (
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Space wrap>
              <Select
                value={presetType}
                onChange={setPresetType}
                options={PRESET_OPTIONS}
                style={{ width: 140 }}
              />

              {presetType !== 'interval' && (
                <TimePicker
                  value={time}
                  onChange={(v) => v && setTime(v)}
                  format="HH:mm"
                  minuteStep={5}
                  allowClear={false}
                />
              )}

              {presetType === 'interval' && (
                <Space>
                  <InputNumber
                    min={1}
                    max={24}
                    value={intervalHours}
                    onChange={(v) => v && setIntervalHours(v)}
                    addonAfter="小时"
                    style={{ width: 140 }}
                  />
                </Space>
              )}
            </Space>

            {presetType === 'custom' && (
              <Checkbox.Group
                options={DAY_OPTIONS}
                value={selectedDays}
                onChange={(v) => setSelectedDays(v as number[])}
              />
            )}

            <Space>
              <Button type="primary" size="small" onClick={handleAdd} loading={adding}>
                确认添加
              </Button>
              <Button size="small" onClick={() => setShowForm(false)}>
                取消
              </Button>
            </Space>
          </Space>
        </Card>
      )}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {schedules.length === 0 ? (
          <EmptyState
            type="no-tasks"
            description="暂无定时计划"
            action={
              !showForm ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowForm(true)}>
                  添加定时
                </Button>
              ) : undefined
            }
          />
        ) : (
          <List
            loading={loading}
            dataSource={schedules}
            renderItem={(schedule) => (
              <List.Item
                actions={[
                  <Switch
                    key="toggle"
                    checked={schedule.enabled}
                    onChange={(checked) => toggleSchedule(schedule.id, checked)}
                    size="small"
                  />,
                  <Popconfirm
                    key="delete"
                    title="确定删除此定时计划？"
                    onConfirm={() => removeSchedule(schedule.id)}
                  >
                    <Button type="text" danger icon={<DeleteOutlined />} size="small" />
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  title={
                    <span style={{ opacity: schedule.enabled ? 1 : 0.5 }}>
                      {schedule.name}
                    </span>
                  }
                  description={
                    <Space direction="vertical" size={0}>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {describePreset(schedule.preset as never)}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        下次: {formatTime(schedule.nextRunAt)} | 上次: {formatTime(schedule.lastRunAt)}
                      </Typography.Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </div>
    </div>
  )
}
