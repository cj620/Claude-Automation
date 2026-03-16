import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useEffect } from 'react'
import { useThemeStore } from './theme-store'
import {
  darkAntdTokens,
  lightAntdTokens,
  darkSemanticTokens,
  lightSemanticTokens,
  type SemanticTokens,
} from './tokens'

function injectCSSVariables(tokens: SemanticTokens): void {
  const root = document.documentElement
  root.style.setProperty('--ai-color-status-pending', tokens.colorStatusPending)
  root.style.setProperty('--ai-color-status-running', tokens.colorStatusRunning)
  root.style.setProperty('--ai-color-status-done', tokens.colorStatusDone)
  root.style.setProperty('--ai-color-status-failed', tokens.colorStatusFailed)
  root.style.setProperty('--ai-color-glow', tokens.colorGlow)
  root.style.setProperty('--ai-color-terminal-bg', tokens.colorTerminalBg)
  root.style.setProperty('--ai-color-terminal-text', tokens.colorTerminalText)
  root.style.setProperty('--ai-color-terminal-dim', tokens.colorTerminalDim)
  root.style.setProperty('--ai-color-sidebar-active', tokens.colorSidebarActive)
  root.style.setProperty('--ai-color-header-bg', tokens.colorHeaderBg)
}

export function useTheme() {
  const { mode, toggle, setMode } = useThemeStore()
  const isDark = mode === 'dark'
  const semanticTokens = isDark ? darkSemanticTokens : lightSemanticTokens
  return { mode, toggle, setMode, isDark, semanticTokens }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeStore()
  const isDark = mode === 'dark'
  const antdTokens = isDark ? darkAntdTokens : lightAntdTokens
  const semanticTokens = isDark ? darkSemanticTokens : lightSemanticTokens

  useEffect(() => {
    injectCSSVariables(semanticTokens)
    document.documentElement.setAttribute('data-theme', mode)
  }, [mode, semanticTokens])

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: antdTokens,
        components: {
          Menu: {
            darkItemBg: 'transparent',
            darkSubMenuItemBg: 'transparent',
            darkItemSelectedBg: 'rgba(0, 229, 204, 0.08)',
            darkItemSelectedColor: '#00E5CC',
          },
          Card: {
            paddingLG: 20,
          },
          Layout: {
            headerBg: isDark ? '#161B22' : '#ffffff',
            siderBg: isDark ? '#12151A' : '#ffffff',
            bodyBg: isDark ? '#12151A' : '#F4F6F8',
            footerBg: isDark ? '#12151A' : '#F4F6F8',
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  )
}
