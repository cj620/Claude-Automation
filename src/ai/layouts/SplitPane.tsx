import type { ReactNode } from 'react'

interface SplitPaneProps {
  left: ReactNode
  right: ReactNode
  ratio?: [number, number]
  gap?: number
}

export default function SplitPane({ left, right, ratio = [1, 1], gap = 16 }: SplitPaneProps) {
  const total = ratio[0] + ratio[1]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${ratio[0]}fr ${ratio[1]}fr`, gap, minHeight: 0 }}>
      <div style={{ minWidth: 0, minHeight: 0 }}>{left}</div>
      <div style={{ minWidth: 0, minHeight: 0 }}>{right}</div>
    </div>
  )
}
