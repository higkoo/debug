import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, ExternalLink, Github, Upload, MessageSquare, BarChart3, Clock, Tag } from 'lucide-react'
import { projectApi } from '../services/api'
import type { Project } from '../types'

// Sample projects for demo
const DEMO_PROJECTS: Project[] = [
  {
    id: 'demo-1',
    user_id: 'system',
    name: 'Marivo-GCN',
    description: '基于图卷积网络（GCN）的数据分析项目，用于分析图结构数据中的关系和模式。',
    repo_url: 'https://github.com/higkoo/Marivo-GCN',
    repo_type: 'github',
    source_type: 'import',
    local_path: '',
    is_valid_marivo: true,
    tags: ['GCN', '图神经网络', '关系分析'],
    readme: '',
    file_structure: [],
    metadata: {},
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'demo-2',
    user_id: 'system',
    name: 'marivo-demo',
    description: 'Marivo 框架的官方示例项目，展示了基本的数据分析流程和模型定义。',
    repo_url: 'https://github.com/higkoo/marivo-demo',
    repo_type: 'github',
    source_type: 'import',
    local_path: '',
    is_valid_marivo: true,
    tags: ['示例', '入门', '教程'],
    readme: '',
    file_structure: [],
    metadata: {},
    created_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'demo-3',
    user_id: 'system',
    name: 'marivo-yellow-taxi-demo',
    description: '纽约黄色出租车数据分析项目，演示如何使用 Marivo 分析大规模交通数据。',
    repo_url: 'https://github.com/chengxianglibra/marivo-yellow-taxi-demo',
    repo_type: 'github',
    source_type: 'import',
    local_path: '',
    is_valid_marivo: true,
    tags: ['交通数据', '出租车', '大数据'],
    readme: '',
    file_structure: [],
    metadata: {},
    created_at: '2024-02-01T00:00:00Z',
  },
]

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>(DEMO_PROJECTS)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    setLoading(true)
    try {
      const res = await projectApi.list({ search })
      if (res.data.projects.length > 0) {
        setProjects([...DEMO_PROJECTS, ...res.data.projects])
      }
    } catch {
      // Use demo projects as fallback
    }
    setLoading(false)
  }

  const filteredProjects = projects.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.description?.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="rounded-2xl border border-[#334155] bg-gradient-to-br from-[#1e293b] to-[#0f172a] p-8">
        <h2 className="text-3xl font-bold text-[#f1f5f9]">Marivo 项目管理平台</h2>
        <p className="mt-3 text-lg text-[#94a3b8] max-w-2xl">
          导入、管理和分析 Marivo 数据项目。支持从 GitHub/GitLab 导入，或上传本地 ZIP 包。
          加载项目后即可通过对话式 AI 进行交互式数据分析。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/upload"
            className="inline-flex items-center gap-2 rounded-lg bg-[#3b82f6] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#2563eb] transition-colors"
          >
            <Upload className="h-4 w-4" />
            导入项目
          </Link>
          <a
            href="https://github.com/higkoo/marivo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[#334155] px-5 py-2.5 text-sm font-medium text-[#f1f5f9] hover:bg-[#1e293b] transition-colors"
          >
            <Github className="h-4 w-4" />
            了解 Marivo
          </a>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748b]" />
        <input
          type="text"
          placeholder="搜索项目名称、描述或标签..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-[#334155] bg-[#1e293b] py-3.5 pl-12 pr-4 text-[#f1f5f9] placeholder-[#64748b] outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6]/50 transition-colors"
        />
      </div>

      {/* Project Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3b82f6] border-t-transparent" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-[#334155] bg-[#1e293b] p-12 text-center">
          <DatabaseIcon className="mx-auto h-12 w-12 text-[#64748b]" />
          <h3 className="mt-4 text-lg font-medium text-[#f1f5f9]">暂无项目</h3>
          <p className="mt-2 text-sm text-[#94a3b8]">
            点击上方"导入项目"按钮，从 GitHub 导入或上传 ZIP 包开始使用。
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project }: { project: Project }) {
  const isDemo = project.id.startsWith('demo-')

  return (
    <div className="group rounded-xl border border-[#334155] bg-[#1e293b] p-6 hover:border-[#3b82f6]/50 hover:shadow-lg hover:shadow-[#3b82f6]/5 transition-all">
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#3b82f6]/10">
          <BarChart3 className="h-5 w-5 text-[#3b82f6]" />
        </div>
        {project.repo_type === 'github' && (
          <Github className="h-4 w-4 text-[#64748b]" />
        )}
      </div>

      <h3 className="mt-4 text-lg font-semibold text-[#f1f5f9] group-hover:text-[#3b82f6] transition-colors">
        {project.name}
      </h3>

      <p className="mt-2 text-sm text-[#94a3b8] line-clamp-2">
        {project.description || '暂无描述'}
      </p>

      {project.tags && project.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {project.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-[#334155] px-2 py-0.5 text-xs text-[#94a3b8]"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-[#334155] pt-4">
        <span className="flex items-center gap-1 text-xs text-[#64748b]">
          <Clock className="h-3 w-3" />
          {new Date(project.created_at).toLocaleDateString('zh-CN')}
        </span>

        <div className="flex gap-2">
          {isDemo ? (
            <a
              href={project.repo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-[#334155] px-3 py-1.5 text-xs text-[#94a3b8] hover:bg-[#334155] transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5 inline mr-1" />
              查看
            </a>
          ) : (
            <Link
              to={`/projects/${project.id}`}
              className="rounded-lg bg-[#3b82f6]/10 px-3 py-1.5 text-xs text-[#3b82f6] hover:bg-[#3b82f6]/20 transition-colors"
            >
              详情
            </Link>
          )}
          {!isDemo && (
            <Link
              to={`/projects/${project.id}/chat`}
              className="rounded-lg bg-[#06b6d4]/10 px-3 py-1.5 text-xs text-[#06b6d4] hover:bg-[#06b6d4]/20 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 inline mr-1" />
              分析
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  )
}