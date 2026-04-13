import { Router } from 'express';
import bcrypt from 'bcryptjs';
import AdmZip from 'adm-zip';
import fs from 'fs';
import { query, queryOne, run } from '../database';
import { authenticate, requireAdmin, requireSuperAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
const UPLOADS_DIR = './uploads';
const DB_PATH = process.env.DATABASE_URL || './data/inventory.db';

async function auditLog(userId: number | null, action: string, details: any, ip?: string) {
  await run(
    `INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)`,
    [userId, action, JSON.stringify(details), ip || null]
  );
}

// GET /api/admin/settings
router.get('/settings', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const rows = await query<{ key: string; value: string }>('SELECT key, value FROM settings');
    const settings: Record<string, string> = {};
    rows.forEach(row => settings[row.key] = row.value);
    res.json(settings);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/settings
router.post('/settings', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await run('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2', [key, value]);
    }
    res.json({ message: 'Settings updated' });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const rows = await query<any>('SELECT id, username, role, status FROM users ORDER BY id');
    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/reset-password
router.post('/reset-password', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { userId, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }
    const hashed = bcrypt.hashSync(newPassword, 12);
    await run('UPDATE users SET password = $1 WHERE id = $2', [hashed, userId]);
    await auditLog(req.user!.id, 'admin.reset_password', { targetUserId: userId }, req.ip);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/users/:id/status
router.patch('/users/:id/status', authenticate, requireSuperAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    await run('UPDATE users SET status = $1 WHERE id = $2', [status, req.params.id]);
    await auditLog(req.user!.id, 'admin.update_user_status', { targetUserId: req.params.id, status }, req.ip);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', authenticate, requireSuperAdmin, async (req: AuthRequest, res) => {
  const clientIp = req.ip || req.socket.remoteAddress;
  const targetId = req.params.id;

  try {
    await run('DELETE FROM action_history WHERE user_id = $1', [targetId]);
    await run('DELETE FROM items WHERE user_id = $1', [targetId]);
    await run('DELETE FROM sub_cabinets WHERE cabinet_id IN (SELECT id FROM cabinets WHERE user_id = $1)', [targetId]);
    await run('DELETE FROM cabinets WHERE user_id = $1', [targetId]);
    await run('DELETE FROM users WHERE id = $1', [targetId]);

    await auditLog(req.user!.id, 'admin.delete_user', { targetUserId: targetId }, clientIp);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats
router.get('/stats', authenticate, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const [totalUsers, totalCabinets, totalItems, userBreakdown] = await Promise.all([
      queryOne<{ count: string }>('SELECT COUNT(*) as count FROM users'),
      queryOne<{ count: string }>('SELECT COUNT(*) as count FROM cabinets'),
      queryOne<{ count: string }>('SELECT COUNT(*) as count FROM items'),
      query<any>(`
        SELECT u.username,
               (SELECT COUNT(*) FROM cabinets WHERE user_id = u.id) as cabinets,
               (SELECT COUNT(*) FROM items WHERE user_id = u.id) as items
        FROM users u
      `)
    ]);

    res.json({
      totalUsers: parseInt(totalUsers?.count || '0', 10),
      totalCabinets: parseInt(totalCabinets?.count || '0', 10),
      totalItems: parseInt(totalItems?.count || '0', 10),
      userBreakdown
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/backup-all
router.get('/backup-all', authenticate, requireSuperAdmin, async (req: AuthRequest, res) => {
  // For PostgreSQL, we do a pg_dump equivalent via the postgres connection
  // For now, export users + settings as JSON (full backup needs pg_dump binary)
  try {
    const users = await query('SELECT * FROM users');
    const settings = await query('SELECT * FROM settings');

    const zip = new AdmZip();
    zip.addFile('users.json', Buffer.from(JSON.stringify(users, null, 2)));
    zip.addFile('settings.json', Buffer.from(JSON.stringify(settings, null, 2)));

    const zipBuffer = zip.toBuffer();
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename=system_full_backup_${new Date().toISOString().split('T')[0]}.zip`);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
