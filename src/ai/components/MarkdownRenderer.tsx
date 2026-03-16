import ReactMarkdown from 'react-markdown'

interface MarkdownRendererProps {
  content: string
  maxHeight?: string
}

export default function MarkdownRenderer({ content, maxHeight }: MarkdownRendererProps) {
  return (
    <div
      className="ai-markdown"
      style={{
        maxHeight,
        overflow: maxHeight ? 'auto' : undefined,
        lineHeight: 1.7,
        fontSize: 14,
      }}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
