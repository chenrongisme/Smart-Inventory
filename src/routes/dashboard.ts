import { Router } from 'express';
import { query, queryOne } from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const today = new Date().toISOString().split('T')[0];
    const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const [totalItems, totalLocations, lowStockCount, expiringSoonCount] = await Promise.all([
      queryOne<{ count: string }>('SELECT COUNT(*) as count FROM items WHERE user_id = $1', [userId]),
      queryOne<{ count: string }>('SELECT COUNT(*) as count FROM cabinets WHERE user_id = $1', [userId]),
      queryOne<{ count: string }>('SELECT COUNT(*) as count FROM items WHERE user_id = $1 AND quantity <= min_threshold AND min_threshold > 0', [userId]),
      queryOne<{ count: string }>(
        'SELECT COUNT(*) as count FROM items WHERE user_id = $1 AND expiry_date IS NOT NULL AND expiry_date <= $2 AND expiry_date >= $3',
        [userId, soon, today]
      )
    ]);

    res.json({
      totalItems: parseInt(totalItems?.count || '0', 10),
      totalLocations: parseInt(totalLocations?.count || '0', 10),
      lowStockCount: parseInt(lowStockCount?.count || '0', 10),
      expiringSoonCount: parseInt(expiringSoonCount?.count || '0', 10)
    });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
