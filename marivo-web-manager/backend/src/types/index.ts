export interface User {
  id: string;
  username: string;
  email?: string;
  avatar_url?: string;
  github_id?: string;
  gitlab_id?: string;
  created_at: Date;
}

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
  created_at: Date;
}

export interface FileNode {
  name: string;
  type: 'file' | 'dir';
  children?: FileNode[];
}

export interface Conversation {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: Date;
  updated_at: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AnalysisSession {
  id: string;
  project_id: string;
  user_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  command?: string;
  output?: string;
  results: any;
  started_at: Date;
  completed_at?: Date;
}

export interface MarivoConfig {
  project?: {
    name: string;
    version: string;
    description?: string;
    author?: string;
  };
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  data_source?: string;
}