import { Router } from 'express';
import { query } from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/history
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const rows = await query<any>(
      `SELECT h.*,
              COALESCE(i.name, '已删除物品') as item_name,
              c.name as cabinet_name,
              sc.name as sub_name
       FROM action_history h
       LEFT JOIN items i ON h.item_id = i.id
       LEFT JOIN cabinets c ON i.cabinet_id = c.id
       LEFT JOIN sub_cabinets sc ON i.sub_cabinet_id = sc.id
       WHERE h.user_id = $1
       ORDER BY h.timestamp DESC
       LIMIT 50`,
      [req.user!.id]
    );
    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
