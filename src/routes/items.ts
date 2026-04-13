import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { query, queryOne, run } from '../database';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const UPLOADS_DIR = './uploads';

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// GET /api/items
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { cabinet_id, sub_cabinet_id, search, all } = req.query;
    const user = req.user!;

    let queryText = `
      SELECT i.*,
             COALESCE(c.name, pc.name) as cabinet_name,
             sc.name as sub_cabinet_name
      FROM items i
      LEFT JOIN cabinets c ON i.cabinet_id = c.id
      LEFT JOIN sub_cabinets sc ON i.sub_cabinet_id = sc.id
      LEFT JOIN cabinets pc ON sc.cabinet_id = pc.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (user.role === 'admin' && all === 'true') {
      // sees all
    } else {
      params.push(user.id);
      queryText += ` AND i.user_id = $${params.length}`;
    }

    if (cabinet_id) {
      params.push(cabinet_id);
      queryText += ` AND i.cabinet_id = $${params.length}`;
    } else if (sub_cabinet_id) {
      params.push(sub_cabinet_id);
      queryText += ` AND i.sub_cabinet_id = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      queryText += ` AND (i.name LIKE $${params.length} OR i.details LIKE $${params.length})`;
    }

    queryText += ' ORDER BY i.id DESC';

    const rows = await query<any>(queryText, params);
    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/items
router.post('/', authenticate, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    const { name, details, quantity, cabinet_id, sub_cabinet_id, expiry_date, min_threshold } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await run(
      `INSERT INTO items (user_id, cabinet_id, sub_cabinet_id, name, details, quantity, image_url, expiry_date, min_threshold)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [req.user!.id, cabinet_id || null, sub_cabinet_id || null, name, details, quantity || 0, imageUrl, expiry_date || null, min_threshold || 0]
    );

    await run(
      `INSERT INTO action_history (user_id, item_id, action_type, quantity_change) VALUES ($1, $2, 'create', $3)`,
      [req.user!.id, result.lastID, quantity || 0]
    );

    res.json({ id: result.lastID });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/items/:id
router.put('/:id', authenticate, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    const { name, details, quantity, expiry_date, min_threshold } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    let queryText = 'UPDATE items SET name = $1, details = $2, quantity = $3, expiry_date = $4, min_threshold = $5';
    let params: any[] = [name, details, quantity, expiry_date || null, min_threshold || 0];

    if (imageUrl) {
      params.push(imageUrl);
      queryText += `, image_url = $${params.length}`;
    }

    params.push(req.params.id, req.user!.id);
    queryText += ` WHERE id = $${params.length - 1} AND user_id = $${params.length}`;

    const result = await run(queryText, params);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/items/:id/quantity
router.patch('/:id/quantity', authenticate, async (req: AuthRequest, res) => {
  try {
    const { change, value } = req.body;

    const item = await queryOne<any>(
      'SELECT * FROM items WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (!item) return res.status(404).json({ error: 'Not found' });

    let newQty: number;
    let actualChange: number;

    if (value !== undefined) {
      newQty = Math.max(0, parseInt(value));
      actualChange = newQty - item.quantity;
    } else {
      newQty = Math.max(0, item.quantity + change);
      actualChange = change;
    }

    await run('UPDATE items SET quantity = $1, updated_at = NOW() WHERE id = $2', [newQty, req.params.id]);

    await run(
      `INSERT INTO action_history (user_id, item_id, action_type, quantity_change) VALUES ($1, $2, $3, $4)`,
      [req.user!.id, req.params.id, actualChange >= 0 ? 'store' : 'take', actualChange]
    );

    res.json({ quantity: newQty });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/items/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const result = await run(
      'DELETE FROM items WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user!.id]
    );
    if (result.rowsAffected === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
