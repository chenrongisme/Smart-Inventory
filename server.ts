import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'fs';

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'smart-inventory-secret';
const DB_PATH = process.env.DATABASE_URL || './data/inventory.db';
const UPLOADS_DIR = './uploads';

// Ensure directories exist
if (!fs.existsSync('./data')) fs.mkdirSync('./data');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const db = new sqlite3.Database(DB_PATH);

// Initialize Database
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    security_question TEXT,
    security_answer TEXT,
    role TEXT DEFAULT 'user'
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS cabinets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    details TEXT,
    type TEXT, -- 'direct' or 'group'
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sub_cabinets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cabinet_id INTEGER,
    name TEXT,
    details TEXT,
    FOREIGN KEY(cabinet_id) REFERENCES cabinets(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    cabinet_id INTEGER, -- Can be null if in sub_cabinet
    sub_cabinet_id INTEGER, -- Can be null if in direct cabinet
    name TEXT,
    details TEXT,
    quantity INTEGER DEFAULT 0,
    image_url TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS action_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    item_id INTEGER,
    action_type TEXT, -- 'store', 'take', 'create', 'edit', 'delete'
    quantity_change INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Create default admin if not exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
  db.get('SELECT * FROM users WHERE role = "admin"', (err, row) => {
    if (!row) {
      const hashed = bcrypt.hashSync(adminPass, 10);
      db.run('INSERT INTO users (email, password, security_question, security_answer, role) VALUES (?, ?, ?, ?, ?)', 
        [adminEmail, hashed, 'Default Question', 'Default Answer', 'admin']);
    }
  });
});

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(UPLOADS_DIR));

// Simple Request Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Auth Middleware - DISABLED for local use
const authenticate = (req: any, res: any, next: any) => {
  req.user = { id: 1, email: 'local@app', role: 'admin' };
  next();
};

// --- API Routes ---

// Cabinets
app.get('/api/cabinets', authenticate, (req: any, res) => {
  db.all('SELECT * FROM cabinets WHERE user_id = ?', [req.user.id], (err, rows) => {
    res.json(rows);
  });
});

app.post('/api/cabinets', authenticate, (req: any, res) => {
  const { name, details, type } = req.body;
  db.run('INSERT INTO cabinets (user_id, name, details, type) VALUES (?, ?, ?, ?)', [req.user.id, name, details, type], function(err) {
    res.json({ id: this.lastID });
  });
});

app.put('/api/cabinets/:id', authenticate, (req: any, res) => {
  const { name, details } = req.body;
  db.run('UPDATE cabinets SET name = ?, details = ? WHERE id = ? AND user_id = ?', [name, details, req.params.id, req.user.id], function(err) {
    if (this.changes === 0) return res.status(404).json({ error: 'Not found or unauthorized' });
    res.json({ success: true });
  });
});

app.delete('/api/cabinets/:id', authenticate, (req: any, res) => {
  // First verify ownership
  db.get('SELECT id FROM cabinets WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, row) => {
    if (!row) return res.status(404).json({ error: 'Not found or unauthorized' });
    
    db.serialize(() => {
      // Delete items in sub cabinets
      db.run('DELETE FROM items WHERE sub_cabinet_id IN (SELECT id FROM sub_cabinets WHERE cabinet_id = ?)', [req.params.id]);
      // Delete items directly in cabinet
      db.run('DELETE FROM items WHERE cabinet_id = ?', [req.params.id]);
      // Delete sub cabinets
      db.run('DELETE FROM sub_cabinets WHERE cabinet_id = ?', [req.params.id]);
      // Delete cabinet
      db.run('DELETE FROM cabinets WHERE id = ?', [req.params.id], (err) => {
        res.json({ success: true });
      });
    });
  });
});

app.get('/api/cabinets/:id', authenticate, (req: any, res) => {
  db.get('SELECT * FROM cabinets WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, cabinet) => {
    if (!cabinet) return res.status(404).json({ error: 'Not found' });
    res.json(cabinet);
  });
});

// Sub Cabinets
app.get('/api/cabinets/:id/subs', authenticate, (req: any, res) => {
  // Verify cabinet ownership
  db.get('SELECT id FROM cabinets WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, row) => {
    if (!row) return res.status(404).json({ error: 'Not found or unauthorized' });
    db.all('SELECT * FROM sub_cabinets WHERE cabinet_id = ?', [req.params.id], (err, rows) => {
      res.json(rows);
    });
  });
});

app.post('/api/cabinets/:id/subs', authenticate, (req: any, res) => {
  const { name, details } = req.body;
  // Verify cabinet ownership
  db.get('SELECT id FROM cabinets WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, row) => {
    if (!row) return res.status(404).json({ error: 'Not found or unauthorized' });
    db.run('INSERT INTO sub_cabinets (cabinet_id, name, details) VALUES (?, ?, ?)', [req.params.id, name, details], function(err) {
      res.json({ id: this.lastID });
    });
  });
});

app.put('/api/subs/:id', authenticate, (req: any, res) => {
  const { name, details } = req.body;
  // Verify ownership via JOIN
  db.get('SELECT sc.id FROM sub_cabinets sc JOIN cabinets c ON sc.cabinet_id = c.id WHERE sc.id = ? AND c.user_id = ?', 
    [req.params.id, req.user.id], (err, row) => {
      if (!row) return res.status(404).json({ error: 'Not found or unauthorized' });
      db.run('UPDATE sub_cabinets SET name = ?, details = ? WHERE id = ?', [name, details, req.params.id], (err) => {
        res.json({ success: true });
      });
    });
});

app.delete('/api/subs/:id', authenticate, (req: any, res) => {
  // Verify ownership via JOIN
  db.get('SELECT sc.id FROM sub_cabinets sc JOIN cabinets c ON sc.cabinet_id = c.id WHERE sc.id = ? AND c.user_id = ?', 
    [req.params.id, req.user.id], (err, row) => {
      if (!row) return res.status(404).json({ error: 'Not found or unauthorized' });
      db.serialize(() => {
        // Delete items in sub cabinet
        db.run('DELETE FROM items WHERE sub_cabinet_id = ?', [req.params.id]);
        // Delete sub cabinet
        db.run('DELETE FROM sub_cabinets WHERE id = ?', [req.params.id], (err) => {
          res.json({ success: true });
        });
      });
    });
});

app.get('/api/subs/:id', authenticate, (req: any, res) => {
  db.get('SELECT sc.*, c.user_id FROM sub_cabinets sc JOIN cabinets c ON sc.cabinet_id = c.id WHERE sc.id = ? AND c.user_id = ?', 
    [req.params.id, req.user.id], (err, sub) => {
      if (!sub) return res.status(404).json({ error: 'Not found' });
      res.json(sub);
    });
});

// Items
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

app.get('/api/items', authenticate, (req: any, res) => {
  const { cabinet_id, sub_cabinet_id, search, all } = req.query;
  let query = 'SELECT * FROM items WHERE 1=1';
  let params: any[] = [];

  if (req.user.role === 'admin' && all === 'true') {
    // No user_id filter
  } else {
    query += ' AND user_id = ?';
    params.push(req.user.id);
  }

  if (cabinet_id) {
    query += ' AND cabinet_id = ?';
    params.push(cabinet_id);
  } else if (sub_cabinet_id) {
    query += ' AND sub_cabinet_id = ?';
    params.push(sub_cabinet_id);
  }

  if (search) {
    query += ' AND (name LIKE ? OR details LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  db.all(query, params, (err, rows) => {
    res.json(rows);
  });
});

app.post('/api/items', authenticate, upload.single('image'), (req: any, res) => {
  const { name, details, quantity, cabinet_id, sub_cabinet_id } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  db.run('INSERT INTO items (user_id, cabinet_id, sub_cabinet_id, name, details, quantity, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, cabinet_id || null, sub_cabinet_id || null, name, details, quantity || 0, imageUrl], function(err) {
      const itemId = this.lastID;
      db.run('INSERT INTO action_history (user_id, item_id, action_type, quantity_change) VALUES (?, ?, ?, ?)',
        [req.user.id, itemId, 'create', quantity || 0]);
      res.json({ id: itemId });
    });
});

app.patch('/api/items/:id/quantity', authenticate, (req: any, res) => {
  const { change, value } = req.body; // change: offset, value: absolute
  db.get('SELECT * FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, item: any) => {
    if (!item) return res.status(404).json({ error: 'Not found' });
    
    let newQty;
    let actualChange;
    
    if (value !== undefined) {
      newQty = Math.max(0, parseInt(value));
      actualChange = newQty - item.quantity;
    } else {
      newQty = Math.max(0, item.quantity + change);
      actualChange = change;
    }

    db.run('UPDATE items SET quantity = ? WHERE id = ?', [newQty, req.params.id], (err) => {
      db.run('INSERT INTO action_history (user_id, item_id, action_type, quantity_change) VALUES (?, ?, ?, ?)',
        [req.user.id, req.params.id, actualChange >= 0 ? 'store' : 'take', actualChange]);
      res.json({ quantity: newQty });
    });
  });
});

app.put('/api/items/:id', authenticate, upload.single('image'), (req: any, res) => {
  const { name, details, quantity } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
  
  let query = 'UPDATE items SET name = ?, details = ?, quantity = ?';
  let params = [name, details, quantity];
  
  if (imageUrl) {
    query += ', image_url = ?';
    params.push(imageUrl);
  }
  
  query += ' WHERE id = ? AND user_id = ?';
  params.push(req.params.id, req.user.id);
  
  db.run(query, params, function(err) {
    res.json({ success: true });
  });
});

app.delete('/api/items/:id', authenticate, (req: any, res) => {
  db.run('DELETE FROM items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ success: true });
  });
});

// History
app.get('/api/history', authenticate, (req: any, res) => {
  db.all(`SELECT h.*, IFNULL(i.name, '已删除物品') as item_name FROM action_history h 
          LEFT JOIN items i ON h.item_id = i.id 
          WHERE h.user_id = ? ORDER BY h.timestamp DESC LIMIT 50`, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// Admin
app.get('/api/admin/users', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  db.all('SELECT id, email, role FROM users', (err, rows) => {
    res.json(rows);
  });
});

app.post('/api/admin/reset-password', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { userId, newPassword } = req.body;
  const hashed = bcrypt.hashSync(newPassword, 10);
  db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, userId], (err) => {
    res.json({ success: true });
  });
});

// Factory Reset
app.post('/api/user/factory-reset', authenticate, (req: any, res) => {
  if (req.user.role === 'admin') {
    // Global factory reset - deletes all data except admin's
    db.serialize(() => {
      db.run('DELETE FROM action_history WHERE user_id != ?', [req.user.id]);
      db.run('DELETE FROM items WHERE user_id != ?', [req.user.id]);
      db.run('DELETE FROM sub_cabinets WHERE cabinet_id IN (SELECT id FROM cabinets WHERE user_id != ?)', [req.user.id]);
      db.run('DELETE FROM cabinets WHERE user_id != ?', [req.user.id]);
      res.json({ success: true, message: 'Global reset complete' });
    });
  } else {
    // User-specific reset
    db.serialize(() => {
      db.run('DELETE FROM action_history WHERE user_id = ?', [req.user.id]);
      db.run('DELETE FROM items WHERE user_id = ?', [req.user.id]);
      db.run('DELETE FROM sub_cabinets WHERE cabinet_id IN (SELECT id FROM cabinets WHERE user_id = ?)', [req.user.id]);
      db.run('DELETE FROM cabinets WHERE user_id = ?', [req.user.id], (err) => {
        res.json({ success: true });
      });
    });
  }
});

// Server setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
