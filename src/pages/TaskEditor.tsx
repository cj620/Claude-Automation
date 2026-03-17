import { useState, useMemo, useEffect } from 'react'
import { Form, Input, Button, Card, message, Tabs, Space } from 'antd'
import { SaveOutlined, PlayCircleOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTaskStore } from '../stores/task-store'
import { useRunnerStore } from '../stores/runner-store'
import { MarkdownRenderer } from '../ai/components'

interface FormValues {
  title: string
  background: string
  goals: string
  constraints: string
  files: string
  verification: string
}

const INITIAL_VALUES: FormValues = {
  title: '',
  background: '',
  goals: '',
  constraints: '',
  files: '',
  verification: '',
}

// 解析 Markdown 内容到表单字段
function parseContentToFormValues(content: string): Partial<FormValues> {
  const result: Partial<FormValues> = {}

  // 解析标题: # 任务：xxx
  const titleMatch = content.match(/# 任务[：:]\s*(.+)/)
  if (titleMatch) {
    result.title = titleMatch[1].trim()
  }

  // 解析背景: ## 背景\nxxx
  const backgroundMatch = content.match(/## 背景\s*\n([\s\S]*?)(?=##|$)/)
  if (backgroundMatch) {
    result.background = backgroundMatch[1].trim()
  }

  // 解析目标: ## 目标\n- [ ] xxx
  const goalsMatch = content.match(/## 目标\s*\n([\s\S]*?)(?=##|$)/)
  if (goalsMatch) {
    const goals = goalsMatch[1]
      .split('\n')
      .map(line => line.replace(/^- \[ \]\s*/, '').trim())
      .filter(Boolean)
      .join('\n')
    result.goals = goals
  }

  // 解析约束: ## 约束\n- xxx
  const constraintsMatch = content.match(/## 约束\s*\n([\s\S]*?)(?=##|$)/)
  if (constraintsMatch) {
    const constraints = constraintsMatch[1]
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean)
      .join('\n')
    result.constraints = constraints
  }

  // 解析涉及文件: ## 涉及文件\n- xxx
  const filesMatch = content.match(/## 涉及文件\s*\n([\s\S]*?)(?=##|$)/)
  if (filesMatch) {
    const files = filesMatch[1]
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean)
      .join('\n')
    result.files = files
  }

  // 解析验证方式: ## 验证方式\n- xxx
  const verificationMatch = content.match(/## 验证方式\s*\n([\s\S]*?)(?=##|$)/)
  if (verificationMatch) {
    const verification = verificationMatch[1]
      .split('\n')
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(Boolean)
      .join('\n')
    result.verification = verification
  }

  return result
}

export default function TaskEditor(): React.ReactElement {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const sourceId = searchParams.get('source')
  const [form] = Form.useForm<FormValues>()
  const { fetchTasks, createTask, updateTask } = useTaskStore()
  const { start } = useRunnerStore()
  const [formValues, setFormValues] = useState<FormValues>(INITIAL_VALUES)
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  const isEdit = !!id
  const isDuplicate = !!sourceId

  useEffect(() => {
    if (isEdit) {
      fetchTasks().then(() => {
        // 使用 useTaskStore 获取最新的 tasks，而不是闭包中的旧值
        const currentTasks = useTaskStore.getState().tasks
        const task = currentTasks.find((t) => t.id === id)
        if (task) {
          const parsedValues = parseContentToFormValues(task.content || '')
          form.setFieldsValue({
            title: task.name,
            ...parsedValues,
          })
          // 同时更新 formValues 状态以刷新预览
          setFormValues((prev) => ({
            ...prev,
            title: task.name,
            ...parsedValues,
          }))
        }
      })
    } else if (isDuplicate) {
      // 从源任务复制：加载源任务内容并预填充表单
      fetchTasks().then(() => {
        const currentTasks = useTaskStore.getState().tasks
        const sourceTask = currentTasks.find((t) => t.id === sourceId)
        if (sourceTask) {
          const parsedValues = parseContentToFormValues(sourceTask.content || '')
          const newTitle = sourceTask.name + '（副本）'
          const filledValues = {
            title: newTitle,
            background: parsedValues.background || '',
            goals: parsedValues.goals || '',
            constraints: parsedValues.constraints || '',
            files: parsedValues.files || '',
            verification: parsedValues.verification || '',
          }
          form.setFieldsValue(filledValues)
          setFormValues(filledValues)
        }
      })
    }
  }, [id, sourceId])

  const markdownPreview = useMemo(() => {
    const v = formValues
    const lines: string[] = []
    lines.push(`# 任务：${v.title || '(标题)'}`)
    lines.push('')
    lines.push('## 背景')
    lines.push(v.background || '(待填写)')
    lines.push('')
    lines.push('## 目标')
    for (const g of (v.goals || '').split('\n').filter(Boolean)) {
      lines.push(`- [ ] ${g}`)
    }
    lines.push('')
    lines.push('## 约束')
    for (const c of (v.constraints || '').split('\n').filter(Boolean)) {
      lines.push(`- ${c}`)
    }
    lines.push('')
    lines.push('## 涉及文件')
    for (const f of (v.files || '').split('\n').filter(Boolean)) {
      lines.push(`- ${f}`)
    }
    lines.push('')
    lines.push('## 验证方式')
    for (const ver of (v.verification || '').split('\n').filter(Boolean)) {
      lines.push(`- ${ver}`)
    }
    return lines.join('\n')
  }, [formValues])

  const handleSave = async (): Promise<void> => {
    const values = await form.validateFields()
    const draft = {
      title: values.title,
      background: values.background,
      goals: values.goals.split('\n').filter(Boolean),
      constraints: values.constraints.split('\n').filter(Boolean),
      files: values.files.split('\n').filter(Boolean),
      verification: values.verification.split('\n').filter(Boolean),
    }

    if (isEdit) {
      await updateTask(id!, markdownPreview)
    } else {
      await createTask(draft)
    }
    message.success('保存成功')
    navigate('/tasks')
  }

  const handleSaveAndRun = async (): Promise<void> => {
    await handleSave()
    await start()
    navigate('/execution')
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 24 }}>
      {/* 操作栏 */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{isEdit ? '编辑任务' : isDuplicate ? '复制任务' : '新建任务'}</h2>
        <Space>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            保存
          </Button>
          <Button icon={<PlayCircleOutlined />} onClick={handleSaveAndRun}>
            保存并执行
          </Button>
          <Button onClick={() => navigate('/tasks')}>取消</Button>
        </Space>
      </div>

      {/* Tab 切换 */}
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as 'edit' | 'preview')}
        items={[
          {
            key: 'edit',
            label: <span><EditOutlined /> 表单编辑</span>,
            children: (
              <Card>
                <Form
                  form={form}
                  layout="vertical"
                  initialValues={INITIAL_VALUES}
                  onValuesChange={(_, all) => setFormValues(all)}
                >
                  <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入任务标题' }]}>
                    <Input placeholder="例如：补全用户模块的单元测试" />
                  </Form.Item>
                  <Form.Item name="background" label="背景">
                    <Input.TextArea rows={3} placeholder="描述任务的背景和上下文" />
                  </Form.Item>
                  <Form.Item
                    name="goals"
                    label="目标（每行一条）"
                    rules={[{ required: true, message: '请输入至少一个目标' }]}
                  >
                    <Input.TextArea rows={4} placeholder={'为 UserService 添加单元测试\n覆盖率达到 80%'} />
                  </Form.Item>
                  <Form.Item name="constraints" label="约束（每行一条）">
                    <Input.TextArea rows={3} placeholder={'不修改现有接口\n使用 Jest 测试框架'} />
                  </Form.Item>
                  <Form.Item name="files" label="涉及文件（每行一条）">
                    <Input.TextArea rows={3} placeholder={'src/services/user.ts\ntests/services/user.test.ts'} />
                  </Form.Item>
                  <Form.Item name="verification" label="验证方式（每行一条）">
                    <Input.TextArea rows={3} placeholder={'npm test 全部通过\nnpx tsc --noEmit 无报错'} />
                  </Form.Item>
                </Form>
              </Card>
            ),
          },
          {
            key: 'preview',
            label: <span><EyeOutlined /> Markdown 预览</span>,
            children: (
              <Card>
                <MarkdownRenderer content={markdownPreview} />
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}
