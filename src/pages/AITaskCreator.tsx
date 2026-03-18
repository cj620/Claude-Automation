import { useState, useEffect, useCallback } from 'react'
import { Steps, Input, Button, Card, Form, Space, Checkbox, message, Tag } from 'antd'
import {
  RobotOutlined,
  ThunderboltOutlined,
  StopOutlined,
  CheckOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
  AimOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useAIGeneratorStore } from '../stores/ai-generator-store'
import { useTaskStore } from '../stores/task-store'
import { useProjectStore } from '../stores/project-store'
import { LogViewer } from '../ai/components'
import { useTheme } from '../ai/theme'

interface TaskDraft {
  title: string
  background: string
  goals: string[]
  constraints: string[]
  files: string[]
  verification: string[]
}

export default function AITaskCreator(): React.ReactElement {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const { activeProject } = useProjectStore()
  const { createTask } = useTaskStore()
  const {
    isGenerating,
    progressLogs,
    generatedTasks,
    error,
    generate,
    stop,
    clear,
  } = useAIGeneratorStore()

  const [currentStep, setCurrentStep] = useState(0)
  const [prompt, setPrompt] = useState('')
  const [editableTasks, setEditableTasks] = useState<(TaskDraft & { selected: boolean })[]>([])

  // Auto-advance to step 2 when generating starts
  useEffect(() => {
    if (isGenerating && currentStep === 0) {
      setCurrentStep(1)
    }
  }, [isGenerating, currentStep])

  // Auto-advance to step 3 when results arrive
  useEffect(() => {
    if (generatedTasks.length > 0 && currentStep === 1) {
      setEditableTasks(generatedTasks.map(t => ({ ...t, selected: true })))
      setCurrentStep(2)
    }
  }, [generatedTasks, currentStep])

  // Show error on step 1
  useEffect(() => {
    if (error && currentStep === 1) {
      setCurrentStep(0)
    }
  }, [error, currentStep])

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) {
      message.warning('请输入需求描述')
      return
    }
    if (!activeProject) {
      message.warning('请先选择一个项目')
      return
    }
    generate(prompt)
  }, [prompt, activeProject, generate])

  const handleBatchCreate = async (): Promise<void> => {
    const selected = editableTasks.filter(t => t.selected)
    if (selected.length === 0) {
      message.warning('请至少选择一个任务')
      return
    }

    for (const task of selected) {
      await createTask({
        title: task.title,
        background: task.background,
        goals: task.goals,
        constraints: task.constraints,
        files: task.files,
        verification: task.verification,
      })
    }

    message.success(`成功创建 ${selected.length} 个任务`)
    clear()
    navigate('/tasks')
  }

  const handleBack = (): void => {
    setCurrentStep(0)
    clear()
  }

  const updateTask = (index: number, field: keyof TaskDraft, value: string | string[]): void => {
    setEditableTasks(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const removeTask = (index: number): void => {
    setEditableTasks(prev => prev.filter((_, i) => i !== index))
  }

  const toggleTask = (index: number): void => {
    setEditableTasks(prev => {
      const next = [...prev]
      next[index] = { ...next[index], selected: !next[index].selected }
      return next
    })
  }

  const borderColor = isDark ? '#2D333B' : '#e8e8e8'
  const cardBg = isDark ? '#161B22' : '#fafafa'
  const subtleText = isDark ? '#7D8590' : 'rgba(0,0,0,0.45)'

  const progressLogsForViewer = progressLogs.map((line, i) => ({
    taskName: 'ai-generate',
    line,
    timestamp: Date.now() - (progressLogs.length - i) * 100,
  }))

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        marginBottom: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'linear-gradient(135deg, #00E5CC 0%, #00B4D8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            color: '#0D1117',
          }}>
            <RobotOutlined />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, lineHeight: 1.2 }}>AI 任务创建</h2>
            <span style={{ fontSize: 12, color: subtleText }}>
              {activeProject ? activeProject.name : '未选择项目'}
            </span>
          </div>
        </div>
        <Button onClick={() => navigate('/tasks')} type="text">返回任务列表</Button>
      </div>

      {/* Steps indicator */}
      <Steps
        current={currentStep}
        size="small"
        style={{ marginBottom: 24, flexShrink: 0, maxWidth: 600 }}
        items={[
          { title: '描述需求' },
          { title: '分析生成' },
          { title: '预览创建' },
        ]}
      />

      {/* Step content */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {/* Step 0: Input */}
        {currentStep === 0 && (
          <div style={{ maxWidth: 720 }}>
            <Card
              style={{
                background: cardBg,
                border: `1px solid ${borderColor}`,
                borderRadius: 12,
              }}
            >
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: 'block',
                  marginBottom: 8,
                  fontWeight: 600,
                  fontSize: 14,
                }}>
                  描述你想要完成的工作
                </label>
                <Input.TextArea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="例如：给登录页添加验证码功能，需要前端组件和后端验证接口"
                  rows={6}
                  style={{
                    borderRadius: 8,
                    fontSize: 14,
                    resize: 'vertical',
                  }}
                  onPressEnter={(e) => {
                    if (e.ctrlKey || e.metaKey) handleGenerate()
                  }}
                />
                <div style={{ marginTop: 6, fontSize: 12, color: subtleText }}>
                  AI 将分析项目代码，自动拆分任务并填充详细信息。按 Ctrl+Enter 快捷生成。
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ fontSize: 12, color: subtleText }}>
                  <AimOutlined style={{ marginRight: 4 }} />
                  将使用只读工具分析项目: Read, Glob, Grep
                </div>
                <Button
                  type="primary"
                  icon={<ThunderboltOutlined />}
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || !activeProject}
                  size="large"
                  style={{
                    borderRadius: 8,
                    fontWeight: 600,
                    height: 42,
                    paddingInline: 28,
                  }}
                >
                  生成任务
                </Button>
              </div>
            </Card>

            {error && (
              <Card
                style={{
                  marginTop: 16,
                  background: isDark ? '#1C1012' : '#fff2f0',
                  border: `1px solid ${isDark ? '#5C2D2D' : '#ffccc7'}`,
                  borderRadius: 12,
                }}
              >
                <div style={{ color: isDark ? '#F88' : '#ff4d4f' }}>
                  {error}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Step 1: Generating */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}>
              <Space>
                <Tag color="processing" style={{ borderRadius: 6, padding: '2px 10px' }}>
                  <span style={{ animation: 'pulse 1.5s infinite' }}>分析中...</span>
                </Tag>
                <span style={{ fontSize: 12, color: subtleText }}>
                  Claude 正在分析项目代码并规划任务
                </span>
              </Space>
              <Button
                danger
                icon={<StopOutlined />}
                onClick={stop}
              >
                停止
              </Button>
            </div>
            <LogViewer
              logs={progressLogsForViewer}
              loading={isGenerating}
              emptyText="等待 AI 分析..."
              style={{ flex: 1, minHeight: 0, maxHeight: 'none' }}
            />
          </div>
        )}

        {/* Step 2: Review */}
        {currentStep === 2 && (
          <div>
            {/* Batch actions */}
            <div style={{
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <Space>
                <Button icon={<ArrowLeftOutlined />} onClick={handleBack}>
                  重新生成
                </Button>
                <span style={{ fontSize: 13, color: subtleText }}>
                  共 {editableTasks.length} 个任务，已选 {editableTasks.filter(t => t.selected).length} 个
                </span>
              </Space>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleBatchCreate}
                disabled={editableTasks.filter(t => t.selected).length === 0}
                size="large"
                style={{
                  borderRadius: 8,
                  fontWeight: 600,
                  height: 42,
                  paddingInline: 28,
                }}
              >
                批量创建
              </Button>
            </div>

            {/* Task cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {editableTasks.map((task, index) => (
                <Card
                  key={index}
                  style={{
                    background: cardBg,
                    border: `1px solid ${task.selected ? '#00E5CC40' : borderColor}`,
                    borderRadius: 12,
                    opacity: task.selected ? 1 : 0.6,
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Card header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Checkbox
                        checked={task.selected}
                        onChange={() => toggleTask(index)}
                      />
                      <Tag
                        color="cyan"
                        style={{ borderRadius: 6, margin: 0, fontWeight: 600 }}
                      >
                        任务 {index + 1}
                      </Tag>
                    </div>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      size="small"
                      onClick={() => removeTask(index)}
                    />
                  </div>

                  <Form layout="vertical" size="small">
                    <Form.Item label="标题" style={{ marginBottom: 12 }}>
                      <Input
                        value={task.title}
                        onChange={(e) => updateTask(index, 'title', e.target.value)}
                        style={{ borderRadius: 6 }}
                      />
                    </Form.Item>
                    <Form.Item label="背景" style={{ marginBottom: 12 }}>
                      <Input.TextArea
                        value={task.background}
                        onChange={(e) => updateTask(index, 'background', e.target.value)}
                        rows={2}
                        style={{ borderRadius: 6 }}
                      />
                    </Form.Item>
                    <Form.Item label="目标（每行一条）" style={{ marginBottom: 12 }}>
                      <Input.TextArea
                        value={task.goals.join('\n')}
                        onChange={(e) => updateTask(index, 'goals', e.target.value.split('\n').filter(Boolean))}
                        rows={3}
                        style={{ borderRadius: 6 }}
                      />
                    </Form.Item>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <Form.Item label="约束（每行一条）" style={{ marginBottom: 12 }}>
                        <Input.TextArea
                          value={task.constraints.join('\n')}
                          onChange={(e) => updateTask(index, 'constraints', e.target.value.split('\n').filter(Boolean))}
                          rows={3}
                          style={{ borderRadius: 6 }}
                        />
                      </Form.Item>
                      <Form.Item label="涉及文件（每行一条）" style={{ marginBottom: 12 }}>
                        <Input.TextArea
                          value={task.files.join('\n')}
                          onChange={(e) => updateTask(index, 'files', e.target.value.split('\n').filter(Boolean))}
                          rows={3}
                          style={{ borderRadius: 6 }}
                        />
                      </Form.Item>
                    </div>
                    <Form.Item label={<><FileTextOutlined /> 验证方式（每行一条）</>} style={{ marginBottom: 0 }}>
                      <Input.TextArea
                        value={task.verification.join('\n')}
                        onChange={(e) => updateTask(index, 'verification', e.target.value.split('\n').filter(Boolean))}
                        rows={2}
                        style={{ borderRadius: 6 }}
                      />
                    </Form.Item>
                  </Form>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
