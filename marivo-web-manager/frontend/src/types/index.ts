export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  repo_url?: string;
  repo_type: 'github' | 'gitlab';
  source_type: 'import' | 'upload' | 'template';
  local_path: string;
  is_valid_marivo: boolean;
  tags: string[];
  readme?: string;
  file_structure: FileNode[];
  metadata: Record<string, any>;
  created_at: string;
}

export interface FileNode {
  name: string;
  type: 'file' | 'dir';
  children?: FileNode[];
}

export interface Conversation {
  id: string;
  project_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AnalysisSession {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  command?: string;
  output?: string;
  results?: any;
  started_at: string;
  completed_at?: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  token?: string;
}

export interface SSEEvent {
  type: 'chunk' | 'conversation_id' | 'session_id' | 'stdout' | 'stderr' | 'complete' | 'error';
  content?: string;
  conversation_id?: string;
  session_id?: string;
  exit_code?: number;
  results?: any;
}