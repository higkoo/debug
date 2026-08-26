import { Outlet, Link, useLocation } from 'react-router-dom'
import { Github, Upload, Database, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Layout() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { path: '/', label: '项目列表', icon: Database },
    { path: '/upload', label: '导入项目', icon: Upload },
  ]

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#334155] bg-[#0f172a]/80 backdrop-blur-lg">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3b82f6]">
                <span className="text-lg font-bold text-white">M</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-[#f1f5f9]">Marivo Manager</h1>
                <p className="text-xs text-[#94a3b8]">数据分析项目管理平台</p>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#3b82f6]/10 text-[#3b82f6]'
                        : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#f1f5f9]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* GitHub link */}
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/higkoo/marivo"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-2 rounded-lg border border-[#334155] px-3 py-1.5 text-sm text-[#94a3b8] hover:bg-[#1e293b] hover:text-[#f1f5f9] transition-colors"
              >
                <Github className="h-4 w-4" />
                <span>Marivo</span>
              </a>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden rounded-lg p-2 text-[#94a3b8] hover:bg-[#1e293b]"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-[#334155] md:hidden">
            <div className="space-y-1 px-4 py-3">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      isActive
                        ? 'bg-[#3b82f6]/10 text-[#3b82f6]'
                        : 'text-[#94a3b8] hover:bg-[#1e293b]'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
              <a
                href="https://github.com/higkoo/marivo"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[#94a3b8] hover:bg-[#1e293b]"
              >
                <Github className="h-4 w-4" />
                Marivo GitHub
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  )
}