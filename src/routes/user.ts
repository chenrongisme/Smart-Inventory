import { Router } from 'express';
import { run } from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// POST /api/user/factory-reset
router.post('/factory-reset', authenticate, async (req: AuthRequest, res) => {
  const user = req.user!;
  const clientIp = req.ip || req.socket.remoteAddress;

  try {
    const userCond = (user.role === 'admin' || user.role === 'superadmin')
      ? 'WHERE user_id != $1'
      : 'WHERE user_id = $1';
    const params: any[] = [user.id];

    await run(`DELETE FROM action_history ${userCond}`, params);
    await run(`DELETE FROM items ${userCond}`, params);
    await run(`DELETE FROM sub_cabinets WHERE cabinet_id IN (SELECT id FROM cabinets ${userCond})`, params);
    await run(`DELETE FROM cabinets ${userCond}`, params);

    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
