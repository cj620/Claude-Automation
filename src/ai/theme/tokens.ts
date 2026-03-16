import type { ThemeConfig } from 'antd'

export interface SemanticTokens {
  colorStatusPending: string
  colorStatusRunning: string
  colorStatusDone: string
  colorStatusFailed: string
  colorGlow: string
  colorTerminalBg: string
  colorTerminalText: string
  colorTerminalDim: string
  colorSidebarActive: string
  colorHeaderBg: string
}

export const darkAntdTokens: ThemeConfig['token'] = {
  colorPrimary: '#00E5CC',
  colorSuccess: '#00E676',
  colorError: '#FF5252',
  colorWarning: '#F5A623',
  colorInfo: '#00E5CC',
  colorBgContainer: '#1A1D23',
  colorBgLayout: '#12151A',
  colorBgElevated: '#222730',
  colorBorder: '#2D333B',
  colorBorderSecondary: '#21262D',
  colorText: '#E6EDF3',
  colorTextSecondary: '#7D8590',
  colorTextTertiary: '#545D68',
  fontFamily: "'Geist Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyCode: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  borderRadius: 6,
  wireframe: false,
}

export const lightAntdTokens: ThemeConfig['token'] = {
  colorPrimary: '#00B8A3',
  colorSuccess: '#52c41a',
  colorError: '#ff4d4f',
  colorWarning: '#faad14',
  colorInfo: '#00B8A3',
  colorBgContainer: '#ffffff',
  colorBgLayout: '#F4F6F8',
  colorBgElevated: '#ffffff',
  colorBorder: '#d9d9d9',
  colorBorderSecondary: '#e8e8e8',
  colorText: 'rgba(0, 0, 0, 0.88)',
  colorTextSecondary: 'rgba(0, 0, 0, 0.45)',
  colorTextTertiary: 'rgba(0, 0, 0, 0.25)',
  fontFamily: "'Geist Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  fontFamilyCode: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
  borderRadius: 6,
  wireframe: false,
}

export const darkSemanticTokens: SemanticTokens = {
  colorStatusPending: '#7D8590',
  colorStatusRunning: '#00E5CC',
  colorStatusDone: '#00E676',
  colorStatusFailed: '#FF5252',
  colorGlow: 'rgba(0, 229, 204, 0.12)',
  colorTerminalBg: '#0D1117',
  colorTerminalText: '#C9D1D9',
  colorTerminalDim: '#484F58',
  colorSidebarActive: '#00E5CC',
  colorHeaderBg: '#161B22',
}

export const lightSemanticTokens: SemanticTokens = {
  colorStatusPending: 'rgba(0, 0, 0, 0.25)',
  colorStatusRunning: '#00B8A3',
  colorStatusDone: '#52c41a',
  colorStatusFailed: '#ff4d4f',
  colorGlow: 'rgba(0, 184, 163, 0.08)',
  colorTerminalBg: '#1e1e1e',
  colorTerminalText: '#d4d4d4',
  colorTerminalDim: '#666666',
  colorSidebarActive: '#00B8A3',
  colorHeaderBg: '#ffffff',
}
