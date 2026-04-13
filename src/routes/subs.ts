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

// GET /api/subs/:id
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const sub = await queryOne<any>(
      `SELECT sc.*, c.user_id FROM sub_cabinets sc
       JOIN cabinets c ON sc.cabinet_id = c.id
       WHERE sc.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user!.id]
    );
    if (!sub) return res.status(404).json({ error: 'Not found' });
    res.json(sub);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subs/:id
router.put('/:id', authenticate, upload.single('image'), async (req: AuthRequest, res) => {
  try {
    const { name, details } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    const sub = await queryOne(
      `SELECT sc.id FROM sub_cabinets sc
       JOIN cabinets c ON sc.cabinet_id = c.id
       WHERE sc.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user!.id]
    );
    if (!sub) return res.status(404).json({ error: 'Not found or unauthorized' });

    let queryText = 'UPDATE sub_cabinets SET name = $1, details = $2';
    let params: any[] = [name, details];

    if (imageUrl) {
      params.push(imageUrl);
      queryText += `, image_url = $${params.length}`;
    }

    params.push(req.params.id);
    queryText += ` WHERE id = $${params.length} RETURNING id`;

    const result = await run(queryText, params);
    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/subs/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const sub = await queryOne(
      `SELECT sc.id FROM sub_cabinets sc
       JOIN cabinets c ON sc.cabinet_id = c.id
       WHERE sc.id = $1 AND c.user_id = $2`,
      [req.params.id, req.user!.id]
    );
    if (!sub) return res.status(404).json({ error: 'Not found or unauthorized' });

    await run('DELETE FROM items WHERE sub_cabinet_id = $1', [req.params.id]);
    await run('DELETE FROM sub_cabinets WHERE id = $1', [req.params.id]);

    res.json({ success: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
