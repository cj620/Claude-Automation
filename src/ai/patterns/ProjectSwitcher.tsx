import { Select, Button, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useProjectStore } from '../../stores/project-store'

export default function ProjectSwitcher() {
  const { projects, activeProject, addProject, setActive } = useProjectStore()

  return (
    <Space size={8}>
      <Select
        value={activeProject?.id}
        onChange={(id) => setActive(id)}
        style={{ width: 180 }}
        placeholder="选择项目"
        size="small"
        options={projects.map((p) => ({ label: p.name, value: p.id }))}
      />
      <Button icon={<PlusOutlined />} onClick={addProject} size="small" type="text">
        添加
      </Button>
    </Space>
  )
}
