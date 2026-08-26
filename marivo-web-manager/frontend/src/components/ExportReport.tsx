import { useState } from 'react';
import { FileText, FileCode } from 'lucide-react';
import type { AnalysisSession, ChatMessage } from '../types';

interface ExportReportProps {
  projectName: string;
  session?: AnalysisSession;
  messages?: ChatMessage[];
  metrics?: { name: string; value: string }[];
}

export default function ExportReport({ projectName, session, messages, metrics }: ExportReportProps) {
  const [exporting, setExporting] = useState(false);

  function generateMarkdown(): string {
    const lines: string[] = [];
    lines.push(`# ${projectName} - 分析报告`);
    lines.push(`\n**生成时间**: ${new Date().toLocaleString('zh-CN')}`);
    lines.push(`\n---\n`);

    if (session) {
      lines.push(`## 分析会话`);
      lines.push(`- **状态**: ${session.status === 'completed' ? '✅ 完成' : session.status === 'failed' ? '❌ 失败' : '⏳ 运行中'}`);
      lines.push(`- **命令**: \`${session.command || 'N/A'}\``);
      if (session.started_at) lines.push(`- **开始时间**: ${new Date(session.started_at).toLocaleString('zh-CN')}`);
      if (session.completed_at) lines.push(`- **完成时间**: ${new Date(session.completed_at).toLocaleString('zh-CN')}`);
      lines.push('');
    }

    if (metrics && metrics.length > 0) {
      lines.push(`## 分析指标\n`);
      lines.push(`| 指标 | 值 |`);
      lines.push(`|------|----|`);
      for (const m of metrics) {
        lines.push(`| ${m.name} | ${m.value} |`);
      }
      lines.push('');
    }

    if (messages && messages.length > 0) {
      lines.push(`## 对话记录\n`);
      for (const msg of messages) {
        const role = msg.role === 'user' ? '👤 用户' : msg.role === 'assistant' ? '🤖 助手' : '⚙️ 系统';
        lines.push(`### ${role}`);
        lines.push(`\n${msg.content}\n`);
      }
    }

    return lines.join('\n');
  }

  function generateHTML(): string {
    const md = generateMarkdown();
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${projectName} - 分析报告</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1e293b; line-height: 1.6; }
    h1 { color: #3b82f6; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    h2 { color: #2563eb; margin-top: 24px; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 12px; text-align: left; }
    th { background: #f1f5f9; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    .meta { color: #64748b; font-size: 0.9em; }
  </style>
</head>
<body>
  ${md.split('\n').map(line => {
    if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
    if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
    if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
    if (line.startsWith('| ')) return ''; // skip table (handled below)
    if (line.startsWith('---')) return '<hr>';
    if (line.startsWith('**')) return `<p class="meta">${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
    if (line.trim()) return `<p>${line}</p>`;
    return '<br>';
  }).join('\n')}
</body>
</html>`;
    return html;
  }

  function download(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleExport(format: 'md' | 'html') {
    setExporting(true);
    try {
      const content = format === 'md' ? generateMarkdown() : generateHTML();
      const ext = format === 'md' ? 'md' : 'html';
      const mime = format === 'md' ? 'text/markdown' : 'text/html';
      const safeName = projectName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]/g, '_');
      download(`${safeName}_分析报告_${Date.now()}.${ext}`, content, mime);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleExport('md')}
        disabled={exporting}
        className="flex items-center gap-2 rounded-lg border border-[#334155] px-3 py-1.5 text-xs text-[#94a3b8] hover:bg-[#334155] disabled:opacity-50 transition-colors"
      >
        <FileCode className="h-3.5 w-3.5" />
        Markdown
      </button>
      <button
        onClick={() => handleExport('html')}
        disabled={exporting}
        className="flex items-center gap-2 rounded-lg border border-[#334155] px-3 py-1.5 text-xs text-[#94a3b8] hover:bg-[#334155] disabled:opacity-50 transition-colors"
      >
        <FileText className="h-3.5 w-3.5" />
        HTML
      </button>
    </div>
  );
}