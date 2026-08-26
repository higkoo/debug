import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { simpleGit } from 'simple-git';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { validateMarivoProject, buildFileTree, readReadme } from '../utils/marivo-validator';
import { getUserId } from '../utils/guest';
import { query } from '../models/database';
import type { Project } from '../types';

export const projectRouter = Router();

const UPLOAD_DIR = path.resolve(__dirname, '../../uploads');
const PROJECTS_DIR = path.resolve(__dirname, '../../projects');

// Ensure directories exist
[UPLOAD_DIR, PROJECTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 ZIP 格式文件'));
    }
  },
});

// GET /api/projects - List all projects
projectRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, tags, sort } = req.query;
    let sql = 'SELECT * FROM projects WHERE 1=1';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    if (tags) {
      const tagList = (tags as string).split(',');
      tagList.forEach(tag => {
        params.push(tag.trim());
        sql += ` AND $${params.length} = ANY(tags)`;
      });
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json({ projects: result.rows });
  } catch (err) {
    // Fallback: return empty list
    res.json({ projects: [] });
  }
});

// GET /api/projects/:id - Get project detail
projectRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      throw new AppError(404, '项目不存在');
    }
    res.json({ project: result.rows[0] });
  } catch (err) {
    if (err instanceof AppError) throw err;
    res.status(404).json({ error: { message: '项目不存在' } });
  }
});

// POST /api/projects/import - Import from GitHub/GitLab URL (no auth required for public repos)
projectRouter.post('/import', async (req: Request, res: Response) => {
  const { repoUrl, repoType = 'github' } = req.body;

  if (!repoUrl) {
    throw new AppError(400, '请提供仓库 URL');
  }

  const projectId = uuidv4();
  const projectDir = path.join(PROJECTS_DIR, projectId);

  try {
    // Clone the repository (read-only, shallow clone)
    await simpleGit().clone(repoUrl, projectDir, ['--depth=1']);

    // Validate Marivo project
    const validation = await validateMarivoProject(projectDir);

    if (!validation.valid) {
      fs.rmSync(projectDir, { recursive: true, force: true });
      throw new AppError(400, `项目验证失败: ${validation.errors.join('; ')}`);
    }

    // Build file tree and read README
    const fileTree = buildFileTree(projectDir);
    const readme = readReadme(projectDir);

    const repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'untitled';
    const projectName = validation.name || repoName;
    const projectDesc = validation.config?.description || validation.config?.project?.description || '';
    const projectAuthor = validation.config?.author || validation.config?.project?.author || '';

    // Save to database (guest user if not authenticated)
    const userId = getUserId(req);
    const result = await query(
      `INSERT INTO projects (id, user_id, name, description, repo_url, repo_type, source_type, local_path, is_valid_marivo, tags, readme, file_structure, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        projectId, userId, projectName, projectDesc,
        repoUrl, repoType, 'import', projectDir, true,
        projectAuthor ? [projectAuthor] : [],
        readme, JSON.stringify(fileTree), JSON.stringify(validation.config || {}),
      ]
    );

    res.status(201).json({ project: result.rows[0] });
  } catch (err) {
    if (fs.existsSync(projectDir)) {
      fs.rmSync(projectDir, { recursive: true, force: true });
    }
    if (err instanceof AppError) throw err;
    throw new AppError(500, `导入项目失败: ${(err as Error).message}`);
  }
});

// POST /api/projects/upload - Upload ZIP (no auth required, uses guest user)
projectRouter.post(
  '/upload',
  upload.single('file'),
  async (req: Request, res: Response) => {
    if (!req.file) {
      throw new AppError(400, '请上传一个 ZIP 文件');
    }

    const projectId = uuidv4();
    const projectDir = path.join(PROJECTS_DIR, projectId);
    const zipPath = req.file.path;

    try {
      // Extract ZIP
      const AdmZip = (await import('adm-zip')).default;
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(projectDir, true);

      // Handle nested directory (single top-level folder)
      const entries = fs.readdirSync(projectDir);
      if (entries.length === 1 && fs.statSync(path.join(projectDir, entries[0])).isDirectory()) {
        const nestedDir = path.join(projectDir, entries[0]);
        const tempDir = path.join(PROJECTS_DIR, `${projectId}_tmp`);
        fs.renameSync(nestedDir, tempDir);
        fs.rmSync(projectDir, { recursive: true, force: true });
        fs.renameSync(tempDir, projectDir);
      }

      // Validate Marivo project
      const validation = await validateMarivoProject(projectDir);

      if (!validation.valid) {
        fs.rmSync(projectDir, { recursive: true, force: true });
        throw new AppError(400, `项目验证失败: ${validation.errors.join('; ')}`);
      }

      // Build file tree and read README
      const fileTree = buildFileTree(projectDir);
      const readme = readReadme(projectDir);

      // Save to database (guest user if not authenticated)
      const userId = getUserId(req);
      const uploadName = validation.name || 'untitled';
      const uploadDesc = validation.config?.description || validation.config?.project?.description || '';
      const uploadAuthor = validation.config?.author || validation.config?.project?.author || '';
      const result = await query(
        `INSERT INTO projects (id, user_id, name, description, source_type, local_path, is_valid_marivo, tags, readme, file_structure, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          projectId, userId, uploadName, uploadDesc,
          'upload', projectDir, true,
          uploadAuthor ? [uploadAuthor] : [],
          readme, JSON.stringify(fileTree), JSON.stringify(validation.config || {}),
        ]
      );

      // Clean up uploaded ZIP
      fs.unlinkSync(zipPath);

      res.status(201).json({ project: result.rows[0] });
    } catch (err) {
      // Cleanup on failure
      if (fs.existsSync(projectDir)) fs.rmSync(projectDir, { recursive: true, force: true });
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      if (err instanceof AppError) throw err;
      throw new AppError(500, `上传项目失败: ${(err as Error).message}`);
    }
  }
);

// DELETE /api/projects/:id
projectRouter.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const result = await query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [
    req.params.id, req.user!.id,
  ]);

  if (result.rows.length === 0) {
    throw new AppError(404, '项目不存在或无权删除');
  }

  const project = result.rows[0];

  // Remove local files
  if (fs.existsSync(project.local_path)) {
    fs.rmSync(project.local_path, { recursive: true, force: true });
  }

  await query('DELETE FROM projects WHERE id = $1', [req.params.id]);
  res.json({ message: '项目已删除' });
});

// POST /api/projects/:id/sync - Sync from remote
projectRouter.post('/:id/sync', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  const result = await query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [
    req.params.id, req.user!.id,
  ]);

  if (result.rows.length === 0) {
    throw new AppError(404, '项目不存在');
  }

  const project = result.rows[0];

  if (!project.repo_url) {
    throw new AppError(400, '该项目没有关联的远程仓库');
  }

  try {
    await simpleGit(project.local_path).pull();
    const fileTree = buildFileTree(project.local_path);
    const readme = readReadme(project.local_path);

    await query(
      'UPDATE projects SET file_structure = $1, readme = $2, updated_at = NOW() WHERE id = $3',
      [JSON.stringify(fileTree), readme, req.params.id]
    );

    res.json({ message: '项目已同步', file_structure: fileTree });
  } catch (err) {
    throw new AppError(500, `同步失败: ${(err as Error).message}`);
  }
});

// GET /api/projects/:id/file - Read file content
projectRouter.get('/:id/file', async (req: Request, res: Response) => {
  const { path: filePath } = req.query;

  const result = await query('SELECT local_path FROM projects WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) {
    throw new AppError(404, '项目不存在');
  }

  const fullPath = path.join(result.rows[0].local_path, filePath as string);
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) {
    throw new AppError(404, '文件不存在');
  }

  const content = fs.readFileSync(fullPath, 'utf-8');
  res.json({ content, path: filePath });
});