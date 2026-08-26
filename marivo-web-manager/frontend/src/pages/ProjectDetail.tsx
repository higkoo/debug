import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, File, Folder, MessageSquare, Github, ExternalLink, Tag } from 'lucide-react'
import { projectApi, analysisApi } from '../services/api'
import type { Project, FileNode, AnalysisSession } from '../types'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [sessions, setSessions] = useState<AnalysisSession[]>([])
  const [loading, setLoading] = useState(true)
  

  useEffect(() => {
    loadProject()
  }, [id])

  async function loadProject() {
    if (!id) return
    try {
      const res = await projectApi.get(id)
      setProject(res.data.project)
      const sessionsRes = await analysisApi.sessions(id)
      setSessions(sessionsRes.data.sessions)
    } catch {
      // Handle error
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-12 text-center">
        <p className="text-[#94a3b8]">项目不存在</p>
        <Link to="/" className="mt-4 inline-block text-[#3b82f6] hover:underline">返回首页</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-[#94a3b8]">
        <Link to="/" className="hover:text-[#f1f5f9]">项目列表</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-[#f1f5f9]">{project.name}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Project Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Header */}
          <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#f1f5f9]">{project.name}</h2>
                <p className="mt-2 text-[#94a3b8]">{project.description || '暂无描述'}</p>
              </div>
            </div>

            {project.tags && project.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {project.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-[#334155] px-2.5 py-1 text-xs text-[#94a3b8]">
                    <Tag className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                to={`/projects/${project.id}/chat`}
                className="inline-flex items-center gap-2 rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-medium text-white hover:bg-[#2563eb] transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
                开始分析对话
              </Link>
              {project.repo_url && (
                <a
                  href={project.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-[#334155] px-4 py-2 text-sm text-[#f1f5f9] hover:bg-[#1e293b] transition-colors"
                >
                  <Github className="h-4 w-4" />
                  查看源码
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>

          {/* README */}
          {project.readme && (
            <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-6">
              <h3 className="mb-4 text-lg font-semibold text-[#f1f5f9]">README</h3>
              <div className="prose prose-invert max-w-none text-sm text-[#94a3b8] whitespace-pre-wrap">
                {project.readme}
              </div>
            </div>
          )}

          {/* Analysis History */}
          {sessions.length > 0 && (
            <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-6">
              <h3 className="mb-4 text-lg font-semibold text-[#f1f5f9]">分析历史</h3>
              <div className="space-y-3">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between rounded-lg bg-[#0f172a] p-3">
                    <div className="flex items-center gap-3">
                      <span className={`h-2 w-2 rounded-full ${
                        session.status === 'completed' ? 'bg-[#22c55e]' :
                        session.status === 'failed' ? 'bg-[#ef4444]' :
                        'bg-[#f59e0b]'
                      }`} />
                      <span className="text-sm text-[#f1f5f9]">{session.command}</span>
                    </div>
                    <span className="text-xs text-[#64748b]">
                      {new Date(session.started_at).toLocaleString('zh-CN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: File Tree */}
        <div className="space-y-6">
          <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-6">
            <h3 className="mb-4 text-lg font-semibold text-[#f1f5f9]">文件结构</h3>
            <div className="space-y-1">
              {project.file_structure?.map((node, i) => (
                <FileTreeNode key={i} node={node} depth={0} />
              ))}
            </div>
          </div>

          {/* Project Meta */}
          <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-6">
            <h3 className="mb-4 text-lg font-semibold text-[#f1f5f9]">项目信息</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">来源</span>
                <span className="text-[#f1f5f9]">
                  {project.source_type === 'import' ? '远程仓库' : '本地上传'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">创建时间</span>
                <span className="text-[#f1f5f9]">
                  {new Date(project.created_at).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FileTreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2)
  const indent = depth * 16

  if (node.type === 'dir') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#94a3b8] hover:bg-[#334155] transition-colors"
          style={{ paddingLeft: `${12 + indent}px` }}
        >
          <Folder className="h-4 w-4 text-[#f59e0b]" />
          <span>{node.name}</span>
        </button>
        {expanded && node.children?.map((child, i) => (
          <FileTreeNode key={i} node={child} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-[#94a3b8]"
      style={{ paddingLeft: `${12 + indent}px` }}
    >
      <File className="h-4 w-4 text-[#64748b]" />
      <span>{node.name}</span>
    </div>
  )
}