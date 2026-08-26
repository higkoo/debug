import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload as UploadIcon, Github, GitBranch, LinkIcon, FileArchive, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { projectApi } from '../services/api'
import type { Project } from '../types'

export default function Upload() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeTab, setActiveTab] = useState<'url' | 'zip'>('url')
  const [repoUrl, setRepoUrl] = useState('')
  const [repoType, setRepoType] = useState<'github' | 'gitlab'>('github')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [importedProject, setImportedProject] = useState<Project | null>(null)

  const handleImportUrl = async () => {
    if (!repoUrl.trim()) {
      setError('请输入仓库 URL')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await projectApi.import(repoUrl, repoType)
      setImportedProject(res.data.project)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '导入失败，请检查 URL 是否正确')
    }
    setLoading(false)
  }

  const handleUploadZip = async () => {
    if (!file) {
      setError('请选择一个 ZIP 文件')
      return
    }

    setLoading(true)
    setError('')
    try {
      const res = await projectApi.upload(file)
      setImportedProject(res.data.project)
    } catch (err: any) {
      setError(err.response?.data?.error?.message || '上传失败')
    }
    setLoading(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.name.endsWith('.zip')) {
      setFile(droppedFile)
    } else {
      setError('请上传 ZIP 格式的文件')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
    }
  }

  const sampleProjects = [
    { url: 'https://github.com/higkoo/Marivo-GCN', label: 'Marivo-GCN' },
    { url: 'https://github.com/higkoo/marivo-demo', label: 'marivo-demo' },
    { url: 'https://github.com/chengxianglibra/marivo-yellow-taxi-demo', label: 'marivo-yellow-taxi-demo' },
  ]

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-[#f1f5f9]">导入 Marivo 项目</h2>
        <p className="mt-2 text-[#94a3b8]">
          支持从 GitHub/GitLab 导入现成的项目，或上传本地的 ZIP 压缩包。
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl border border-[#334155] bg-[#1e293b] p-1">
        <button
          onClick={() => { setActiveTab('url'); setImportedProject(null); setError('') }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'url' ? 'bg-[#3b82f6] text-white' : 'text-[#94a3b8] hover:text-[#f1f5f9]'
          }`}
        >
          <LinkIcon className="h-4 w-4" />
          仓库地址
        </button>
        <button
          onClick={() => { setActiveTab('zip'); setImportedProject(null); setError('') }}
          className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'zip' ? 'bg-[#3b82f6] text-white' : 'text-[#94a3b8] hover:text-[#f1f5f9]'
          }`}
        >
          <FileArchive className="h-4 w-4" />
          ZIP 上传
        </button>
      </div>

      {/* URL Import Tab */}
      {activeTab === 'url' && (
        <div className="space-y-6 rounded-xl border border-[#334155] bg-[#1e293b] p-6">
          {/* Repo type selector */}
          <div className="flex gap-3">
            <button
              onClick={() => setRepoType('github')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                repoType === 'github'
                  ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]'
                  : 'border-[#334155] text-[#94a3b8] hover:border-[#64748b]'
              }`}
            >
              <Github className="h-5 w-5" />
              GitHub
            </button>
            <button
              onClick={() => setRepoType('gitlab')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                repoType === 'gitlab'
                  ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]'
                  : 'border-[#334155] text-[#94a3b8] hover:border-[#64748b]'
              }`}
            >
              <GitBranch className="h-5 w-5" />
              GitLab
            </button>
          </div>

          {/* URL input */}
          <div>
            <label className="block text-sm font-medium text-[#f1f5f9] mb-2">
              {repoType === 'github' ? 'GitHub' : 'GitLab'} 仓库 URL
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                placeholder={`https://${repoType}.com/username/repo`}
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="flex-1 rounded-lg border border-[#334155] bg-[#0f172a] px-4 py-3 text-[#f1f5f9] placeholder-[#64748b] outline-none focus:border-[#3b82f6]"
              />
              <button
                onClick={handleImportUrl}
                disabled={loading}
                className="rounded-lg bg-[#3b82f6] px-6 py-3 text-sm font-medium text-white hover:bg-[#2563eb] disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : '导入'}
              </button>
            </div>
          </div>

          {/* Sample projects */}
          <div>
            <p className="text-sm text-[#94a3b8] mb-3">快速导入示例项目：</p>
            <div className="flex flex-wrap gap-2">
              {sampleProjects.map((sample) => (
                <button
                  key={sample.label}
                  onClick={() => {
                    setRepoUrl(sample.url)
                    setRepoType('github')
                  }}
                  className="rounded-lg border border-[#334155] px-3 py-1.5 text-xs text-[#94a3b8] hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
                >
                  {sample.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ZIP Upload Tab */}
      {activeTab === 'zip' && (
        <div className="space-y-6 rounded-xl border border-[#334155] bg-[#1e293b] p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
              dragging
                ? 'border-[#3b82f6] bg-[#3b82f6]/5'
                : 'border-[#334155] hover:border-[#64748b]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file ? (
              <div className="space-y-2">
                <CheckCircle className="mx-auto h-12 w-12 text-[#22c55e]" />
                <p className="text-lg font-medium text-[#f1f5f9]">{file.name}</p>
                <p className="text-sm text-[#94a3b8]">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="text-sm text-[#3b82f6] hover:underline"
                >
                  重新选择
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <UploadIcon className="mx-auto h-12 w-12 text-[#64748b]" />
                <p className="text-lg font-medium text-[#f1f5f9]">
                  拖拽 ZIP 文件到此处，或点击选择
                </p>
                <p className="text-sm text-[#94a3b8]">
                  支持 .zip 格式，最大 100MB
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleUploadZip}
            disabled={!file || loading}
            className="w-full rounded-lg bg-[#3b82f6] px-6 py-3 text-sm font-medium text-white hover:bg-[#2563eb] disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                上传中...
              </span>
            ) : (
              '上传并验证'
            )}
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 p-4">
          <AlertCircle className="h-5 w-5 text-[#ef4444] shrink-0 mt-0.5" />
          <p className="text-sm text-[#ef4444]">{error}</p>
        </div>
      )}

      {/* Success result */}
      {importedProject && (
        <div className="rounded-xl border border-[#22c55e]/30 bg-[#22c55e]/10 p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-[#22c55e]" />
            <div>
              <h3 className="text-lg font-semibold text-[#f1f5f9]">
                项目导入成功！
              </h3>
              <p className="text-sm text-[#94a3b8]">
                {importedProject.name} - 已自动验证为有效的 Marivo 项目
              </p>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => navigate(`/projects/${importedProject.id}`)}
              className="rounded-lg bg-[#3b82f6] px-4 py-2 text-sm text-white hover:bg-[#2563eb] transition-colors"
            >
              查看项目详情
            </button>
            <button
              onClick={() => navigate(`/projects/${importedProject.id}/chat`)}
              className="rounded-lg border border-[#334155] px-4 py-2 text-sm text-[#f1f5f9] hover:bg-[#1e293b] transition-colors"
            >
              开始分析
            </button>
          </div>
        </div>
      )}
    </div>
  )
}