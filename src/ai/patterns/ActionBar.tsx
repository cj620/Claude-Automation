import type { ReactNode } from 'react'

interface ActionBarProps {
  children: ReactNode
  align?: 'left' | 'right' | 'between'
}

const alignMap = {
  left: 'flex-start',
  right: 'flex-end',
  between: 'space-between',
}

export default function ActionBar({ children, align = 'left' }: ActionBarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: alignMap[align],
        gap: 8,
      }}
    >
      {children}
    </div>
  )
}
