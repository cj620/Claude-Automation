import { Button, Tooltip } from 'antd'
import { SunOutlined, MoonOutlined } from '@ant-design/icons'
import { useTheme } from '../theme'

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme()

  return (
    <Tooltip title={isDark ? '切换亮色模式' : '切换暗色模式'}>
      <Button
        type="text"
        size="small"
        icon={isDark ? <SunOutlined /> : <MoonOutlined />}
        onClick={toggle}
        style={{
          color: isDark ? '#E6EDF3' : 'rgba(0,0,0,0.65)',
          fontSize: 16,
        }}
      />
    </Tooltip>
  )
}
