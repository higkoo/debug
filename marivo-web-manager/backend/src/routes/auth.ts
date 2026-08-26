import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { createToken } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { query } from '../models/database';

export const authRouter = Router();

// POST /api/auth/guest - Guest login (for quick start)
authRouter.post('/guest', async (_req: Request, res: Response) => {
  const guestId = uuidv4();
  const username = `访客_${guestId.slice(0, 8)}`;

  try {
    const result = await query(
      'INSERT INTO users (id, username) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET updated_at = NOW() RETURNING *',
      [guestId, username]
    );
    const user = result.rows[0];
    const token = createToken({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
    });
    res.json({ user, token });
  } catch {
    // Fallback: return guest token without DB
    const user = { id: guestId, username, email: undefined, avatar_url: undefined };
    const token = createToken(user);
    res.json({ user, token });
  }
});

// POST /api/auth/github - GitHub OAuth callback
authRouter.post('/github', async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    throw new AppError(400, '缺少授权码');
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json() as any;

    if (!tokenData.access_token) {
      throw new AppError(401, 'GitHub 授权失败');
    }

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const githubUser = await userResponse.json() as any;

    // Find or create user
    const existing = await query('SELECT * FROM users WHERE github_id = $1', [githubUser.id.toString()]);

    let user;
    if (existing.rows.length > 0) {
      user = existing.rows[0];
      await query(
        'UPDATE users SET username = $1, avatar_url = $2, email = $3, updated_at = NOW() WHERE id = $4',
        [githubUser.login, githubUser.avatar_url, githubUser.email, user.id]
      );
    } else {
      const result = await query(
        'INSERT INTO users (id, username, email, avatar_url, github_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [uuidv4(), githubUser.login, githubUser.email, githubUser.avatar_url, githubUser.id.toString()]
      );
      user = result.rows[0];
    }

    const token = createToken({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
    });

    res.json({ user, token });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, 'GitHub 登录失败');
  }
});

// POST /api/auth/gitlab - GitLab OAuth callback
authRouter.post('/gitlab', async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    throw new AppError(400, '缺少授权码');
  }

  try {
    const tokenResponse = await fetch('https://gitlab.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.GITLAB_CLIENT_ID,
        client_secret: process.env.GITLAB_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: req.body.redirect_uri || '',
      }),
    });

    const tokenData = await tokenResponse.json() as any;

    if (!tokenData.access_token) {
      throw new AppError(401, 'GitLab 授权失败');
    }

    const userResponse = await fetch('https://gitlab.com/api/v4/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const gitlabUser = await userResponse.json() as any;

    const existing = await query('SELECT * FROM users WHERE gitlab_id = $1', [gitlabUser.id.toString()]);

    let user;
    if (existing.rows.length > 0) {
      user = existing.rows[0];
      await query(
        'UPDATE users SET username = $1, avatar_url = $2, email = $3, updated_at = NOW() WHERE id = $4',
        [gitlabUser.username, gitlabUser.avatar_url, gitlabUser.email, user.id]
      );
    } else {
      const result = await query(
        'INSERT INTO users (id, username, email, avatar_url, gitlab_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [uuidv4(), gitlabUser.username, gitlabUser.email, gitlabUser.avatar_url, gitlabUser.id.toString()]
      );
      user = result.rows[0];
    }

    const token = createToken({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
    });

    res.json({ user, token });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(500, 'GitLab 登录失败');
  }
});