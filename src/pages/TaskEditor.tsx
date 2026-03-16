import { useState, useMemo, useEffect } from 'react'
import { Form, Input, Button, Card, message } from 'antd'
import { SaveOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useTaskStore } from '../stores/task-store'
import { useRunnerStore } from '../stores/runner-store'
import { PageHeader, MarkdownRenderer } from '../ai/components'
import { SplitPane } from '../ai/layouts'

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

export default function TaskEditor(): React.ReactElement {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [form] = Form.useForm<FormValues>()
  const { tasks, fetchTasks, createTask, updateTask } = useTaskStore()
  const { start } = useRunnerStore()
  const [formValues, setFormValues] = useState<FormValues>(INITIAL_VALUES)

  const isEdit = !!id

  useEffect(() => {
    if (isEdit) {
      fetchTasks().then(() => {
        const task = tasks.find((t) => t.id === id)
        if (task) {
          form.setFieldsValue({
            title: task.name,
            background: '',
            goals: '',
            constraints: '',
            files: '',
            verification: '',
          })
        }
      })
    }
  }, [id])

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
    <div>
      <PageHeader
        title={isEdit ? '编辑任务' : '新建任务'}
        actions={
          <>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
              保存
            </Button>
            <Button icon={<PlayCircleOutlined />} onClick={handleSaveAndRun}>
              保存并执行
            </Button>
            <Button onClick={() => navigate('/tasks')}>取消</Button>
          </>
        }
      />

      <SplitPane
        left={
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
        }
        right={
          <Card title="Markdown 预览" styles={{ body: { maxHeight: 'calc(100vh - 200px)', overflow: 'auto' } }}>
            <MarkdownRenderer content={markdownPreview} />
          </Card>
        }
      />
    </div>
  )
}
