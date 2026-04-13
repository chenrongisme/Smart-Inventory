import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import AdmZip from 'adm-zip';
import fs from 'fs';
import { query } from '../database';
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

// GET /api/backup
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const [cabinets, subs, items, history] = await Promise.all([
      query<any>('SELECT * FROM cabinets WHERE user_id = $1', [userId]),
      query<any>('SELECT * FROM sub_cabinets WHERE cabinet_id IN (SELECT id FROM cabinets WHERE user_id = $1)', [userId]),
      query<any>('SELECT * FROM items WHERE user_id = $1', [userId]),
      query<any>('SELECT * FROM action_history WHERE user_id = $1', [userId])
    ]);

    const backupData = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      cabinets,
      sub_cabinets: subs,
      items,
      action_history: history
    };

    const zip = new AdmZip();
    zip.addFile('data.json', Buffer.from(JSON.stringify(backupData, null, 2)));

    // Add uploaded images
    const imageUrls = new Set<string>();
    cabinets.forEach((c: any) => { if (c.image_url) imageUrls.add(c.image_url); });
    subs.forEach((s: any) => { if (s.image_url) imageUrls.add(s.image_url); });
    items.forEach((i: any) => { if (i.image_url) imageUrls.add(i.image_url); });

    imageUrls.forEach((imageUrl) => {
      const fileName = path.basename(imageUrl);
      const filePath = path.join(UPLOADS_DIR, fileName);
      if (fs.existsSync(filePath)) {
        zip.addLocalFile(filePath, 'images');
      }
    });

    const zipBuffer = zip.toBuffer();
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename=backup_${new Date().toISOString().split('T')[0]}.zip`);
    res.send(zipBuffer);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/restore
router.post('/', authenticate, upload.single('backup'), async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const zipFile = req.file;

  if (!zipFile) {
    return res.status(400).json({ error: 'Missing backup zip file' });
  }

  try {
    const zip = new AdmZip(zipFile.path);
    const dataEntry = zip.getEntry('data.json');
    if (!dataEntry) throw new Error('data.json not found in backup');

    const backupData = JSON.parse(dataEntry.getData().toString('utf8'));
    const { cabinets, sub_cabinets, items } = backupData;

    // Extract images
    zip.getEntries().forEach((entry) => {
      if (entry.entryName.startsWith('images/') && !entry.isDirectory) {
        const fileName = path.basename(entry.entryName);
        const destPath = path.join(UPLOADS_DIR, fileName);
        fs.writeFileSync(destPath, entry.getData());
      }
    });

    // Clear existing data
    await query('DELETE FROM action_history WHERE user_id = $1', [userId]);
    await query('DELETE FROM items WHERE user_id = $1', [userId]);
    await query('DELETE FROM sub_cabinets WHERE cabinet_id IN (SELECT id FROM cabinets WHERE user_id = $1)', [userId]);
    await query('DELETE FROM cabinets WHERE user_id = $1', [userId]);

    const cabinetMap = new Map<number, number>();
    const subMap = new Map<number, number>();

    // Insert cabinets
    for (const cab of cabinets || []) {
      const result = await query<any>(
        `INSERT INTO cabinets (user_id, name, details, type, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [userId, cab.name, cab.details, cab.type, cab.image_url]
      );
      cabinetMap.set(cab.id, result[0].id);
    }

    // Insert sub-cabinets
    for (const sub of sub_cabinets || []) {
      const newCabinetId = cabinetMap.get(sub.cabinet_id);
      if (!newCabinetId) continue;
      const result = await query<any>(
        `INSERT INTO sub_cabinets (cabinet_id, name, details, image_url) VALUES ($1, $2, $3, $4) RETURNING id`,
        [newCabinetId, sub.name, sub.details, sub.image_url]
      );
      subMap.set(sub.id, result[0].id);
    }

    // Insert items
    for (const item of items || []) {
      const newCabinetId = item.cabinet_id ? cabinetMap.get(item.cabinet_id) : null;
      const newSubId = item.sub_cabinet_id ? subMap.get(item.sub_cabinet_id) : null;
      await query(
        `INSERT INTO items (user_id, cabinet_id, sub_cabinet_id, name, details, quantity, image_url, expiry_date, min_threshold)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, newCabinetId, newSubId, item.name, item.details, item.quantity, item.image_url, item.expiry_date, item.min_threshold]
      );
    }

    fs.unlinkSync(zipFile.path);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Restore failed:', err);
    if (fs.existsSync(zipFile.path)) fs.unlinkSync(zipFile.path);
    res.status(500).json({ error: 'Restore failed: ' + err.message });
  }
});

export default router;
