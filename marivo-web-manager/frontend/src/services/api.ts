import axios from 'axios';
import type { Project, Conversation, AnalysisSession, User } from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Auth interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const authApi = {
  guest: () => api.post<{ user: User; token: string }>('/auth/guest'),
  github: (code: string) => api.post<{ user: User; token: string }>('/auth/github', { code }),
  gitlab: (code: string, redirectUri: string) =>
    api.post<{ user: User; token: string }>('/auth/gitlab', { code, redirect_uri: redirectUri }),
};

// Projects
export const projectApi = {
  list: (params?: { search?: string; tags?: string }) =>
    api.get<{ projects: Project[] }>('/projects', { params }),
  get: (id: string) => api.get<{ project: Project }>(`/projects/${id}`),
  import: (repoUrl: string, repoType?: string) =>
    api.post<{ project: Project }>('/projects/import', { repoUrl, repoType }),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post<{ project: Project }>('/projects/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  remove: (id: string) => api.delete(`/projects/${id}`),
  sync: (id: string) => api.post(`/projects/${id}/sync`),
  readFile: (id: string, filePath: string) =>
    api.get<{ content: string }>(`/projects/${id}/file`, { params: { path: filePath } }),
};

// Chat
export const chatApi = {
  send: (projectId: string, message: string, conversationId?: string) =>
    api.post<{ conversation_id: string }>('/chat/send', { projectId, message, conversationId }),
  conversations: (projectId: string) =>
    api.get<{ conversations: Conversation[] }>(`/chat/conversations/${projectId}`),
  getConversation: (id: string) => api.get<{ conversation: Conversation }>(`/chat/conversation/${id}`),
  deleteConversation: (id: string) => api.delete(`/chat/conversation/${id}`),
};

// Analysis
export const analysisApi = {
  run: (projectId: string, command?: string) =>
    api.post<{ session_id: string }>('/analysis/run', { projectId, command }),
  sessions: (projectId: string) =>
    api.get<{ sessions: AnalysisSession[] }>(`/analysis/sessions/${projectId}`),
  getSession: (id: string) => api.get<{ session: AnalysisSession }>(`/analysis/session/${id}`),
};

// SSE helper for chat stream
export function createChatStream(
  projectId: string,
  message: string,
  conversationId: string | undefined,
  token: string,
  onChunk: (content: string) => void,
  onDone: () => void,
  onError: (error: string) => void
): AbortController {
  const controller = new AbortController();

  fetch('/api/chat/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ projectId, message, conversationId }),
    signal: controller.signal,
  }).then(async (response) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            onDone();
            return;
          }
          try {
            const event = JSON.parse(data);
            if (event.type === 'chunk') {
              onChunk(event.content);
            } else if (event.type === 'error') {
              onError(event.content);
            }
          } catch { /* skip */ }
        }
      }
    }
    onDone();
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      onError(err.message);
    }
  });

  return controller;
}

// SSE helper for analysis stream
export function createAnalysisStream(
  projectId: string,
  command: string | undefined,
  token: string,
  onStdout: (content: string) => void,
  onStderr: (content: string) => void,
  onComplete: (exitCode: number, results: any) => void,
  onError: (error: string) => void
): AbortController {
  const controller = new AbortController();

  fetch('/api/analysis/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ projectId, command }),
    signal: controller.signal,
  }).then(async (response) => {
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const event = JSON.parse(data);
            if (event.type === 'stdout') onStdout(event.content);
            else if (event.type === 'stderr') onStderr(event.content);
            else if (event.type === 'complete') onComplete(event.exit_code, event.results);
            else if (event.type === 'error') onError(event.content);
          } catch { /* skip */ }
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') onError(err.message);
  });

  return controller;
}

export default api;