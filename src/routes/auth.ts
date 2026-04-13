import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query, queryOne, run } from '../database';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Password complexity: must contain upper, lower, number, and special char
function isPasswordComplex(pwd: string): boolean {
  return (
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) &&
    /[a-z]/.test(pwd) &&
    /[0-9]/.test(pwd) &&
    /[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]/.test(pwd)
  );
}

// Audit log helper
async function auditLog(userId: number | null, action: string, details: any, ip?: string) {
  await run(
    `INSERT INTO audit_logs (user_id, action, details, ip_address) VALUES ($1, $2, $3, $4)`,
    [userId, action, JSON.stringify(details), ip || null]
  );
}

// POST /api/auth/register
router.post('/register', rateLimitMiddleware('register'), async (req, res) => {
  const { username, password, security_question, security_answer } = req.body;
  const clientIp = req.ip || req.socket.remoteAddress;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码是必填项' });
  }

  if (!isPasswordComplex(password)) {
    return res.status(400).json({
      error: '密码必须至少8位，包含大小写字母、数字和特殊字符'
    });
  }

  try {
    const existing = await queryOne('SELECT id FROM users WHERE username = $1', [username]);
    if (existing) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const hashed = bcrypt.hashSync(password, 12);

    // First user becomes superadmin
    const countResult = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM users');
    const role = (countResult && parseInt(countResult.count) === 0) ? 'superadmin' : 'user';

    const result = await run(
      `INSERT INTO users (username, password, security_question, security_answer, role, must_change_password)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id`,
      [username, hashed, security_question, security_answer, role]
    );

    await auditLog(result.lastID, 'user.register', { username }, clientIp);

    res.json({ id: result.lastID, role, mustChangePassword: false });
  } catch (err: any) {
    console.error('Registration error:', err);
    if (err.code === '23505') { // unique violation
      return res.status(400).json({ error: '用户名已存在' });
    }
    res.status(500).json({ error: '注册时数据库错误' });
  }
});

// POST /api/auth/login
router.post('/login', rateLimitMiddleware('login'), async (req, res) => {
  const { username, password } = req.body;
  const clientIp = req.ip || req.socket.remoteAddress;

  try {
    const user = await queryOne<any>(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (!user || !bcrypt.compareSync(password, user.password)) {
      await auditLog(null, 'auth.login.failed', { username, reason: 'invalid_credentials' }, clientIp);
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (user.status === 'blocked') {
      await auditLog(user.id, 'auth.login.blocked', {}, clientIp);
      return res.status(403).json({ error: '您的账号已被限制登录' });
    }

    // If must change password, reject normal login
    if (user.must_change_password) {
      return res.status(403).json({
        error: 'must_change_password',
        message: '首次登录必须修改密码'
      });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    await auditLog(user.id, 'auth.login.success', {}, clientIp);

    res.json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req: AuthRequest, res) => {
  const { oldPassword, newPassword } = req.body;
  const clientIp = req.ip || req.socket.remoteAddress;
  const userId = req.user!.id;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '旧密码和新密码都是必填项' });
  }

  if (!isPasswordComplex(newPassword)) {
    return res.status(400).json({
      error: '新密码必须至少8位，包含大小写字母、数字和特殊字符'
    });
  }

  try {
    const user = await queryOne<any>('SELECT password FROM users WHERE id = $1', [userId]);
    if (!user || !bcrypt.compareSync(oldPassword, user.password)) {
      await auditLog(userId, 'auth.change_password.failed', { reason: 'wrong_old_password' }, clientIp);
      return res.status(401).json({ error: '旧密码错误' });
    }

    const hashed = bcrypt.hashSync(newPassword, 12);
    await run('UPDATE users SET password = $1, must_change_password = false, updated_at = NOW() WHERE id = $2', [hashed, userId]);

    await auditLog(userId, 'auth.change_password.success', {}, clientIp);

    res.json({ success: true });
  } catch (err: any) {
    console.error('Change password error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/auth/force-change-password (for must_change_password flow)
router.post('/force-change-password', async (req, res) => {
  const { username, oldPassword, newPassword } = req.body;
  const clientIp = req.ip || req.socket.remoteAddress;

  if (!username || !oldPassword || !newPassword) {
    return res.status(400).json({ error: '所有字段都是必填项' });
  }

  if (!isPasswordComplex(newPassword)) {
    return res.status(400).json({
      error: '新密码必须至少8位，包含大小写字母、数字和特殊字符'
    });
  }

  try {
    const user = await queryOne<any>('SELECT * FROM users WHERE username = $1', [username]);
    if (!user || !bcrypt.compareSync(oldPassword, user.password)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    if (!user.must_change_password) {
      return res.status(400).json({ error: '当前账号无需强制改密' });
    }

    const hashed = bcrypt.hashSync(newPassword, 12);
    await run('UPDATE users SET password = $1, must_change_password = false, updated_at = NOW() WHERE id = $2', [hashed, user.id]);

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/'
    });

    await auditLog(user.id, 'auth.force_change_password.success', {}, clientIp);

    res.json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (err: any) {
    console.error('Force change password error:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res) => {
  const clientIp = req.ip || req.socket.remoteAddress;
  await auditLog(req.user!.id, 'auth.logout', {}, clientIp);
  res.clearCookie('token');
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    const user = await queryOne<any>(
      'SELECT id, username, role, status, must_change_password FROM users WHERE id = $1',
      [req.user!.id]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/setup-status
router.get('/setup-status', async (req, res) => {
  const result = await queryOne<{ count: string }>('SELECT COUNT(*) as count FROM users');
  res.json({ totalUsers: parseInt(result?.count || '0', 10) });
});

// POST /api/auth/recover-question
router.post('/recover-question', rateLimitMiddleware('recover'), async (req, res) => {
  const { username } = req.body;
  const user = await queryOne<any>('SELECT security_question FROM users WHERE username = $1', [username]);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  res.json({ question: user.security_question || '' });
});

// POST /api/auth/recover-reset
router.post('/recover-reset', rateLimitMiddleware('recover-reset'), async (req, res) => {
  const { username, answer, newPassword } = req.body;
  const clientIp = req.ip || req.socket.remoteAddress;

  if (!username || !answer || !newPassword) {
    return res.status(400).json({ error: '所有字段都是必填项' });
  }

  if (!isPasswordComplex(newPassword)) {
    return res.status(400).json({
      error: '新密码必须至少8位，包含大小写字母、数字和特殊字符'
    });
  }

  try {
    const user = await queryOne<any>('SELECT * FROM users WHERE username = $1', [username]);
    if (!user || user.security_answer !== answer) {
      await auditLog(null, 'auth.recover.failed', { username }, clientIp);
      return res.status(401).json({ error: '安全答案不正确' });
    }

    const hashed = bcrypt.hashSync(newPassword, 12);
    await run('UPDATE users SET password = $1, must_change_password = false, updated_at = NOW() WHERE id = $2', [hashed, user.id]);

    await auditLog(user.id, 'auth.recover.reset', {}, clientIp);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
