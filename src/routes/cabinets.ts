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

// GET /api/cabinets
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const rows = await query<any>(
      'SELECT * FROM cabinets WHERE user_id = $1 ORDER BY id DESC',
      [req.user!.id]
    );
    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cabinets/:id
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const cabinet = await queryOne<any>(
      'SELECT * FROM cabinets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (!cabinet) return res.status(404).json({ error: 'Not found' });
    res.json(cabinet);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cabinets
router.post('/', authenticate, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    const { name, details, type } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await run(
      `INSERT INTO cabinets (user_id, name, details, type, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.user!.id, name, details, type, imageUrl]
    );
    res.json({ id: result.lastID });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/cabinets/:id
router.put('/:id', authenticate, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    const { name, details } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    let queryText = 'UPDATE cabinets SET name = $1, details = $2';
    let params: any[] = [name, details];

    if (imageUrl) {
      params.push(imageUrl);
      queryText += `, image_url = $${params.length}`;
    }

    params.push(req.params.id, req.user!.id);
    queryText += ` WHERE id = $${params.length - 1} AND user_id = $${params.length} RETURNING id`;

    const result = await run(queryText, params);
    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'Not found or unauthorized' });
    }
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/cabinets/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const cabinet = await queryOne(
      'SELECT id FROM cabinets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (!cabinet) return res.status(404).json({ error: 'Not found or unauthorized' });

    await run('DELETE FROM items WHERE sub_cabinet_id IN (SELECT id FROM sub_cabinets WHERE cabinet_id = $1)', [req.params.id]);
    await run('DELETE FROM items WHERE cabinet_id = $1', [req.params.id]);
    await run('DELETE FROM sub_cabinets WHERE cabinet_id = $1', [req.params.id]);
    await run('DELETE FROM cabinets WHERE id = $1', [req.params.id]);

    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/cabinets/:id/subs
router.get('/:id/subs', authenticate, async (req: AuthRequest, res) => {
  try {
    const cabinet = await queryOne(
      'SELECT id FROM cabinets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (!cabinet) return res.status(404).json({ error: 'Not found or unauthorized' });

    const rows = await query<any>(
      'SELECT * FROM sub_cabinets WHERE cabinet_id = $1 ORDER BY id DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/cabinets/:id/subs
router.post('/:id/subs', authenticate, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    const cabinet = await queryOne(
      'SELECT id FROM cabinets WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.id]
    );
    if (!cabinet) return res.status(404).json({ error: 'Not found or unauthorized' });

    const { name, details } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const result = await run(
      `INSERT INTO sub_cabinets (cabinet_id, name, details, image_url) VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.params.id, name, details, imageUrl]
    );
    res.json({ id: result.lastID });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
