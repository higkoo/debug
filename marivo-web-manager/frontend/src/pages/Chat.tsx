import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Send, Play, ChevronRight, Loader2, Bot, User, StopCircle, History } from 'lucide-react'
import { projectApi, chatApi, createChatStream, createAnalysisStream } from '../services/api'
import type { Project, ChatMessage } from '../types'

const PRESET_QUESTIONS = [
  '这个项目的数据源是什么？',
  '有哪些可用的分析维度？',
  '运行分析任务',
  '帮我解读分析结果',
]

export default function Chat() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisOutput, setAnalysisOutput] = useState<string[]>([])
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [conversations, setConversations] = useState<any[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (id) loadProject()
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  async function loadProject() {
    try {
      const res = await projectApi.get(id!)
      setProject(res.data.project)

      // Load conversations
      const convRes = await chatApi.conversations(id!)
      setConversations(convRes.data.conversations)
    } catch { /* ignore */ }
  }

  async function sendMessage() {
    if (!input.trim() || !id || isStreaming) return

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)
    setStreamingContent('')

    const token = localStorage.getItem('token') || ''

    abortRef.current = createChatStream(
      id,
      input,
      conversationId,
      token,
      (chunk) => {
        setStreamingContent((prev) => prev + chunk)
      },
      () => {
        setIsStreaming(false)
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: streamingContent,
          timestamp: Date.now(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        setStreamingContent('')
        // Refresh conversations list
        chatApi.conversations(id!).then((res) => setConversations(res.data.conversations))
      },
      (error) => {
        setIsStreaming(false)
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: `错误: ${error}`,
          timestamp: Date.now(),
        }])
      }
    )
  }

  function stopStreaming() {
    abortRef.current?.abort()
    setIsStreaming(false)
    if (streamingContent) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: streamingContent,
        timestamp: Date.now(),
      }])
      setStreamingContent('')
    }
  }

  function runAnalysis() {
    if (!id || isAnalyzing) return

    setIsAnalyzing(true)
    setShowAnalysis(true)
    setAnalysisOutput([])

    const token = localStorage.getItem('token') || ''

    createAnalysisStream(
      id,
      'make verify',
      token,
      (content) => {
        setAnalysisOutput((prev) => [...prev, content])
      },
      (content) => {
        setAnalysisOutput((prev) => [...prev, `[错误] ${content}`])
      },
      (exitCode, results) => {
        setIsAnalyzing(false)
        setAnalysisOutput((prev) => [
          ...prev,
          `\n分析完成，退出码: ${exitCode}`,
          results?.metrics?.length > 0
            ? `\n检测到指标: ${results.metrics.map((m: any) => `${m.name}: ${m.value}`).join(', ')}`
            : '',
        ])
      },
      (error) => {
        setIsAnalyzing(false)
        setAnalysisOutput((prev) => [...prev, `\n[错误] ${error}`])
      }
    )
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Main Chat Area */}
      <div className="flex flex-1 flex-col rounded-xl border border-[#334155] bg-[#1e293b] overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-[#334155] px-6 py-4">
          <div className="flex items-center gap-3">
            <Link to={`/projects/${id}`} className="text-[#94a3b8] hover:text-[#f1f5f9]">
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Link>
            <div>
              <h2 className="text-lg font-semibold text-[#f1f5f9]">
                {project?.name || '数据分析'}
              </h2>
              <p className="text-xs text-[#64748b]">对话式数据分析</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 rounded-lg border border-[#334155] px-3 py-1.5 text-sm text-[#f1f5f9] hover:bg-[#334155] disabled:opacity-50 transition-colors"
            >
              {isAnalyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              运行分析
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="rounded-lg border border-[#334155] p-2 text-[#94a3b8] hover:bg-[#334155] transition-colors"
            >
              <History className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Welcome message */}
          {messages.length === 0 && !streamingContent && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bot className="h-16 w-16 text-[#3b82f6]/30 mb-4" />
              <h3 className="text-xl font-semibold text-[#f1f5f9]">开始分析</h3>
              <p className="mt-2 text-[#94a3b8] max-w-md">
                你可以提问关于项目的数据源、分析维度，或要求运行分析任务。
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {PRESET_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="rounded-lg border border-[#334155] px-3 py-2 text-sm text-[#94a3b8] hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg, i) => (
            <div key={i} className={`message-enter flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role !== 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3b82f6]/10">
                  <Bot className="h-4 w-4 text-[#3b82f6]" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-[#3b82f6] text-white'
                  : 'bg-[#0f172a] text-[#f1f5f9]'
              }`}>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {msg.content}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3b82f6]/20">
                  <User className="h-4 w-4 text-[#3b82f6]" />
                </div>
              )}
            </div>
          ))}

          {/* Streaming message */}
          {streamingContent && (
            <div className="message-enter flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#3b82f6]/10">
                <Bot className="h-4 w-4 text-[#3b82f6]" />
              </div>
              <div className="max-w-[80%] rounded-xl bg-[#0f172a] px-4 py-3">
                <div className="whitespace-pre-wrap text-sm text-[#f1f5f9]">
                  {streamingContent}
                  <span className="inline-block w-2 h-4 bg-[#3b82f6] animate-pulse ml-1" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-[#334155] p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="输入你的问题..."
              disabled={isStreaming}
              className="flex-1 rounded-lg border border-[#334155] bg-[#0f172a] px-4 py-3 text-[#f1f5f9] placeholder-[#64748b] outline-none focus:border-[#3b82f6] disabled:opacity-50"
            />
            {isStreaming ? (
              <button
                onClick={stopStreaming}
                className="rounded-lg bg-[#ef4444] px-4 py-3 text-white hover:bg-[#dc2626] transition-colors"
              >
                <StopCircle className="h-5 w-5" />
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!input.trim()}
                className="rounded-lg bg-[#3b82f6] px-4 py-3 text-white hover:bg-[#2563eb] disabled:opacity-50 transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Analysis Output / History */}
      {(showAnalysis || showHistory) && (
        <div className="w-96 rounded-xl border border-[#334155] bg-[#1e293b] overflow-hidden">
          <div className="flex items-center justify-between border-b border-[#334155] px-4 py-3">
            <h3 className="text-sm font-medium text-[#f1f5f9]">
              {showAnalysis ? '分析输出' : '对话历史'}
            </h3>
            <button
              onClick={() => { setShowAnalysis(false); setShowHistory(false) }}
              className="text-[#64748b] hover:text-[#f1f5f9]"
            >
              ×
            </button>
          </div>

          <div className="overflow-y-auto h-full p-4">
            {showAnalysis && (
              <div className="space-y-2">
                {analysisOutput.length === 0 && isAnalyzing && (
                  <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在运行分析...
                  </div>
                )}
                {analysisOutput.map((line, i) => (
                  <pre key={i} className="font-mono text-xs text-[#94a3b8] whitespace-pre-wrap">{line}</pre>
                ))}
                {!isAnalyzing && analysisOutput.length === 0 && (
                  <p className="text-sm text-[#64748b]">点击"运行分析"按钮开始分析</p>
                )}
              </div>
            )}

            {showHistory && (
              <div className="space-y-2">
                {conversations.length === 0 ? (
                  <p className="text-sm text-[#64748b]">暂无对话历史</p>
                ) : (
                  conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setConversationId(conv.id)
                        chatApi.getConversation(conv.id).then((res) => {
                          setMessages(res.data.conversation.messages)
                        })
                        setShowHistory(false)
                      }}
                      className="w-full rounded-lg bg-[#0f172a] p-3 text-left hover:bg-[#334155] transition-colors"
                    >
                      <p className="text-sm text-[#f1f5f9] truncate">{conv.title}</p>
                      <p className="text-xs text-[#64748b] mt-1">
                        {new Date(conv.updated_at).toLocaleString('zh-CN')}
                      </p>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}