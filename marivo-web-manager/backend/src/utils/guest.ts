import { v4 as uuidv4 } from 'uuid';

/**
 * Returns a consistent guest user ID for anonymous operations.
 * Tries to use the database, falls back to a fixed UUID.
 */
let cachedGuestId: string | null = null;

export async function getGuestUserId(): Promise<string> {
  if (cachedGuestId) return cachedGuestId;

  try {
    const { query } = await import('../models/database');
    const result = await query(
      `INSERT INTO users (id, username) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
       RETURNING id`,
      ['00000000-0000-0000-0000-000000000001', '访客']
    );
    cachedGuestId = result.rows[0].id;
  } catch {
    // DB not available, use fixed ID
    cachedGuestId = '00000000-0000-0000-0000-000000000001';
  }

  return cachedGuestId!;
}

/**
 * Checks if a request has an authenticated user, falls back to guest.
 */
export function getUserId(req: any): string {
  return req.user?.id || '00000000-0000-0000-0000-000000000001';
}