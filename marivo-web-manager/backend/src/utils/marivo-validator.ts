import fs from 'fs';
import path from 'path';
import toml from 'toml';
import type { MarivoConfig } from '../types';

export async function validateMarivoProject(projectPath: string): Promise<{
  valid: boolean;
  config?: MarivoConfig;
  name: string;
  errors: string[];
}> {
  const errors: string[] = [];

  // Check if marivo.toml exists
  const configPath = path.join(projectPath, 'marivo.toml');
  if (!fs.existsSync(configPath)) {
    errors.push('缺少 marivo.toml 配置文件');
    return { valid: false, name: '', errors };
  }

  // Parse and validate config
  let config: MarivoConfig;
  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    config = toml.parse(configContent) as MarivoConfig;
  } catch (err) {
    errors.push(`marivo.toml 解析失败: ${(err as Error).message}`);
    return { valid: false, name: '', errors };
  }

  // Extract name - can be at root or under [project] table
  const projectName = config.name || config.project?.name || '';
  if (!projectName) {
    errors.push('marivo.toml 缺少 name 字段（可在顶层或 [project] 表下）');
  }

  // Check models directory
  const modelsDir = path.join(projectPath, 'models');
  if (!fs.existsSync(modelsDir) || !fs.statSync(modelsDir).isDirectory()) {
    errors.push('缺少 models/ 目录');
  }

  if (errors.length === 0 && fs.existsSync(modelsDir)) {
    const models = fs.readdirSync(modelsDir);
    if (models.length === 0) {
      errors.push('models/ 目录为空，需要至少一个模型定义文件');
    }
  }

  return {
    valid: errors.length === 0,
    config,
    name: projectName,
    errors,
  };
}

export function buildFileTree(rootPath: string, relPath?: string): any[] {
  const fullPath = relPath ? path.join(rootPath, relPath) : rootPath;
  const items = fs.readdirSync(fullPath);

  return items
    .filter(item => !item.startsWith('.') && item !== 'node_modules' && item !== '.git')
    .map(item => {
      const itemFullPath = path.join(fullPath, item);
      const stat = fs.statSync(itemFullPath);

      if (stat.isDirectory()) {
        return {
          name: item,
          type: 'dir' as const,
          children: buildFileTree(rootPath, relPath ? path.join(relPath, item) : item),
        };
      }

      return {
        name: item,
        type: 'file' as const,
      };
    });
}

export function readReadme(projectPath: string): string | null {
  const readmes = ['README.md', 'README', 'readme.md', 'readme'];
  for (const name of readmes) {
    const readmePath = path.join(projectPath, name);
    if (fs.existsSync(readmePath)) {
      return fs.readFileSync(readmePath, 'utf-8');
    }
  }
  return null;
}