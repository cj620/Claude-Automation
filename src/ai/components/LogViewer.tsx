import { useEffect, useRef } from 'react'

interface LogEntry {
  line: string
  taskName?: string
  timestamp?: number
}

interface LogViewerProps {
  logs: LogEntry[]
  loading?: boolean
  emptyText?: string
  maxHeight?: string
  style?: React.CSSProperties
}

export default function LogViewer({ logs, loading, emptyText = '等待执行...', maxHeight = 'calc(100vh - 320px)', style }: LogViewerProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div
      className="ai-terminal"
      style={{
        background: 'var(--ai-color-terminal-bg)',
        color: 'var(--ai-color-terminal-text)',
        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
        fontSize: 13,
        lineHeight: 1.7,
        padding: 16,
        maxHeight,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        borderRadius: 6,
        ...style,
      }}
    >
      {logs.length === 0 ? (
        <span style={{ color: 'var(--ai-color-terminal-dim)' }}>
          {loading ? '> 正在启动...' : `> ${emptyText}`}
        </span>
      ) : (
        logs.map((log, i) => (
          <div
            key={i}
            style={{
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              padding: '1px 0',
            }}
          >
            {log.line}
          </div>
        ))
      )}
      <div ref={endRef} />
    </div>
  )
}
