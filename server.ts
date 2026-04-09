import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import fs from 'fs';
import AdmZip from 'adm-zip';

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
  // 1. First, ensure the users table exists
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    password TEXT,
    security_question TEXT,
    security_answer TEXT,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active'
  )`);

  // 2. Handle Users Table Migrations & Index
  db.all("PRAGMA table_info(users)", (err, columns: any[]) => {
    if (err || !columns) return;
    const hasUsername = columns.some(c => c.name === 'username');
    const hasEmail = columns.some(c => c.name === 'email');
    const hasStatus = columns.some(c => c.name === 'status');

    if (!hasUsername) {
      if (hasEmail) {
        console.log('Migrating: Renaming email to username...');
        db.run("ALTER TABLE users RENAME COLUMN email TO username");
      } else {
        console.log('Adding missing username column...');
        db.run("ALTER TABLE users ADD COLUMN username TEXT");
      }
    }
    if (!hasStatus) {
      db.run("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'");
    }
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
  });

  // 3. Ensure other tables exist
  db.run(`CREATE TABLE IF NOT EXISTS cabinets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT,
    details TEXT,
    type TEXT, -- 'direct' or 'group'
    image_url TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS sub_cabinets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cabinet_id INTEGER,
    name TEXT,
    details TEXT,
    image_url TEXT,
    FOREIGN KEY(cabinet_id) REFERENCES cabinets(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    cabinet_id INTEGER,
    sub_cabinet_id INTEGER,
    name TEXT,
    details TEXT,
    quantity INTEGER DEFAULT 0,
    image_url TEXT,
    expiry_date TEXT,
    min_threshold INTEGER DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS action_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    item_id INTEGER,
    action_type TEXT,
    quantity_change INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // 4. Handle Migrations
  db.all("PRAGMA table_info(cabinets)", (err, columns: any[]) => {
    if (columns && !columns.some(c => c.name === 'image_url')) {
      db.run("ALTER TABLE cabinets ADD COLUMN image_url TEXT");
    }
  });
  db.all("PRAGMA table_info(sub_cabinets)", (err, columns: any[]) => {
    if (columns && !columns.some(c => c.name === 'image_url')) {
      db.run("ALTER TABLE sub_cabinets ADD COLUMN image_url TEXT");
    }
  });
  db.all("PRAGMA table_info(items)", (err, columns: any[]) => {
    if (columns) {
      if (!columns.some(c => c.name === 'expiry_date')) {
        db.run("ALTER TABLE items ADD COLUMN expiry_date TEXT");
      }
      if (!columns.some(c => c.name === 'min_threshold')) {
        db.run("ALTER TABLE items ADD COLUMN min_threshold INTEGER DEFAULT 0");
      }
    }
  });

  /* 
  // Create default admin if not exists (Disabled for UI initialization)
  */
  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  )`);
});

// Helper to get settings
const getSetting = (key: string): Promise<string | null> => {
  return new Promise((resolve) => {
    db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row: any) => {
      resolve(row ? row.value : null);
    });
  });
};

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(UPLOADS_DIR));

// Simple Request Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Multer Setup
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// --- API Routes ---

// Auth
app.post('/api/auth/register', (req, res) => {
  const { username, password, security_question, security_answer } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码是必填项' });
  }

  // Explicitly check for username existence first
  db.get('SELECT id FROM users WHERE username = ?', [username], (err, existingUser) => {
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    
    // Check if this is the first user
    db.get('SELECT COUNT(*) as count FROM users', (err, row: any) => {
      const role = (row && row.count === 0) ? 'superadmin' : 'user';
      
      db.run('INSERT INTO users (username, password, security_question, security_answer, role) VALUES (?, ?, ?, ?, ?)',
        [username, hashed, security_question, security_answer, role], function(err: any) {
          if (err) {
            console.error('Registration error:', err);
            if (err.message && err.message.includes('UNIQUE')) {
              return res.status(400).json({ error: '用户名已存在' });
            }
            return res.status(500).json({ error: '注册时数据库错误' });
          }
          res.json({ id: this.lastID, role });
        });
    });
  });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user: any) => {
    if (err) {
      return res.status(500).json({ error: '服务器内部错误' });
    }
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }
    if (user.status === 'blocked') {
      return res.status(403).json({ error: '您的账号已被限制登录' });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, { 
      httpOnly: true, 
      secure: false, 
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.json({ user: { id: user.id, username: user.username, role: user.role } });
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/auth/me', authenticate, (req: any, res) => {
  res.json({ user: req.user });
});

app.get('/api/auth/setup-status', (req, res) => {
  db.get('SELECT COUNT(*) as count FROM users', (err, row: any) => {
    res.json({ totalUsers: row ? row.count : 0 });
  });
});

app.post('/api/auth/change-password', authenticate, (req: any, res) => {
  const { oldPassword, newPassword } = req.body;
  db.get('SELECT password FROM users WHERE id = ?', [req.user.id], (err, user: any) => {
    if (err || !user || !bcrypt.compareSync(oldPassword, user.password)) {
      return res.status(401).json({ error: '旧密码错误' });
    }
    const hashed = bcrypt.hashSync(newPassword, 10);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id], (err) => {
      res.json({ success: true });
    });
  });
});

// Password Recovery
app.post('/api/auth/recover-question', (req, res) => {
  const { username } = req.body;
  db.get('SELECT security_question FROM users WHERE username = ?', [username], (err, user: any) => {
    if (!user) return res.status(404).json({ error: '用户不存在' });
    res.json({ question: user.security_question });
  });
});

app.post('/api/auth/recover-reset', (req, res) => {
  const { username, answer, newPassword } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user: any) => {
    if (!user || user.security_answer !== answer) {
      return res.status(401).json({ error: '安全答案不正确' });
    }
    const hashed = bcrypt.hashSync(newPassword, 10);
    db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id], (err) => {
      res.json({ success: true });
    });
  });
});

// Cabinets
app.get('/api/cabinets', authenticate, (req: any, res) => {
  db.all('SELECT * FROM cabinets WHERE user_id = ?', [req.user.id], (err, rows) => {
    res.json(rows);
  });
});

app.post('/api/cabinets', authenticate, upload.single('image'), (req: any, res) => {
  const { name, details, type } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  db.run('INSERT INTO cabinets (user_id, name, details, type, image_url) VALUES (?, ?, ?, ?, ?)', 
    [req.user.id, name, details, type, imageUrl], function(err) {
      res.json({ id: this.lastID });
    });
});

app.put('/api/cabinets/:id', authenticate, upload.single('image'), (req: any, res) => {
  const { name, details } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
  
  let query = 'UPDATE cabinets SET name = ?, details = ?';
  let params = [name, details];
  if (imageUrl) {
    query += ', image_url = ?';
    params.push(imageUrl);
  }
  query += ' WHERE id = ? AND user_id = ?';
  params.push(req.params.id, req.user.id);

  db.run(query, params, function(err) {
    if (this.changes === 0) return res.status(404).json({ error: 'Not found or unauthorized' });
    res.json({ success: true });
  });
});

app.delete('/api/cabinets/:id', authenticate, (req: any, res) => {
  db.get('SELECT id FROM cabinets WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, row) => {
    if (!row) return res.status(404).json({ error: 'Not found or unauthorized' });
    
    db.serialize(() => {
      db.run('DELETE FROM items WHERE sub_cabinet_id IN (SELECT id FROM sub_cabinets WHERE cabinet_id = ?)', [req.params.id]);
      db.run('DELETE FROM items WHERE cabinet_id = ?', [req.params.id]);
      db.run('DELETE FROM sub_cabinets WHERE cabinet_id = ?', [req.params.id]);
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
  db.get('SELECT id FROM cabinets WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, row) => {
    if (!row) return res.status(404).json({ error: 'Not found or unauthorized' });
    db.all('SELECT * FROM sub_cabinets WHERE cabinet_id = ?', [req.params.id], (err, rows) => {
      res.json(rows);
    });
  });
});

app.post('/api/cabinets/:id/subs', authenticate, upload.single('image'), (req: any, res) => {
  const { name, details } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  db.get('SELECT id FROM cabinets WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, row) => {
    if (!row) return res.status(404).json({ error: 'Not found or unauthorized' });
    db.run('INSERT INTO sub_cabinets (cabinet_id, name, details, image_url) VALUES (?, ?, ?, ?)', 
      [req.params.id, name, details, imageUrl], function(err) {
        res.json({ id: this.lastID });
      });
  });
});

app.put('/api/subs/:id', authenticate, upload.single('image'), (req: any, res) => {
  const { name, details } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

  db.get('SELECT sc.id FROM sub_cabinets sc JOIN cabinets c ON sc.cabinet_id = c.id WHERE sc.id = ? AND c.user_id = ?', 
    [req.params.id, req.user.id], (err, row) => {
      if (!row) return res.status(404).json({ error: 'Not found or unauthorized' });
      
      let query = 'UPDATE sub_cabinets SET name = ?, details = ?';
      let params = [name, details];
      if (imageUrl) {
        query += ', image_url = ?';
        params.push(imageUrl);
      }
      query += ' WHERE id = ?';
      params.push(req.params.id);

      db.run(query, params, (err) => {
        res.json({ success: true });
      });
    });
});

app.delete('/api/subs/:id', authenticate, (req: any, res) => {
  db.get('SELECT sc.id FROM sub_cabinets sc JOIN cabinets c ON sc.cabinet_id = c.id WHERE sc.id = ? AND c.user_id = ?', 
    [req.params.id, req.user.id], (err, row) => {
      if (!row) return res.status(404).json({ error: 'Not found or unauthorized' });
      db.serialize(() => {
        db.run('DELETE FROM items WHERE sub_cabinet_id = ?', [req.params.id]);
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
app.get('/api/items', authenticate, (req: any, res) => {
  const { cabinet_id, sub_cabinet_id, search, all } = req.query;
  let query = `
    SELECT i.*, 
           IFNULL(c.name, pc.name) as cabinet_name, 
           sc.name as sub_cabinet_name 
    FROM items i
    LEFT JOIN cabinets c ON i.cabinet_id = c.id
    LEFT JOIN sub_cabinets sc ON i.sub_cabinet_id = sc.id
    LEFT JOIN cabinets pc ON sc.cabinet_id = pc.id
    WHERE 1=1
  `;
  let params: any[] = [];

  if (req.user.role === 'admin' && all === 'true') {
  } else {
    query += ' AND i.user_id = ?';
    params.push(req.user.id);
  }

  if (cabinet_id) {
    query += ' AND i.cabinet_id = ?';
    params.push(cabinet_id);
  } else if (sub_cabinet_id) {
    query += ' AND i.sub_cabinet_id = ?';
    params.push(sub_cabinet_id);
  }

  if (search) {
    query += ' AND (i.name LIKE ? OR i.details LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/items', authenticate, upload.single('image'), (req: any, res) => {
  const { name, details, quantity, cabinet_id, sub_cabinet_id, expiry_date, min_threshold } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
  db.run('INSERT INTO items (user_id, cabinet_id, sub_cabinet_id, name, details, quantity, image_url, expiry_date, min_threshold) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.user.id, cabinet_id || null, sub_cabinet_id || null, name, details, quantity || 0, imageUrl, expiry_date || null, min_threshold || 0], function(err) {
      const itemId = this.lastID;
      db.run('INSERT INTO action_history (user_id, item_id, action_type, quantity_change) VALUES (?, ?, ?, ?)',
        [req.user.id, itemId, 'create', quantity || 0]);
      res.json({ id: itemId });
    });
});

app.patch('/api/items/:id/quantity', authenticate, (req: any, res) => {
  const { change, value } = req.body;
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
  const { name, details, quantity, expiry_date, min_threshold } = req.body;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
  
  let query = 'UPDATE items SET name = ?, details = ?, quantity = ?, expiry_date = ?, min_threshold = ?';
  let params = [name, details, quantity, expiry_date || null, min_threshold || 0];
  
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

// AI & Dashboard
const AI_API_KEY = process.env.AI_API_KEY;
const MODEL_TYPE = process.env.MODEL_TYPE || 'gemini';

app.get('/api/dashboard/stats', authenticate, (req: any, res) => {
  const userId = req.user.id;
  const stats: any = {};
  const today = new Date().toISOString().split('T')[0];
  const soon = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  db.serialize(() => {
    db.get('SELECT COUNT(*) as count FROM items WHERE user_id = ?', [userId], (err, row: any) => { stats.totalItems = row.count; });
    db.get('SELECT COUNT(*) as count FROM cabinets WHERE user_id = ?', [userId], (err, row: any) => { stats.totalLocations = row.count; });
    db.get('SELECT COUNT(*) as count FROM items WHERE user_id = ? AND quantity <= min_threshold AND min_threshold > 0', [userId], (err, row: any) => { stats.lowStockCount = row.count; });
    db.get('SELECT COUNT(*) as count FROM items WHERE user_id = ? AND expiry_date IS NOT NULL AND expiry_date <= ? AND expiry_date >= ?', [userId, soon, today], (err, row: any) => { 
      stats.expiringSoonCount = row.count; 
      res.json(stats);
    });
  });
});

import { GoogleGenAI } from '@google/genai';
import axios from 'axios';

app.post('/api/ai/analyze', authenticate, upload.single('image'), async (req: any, res) => {
  const { text } = req.body;
  const imageFile = req.file;

  // Load settings from DB, fallback to ENV
  const dbModelType = await getSetting('ai_model_type');
  const dbApiKey = await getSetting('ai_api_key');
  const dbEndpoint = await getSetting('ai_endpoint');
  const dbModelName = await getSetting('ai_model_name');

  const modelType = dbModelType || process.env.MODEL_TYPE || 'gemini';
  const apiKey = dbApiKey || process.env.AI_API_KEY;
  const endpointBase = dbEndpoint || process.env.AI_ENDPOINT;
  const modelName = dbModelName || process.env.AI_MODEL_NAME;

  const prompt = `请根据用户输入的物品名称、动作或图像，做标准化处理并给出意图识别。
规则： 
1. 只返回标准 JSON，不要任何多余解释、 markdown、注释、对话。 
2. itemName 为物品标准名称，简洁准确。 
3. suggestLocation 从以下位置选择一个：客厅、餐厅、厨房、主卧、次卧、书房、储物间、地下室。 
4. action 为识别出的意图：取出(take) 或 放回(store)。
   - 如果用户提到“拿走”、“取出”、“用了”、“吃掉”等，识别为 take。
   - 如果用户提到“放回”、“存入”、“买了”、“收好”等，或者没有明确动作，识别为 store。
5. 不要添加额外字段，严格按格式返回。 
返回格式： { "itemName": "标准物品名", "suggestLocation": "建议存放位置", "action": "take" | "store" } 
${text ? `用户输入：${text}` : '请识别图像中的主要物品并给出建议存放位置（默认为放回意图）。'}`;

  try {
    if (modelType === 'gemini') {
      if (!apiKey) throw new Error('AI_API_KEY not set');
      const ai = new GoogleGenAI({ apiKey: apiKey });

      const parts: any[] = [{ text: prompt }];
      if (imageFile) {
        parts.push({
          inlineData: {
            data: fs.readFileSync(imageFile.path).toString("base64"),
            mimeType: imageFile.mimetype
          }
        });
      }

      const response = await ai.models.generateContent({
        model: modelName || "gemini-1.5-flash",
        contents: [{ role: 'user', parts: parts }]
      });
      let resultText = response.text;
      // Basic JSON cleanup
      resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      res.json(JSON.parse(resultText));
    } else {
      // Generic OpenAI-compatible for doubao, qwen, ernie etc.
      // Most of these require a specific endpoint URL
      let endpoint = '';
      if (modelType === 'doubao') endpoint = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
      else if (modelType === 'qwen') endpoint = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions';
      else if (modelType === 'ernie') endpoint = 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions';
      else if (modelType === 'minimax') endpoint = 'https://api.minimax.chat/v1/text/chatcompletion_v2';
      else if (modelType === 'gemma') endpoint = endpointBase || 'https://api.groq.com/openai/v1/chat/completions'; 
      else if (endpointBase) endpoint = endpointBase;
      
      if (!endpoint) throw new Error('Unsupported or unconfigured model type');

      const messages: any[] = [{ role: "user", content: prompt }];
      if (imageFile) {
        // Multi-modal for OpenAI-compatible usually requires specific format
        messages[0].content = [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${imageFile.mimetype};base64,${fs.readFileSync(imageFile.path).toString("base64")}` } }
        ];
      }

      const aiRes = await axios.post(endpoint, {
        model: modelName || (modelType === 'minimax' ? "MiniMax-VL-01" : "gpt-4-vision-preview"),
        messages: messages,
        response_format: { type: "json_object" }
      }, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });

      let content = aiRes.data.choices[0].message.content;
      res.json(JSON.parse(content));
    }
  } catch (err: any) {
    console.error('AI Error:', err);
    res.status(500).json({ error: 'AI analysis failed: ' + err.message });
  } finally {
    if (imageFile && fs.existsSync(imageFile.path)) fs.unlinkSync(imageFile.path);
  }
});

// History
app.get('/api/history', authenticate, (req: any, res) => {
  db.all(`SELECT h.*, 
          IFNULL(i.name, '已删除物品') as item_name,
          c.name as cabinet_name,
          sc.name as sub_name
          FROM action_history h 
          LEFT JOIN items i ON h.item_id = i.id 
          LEFT JOIN cabinets c ON i.cabinet_id = c.id
          LEFT JOIN sub_cabinets sc ON i.sub_cabinet_id = sc.id
          WHERE h.user_id = ? ORDER BY h.timestamp DESC LIMIT 50`, [req.user.id], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json(rows);
  });
});

// Admin
app.get('/api/admin/settings', authenticate, async (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  db.all('SELECT key, value FROM settings', (err, rows: any[]) => {
    if (err) return res.status(500).json({ error: err.message });
    const settings: any = {};
    rows.forEach(row => settings[row.key] = row.value);
    res.json(settings);
  });
});

app.post('/api/admin/settings', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  const { settings } = req.body; // { key: value }
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  db.serialize(() => {
    Object.entries(settings).forEach(([key, value]) => {
      stmt.run(key, value);
    });
    stmt.finalize();
    res.json({ message: 'Settings updated' });
  });
});

app.get('/api/admin/users', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  db.all('SELECT id, username, role, status FROM users', (err, rows) => {
    res.json(rows);
  });
});

app.post('/api/admin/reset-password', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  const { userId, newPassword } = req.body;
  const hashed = bcrypt.hashSync(newPassword, 10);
  db.run('UPDATE users SET password = ? WHERE id = ?', [hashed, userId], (err) => {
    res.json({ success: true });
  });
});

app.patch('/api/admin/users/:id/status', authenticate, (req: any, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  const { status } = req.body;
  db.run('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
    res.json({ success: true });
  });
});

app.delete('/api/admin/users/:id', authenticate, (req: any, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  const targetId = req.params.id;
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    db.run('DELETE FROM action_history WHERE user_id = ?', [targetId]);
    db.run('DELETE FROM items WHERE user_id = ?', [targetId]);
    db.run('DELETE FROM sub_cabinets WHERE cabinet_id IN (SELECT id FROM cabinets WHERE user_id = ?)', [targetId]);
    db.run('DELETE FROM cabinets WHERE user_id = ?', [targetId]);
    db.run('DELETE FROM users WHERE id = ?', [targetId], (err) => {
      db.run('COMMIT');
      res.json({ success: true });
    });
  });
});

app.get('/api/admin/stats', authenticate, (req: any, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  
  const stats: any = {};
  db.serialize(() => {
    db.get('SELECT COUNT(*) as count FROM users', (err, row: any) => { stats.totalUsers = row.count; });
    db.get('SELECT COUNT(*) as count FROM cabinets', (err, row: any) => { stats.totalCabinets = row.count; });
    db.get('SELECT COUNT(*) as count FROM items', (err, row: any) => { stats.totalItems = row.count; });
    db.all(`
      SELECT u.username, 
             (SELECT COUNT(*) FROM cabinets WHERE user_id = u.id) as cabinets,
             (SELECT COUNT(*) FROM items WHERE user_id = u.id) as items
      FROM users u
    `, (err, rows) => {
      stats.userBreakdown = rows;
      res.json(stats);
    });
  });
});

app.get('/api/admin/backup-all', authenticate, (req: any, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: 'Forbidden' });
  
  const zip = new AdmZip();
  if (fs.existsSync(DB_PATH)) {
    zip.addLocalFile(DB_PATH, 'data');
  }
  if (fs.existsSync(UPLOADS_DIR)) {
    zip.addLocalFolder(UPLOADS_DIR, 'uploads');
  }
  
  const zipBuffer = zip.toBuffer();
  res.set('Content-Type', 'application/zip');
  res.set('Content-Disposition', `attachment; filename=system_full_backup_${new Date().toISOString().split('T')[0]}.zip`);
  res.send(zipBuffer);
});

// Factory Reset
app.post('/api/user/factory-reset', authenticate, (req: any, res) => {
  if (req.user.role === 'admin' || req.user.role === 'superadmin') {
    db.serialize(() => {
      db.run('DELETE FROM action_history WHERE user_id != ?', [req.user.id]);
      db.run('DELETE FROM items WHERE user_id != ?', [req.user.id]);
      db.run('DELETE FROM sub_cabinets WHERE cabinet_id IN (SELECT id FROM cabinets WHERE user_id != ?)', [req.user.id]);
      db.run('DELETE FROM cabinets WHERE user_id != ?', [req.user.id]);
      res.json({ success: true, message: 'Global reset complete' });
    });
  } else {
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

// Backup & Restore
app.get('/api/backup', authenticate, (req: any, res) => {
  const userId = req.user.id;
  const backupData: any = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    cabinets: [],
    sub_cabinets: [],
    items: [],
    action_history: []
  };

  db.serialize(() => {
    db.all('SELECT * FROM cabinets WHERE user_id = ?', [userId], (err, cabinets) => {
      backupData.cabinets = cabinets;
      db.all(`SELECT * FROM sub_cabinets WHERE cabinet_id IN (SELECT id FROM cabinets WHERE user_id = ?)`, [userId], (err, subs) => {
        backupData.sub_cabinets = subs;
        db.all('SELECT * FROM items WHERE user_id = ?', [userId], (err, items) => {
          backupData.items = items;
          db.all('SELECT * FROM action_history WHERE user_id = ?', [userId], (err, history) => {
            backupData.action_history = history;

            const zip = new AdmZip();
            zip.addFile('data.json', Buffer.from(JSON.stringify(backupData, null, 2)));

            const imagesToInclude = new Set<string>();
            cabinets.forEach((c: any) => { if (c.image_url) imagesToInclude.add(c.image_url); });
            subs.forEach((s: any) => { if (s.image_url) imagesToInclude.add(s.image_url); });
            items.forEach((i: any) => { if (i.image_url) imagesToInclude.add(i.image_url); });

            imagesToInclude.forEach((imageUrl) => {
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
          });
        });
      });
    });
  });
});

app.post('/api/restore', authenticate, upload.single('backup'), async (req: any, res) => {
  const userId = req.user.id;
  const zipFile = req.file;

  if (!zipFile) {
    return res.status(400).json({ error: 'Missing backup zip file' });
  }

  try {
    const zip = new AdmZip(zipFile.path);
    const dataEntry = zip.getEntry('data.json');
    if (!dataEntry) throw new Error('data.json not found in backup');

    const backupData = JSON.parse(dataEntry.getData().toString('utf8'));
    const { cabinets, sub_cabinets, items, action_history } = backupData;

    zip.getEntries().forEach((entry) => {
      if (entry.entryName.startsWith('images/') && !entry.isDirectory) {
        const fileName = path.basename(entry.entryName);
        const destPath = path.join(UPLOADS_DIR, fileName);
        fs.writeFileSync(destPath, entry.getData());
      }
    });

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      db.run('DELETE FROM action_history WHERE user_id = ?', [userId]);
      db.run('DELETE FROM items WHERE user_id = ?', [userId]);
      db.run('DELETE FROM sub_cabinets WHERE cabinet_id IN (SELECT id FROM cabinets WHERE user_id = ?)', [userId]);
      db.run('DELETE FROM cabinets WHERE user_id = ?', [userId]);

      const cabinetMap = new Map();
      const subMap = new Map();
      const itemMap = new Map();

      let cabinetCount = 0;
      if (!cabinets || cabinets.length === 0) {
        db.run('COMMIT', () => res.json({ success: true }));
        return;
      }

      cabinets.forEach((cab: any) => {
        db.run('INSERT INTO cabinets (user_id, name, details, type, image_url) VALUES (?, ?, ?, ?, ?)',
          [userId, cab.name, cab.details, cab.type, cab.image_url], function(this: any, err: any) {
            cabinetMap.set(cab.id, this.lastID);
            cabinetCount++;
            if (cabinetCount === cabinets.length) insertSubCabinets();
          });
      });

      function insertSubCabinets() {
        const validSubs = (sub_cabinets || []).filter((sub: any) => cabinetMap.has(sub.cabinet_id));
        if (validSubs.length === 0) {
          insertItems();
          return;
        }

        let subCount = 0;
        validSubs.forEach((sub: any) => {
          db.run('INSERT INTO sub_cabinets (cabinet_id, name, details, image_url) VALUES (?, ?, ?, ?)',
            [cabinetMap.get(sub.cabinet_id), sub.name, sub.details, sub.image_url], function(this: any) {
              subMap.set(sub.id, this.lastID);
              subCount++;
              if (subCount === validSubs.length) insertItems();
            });
        });
      }

      function insertItems() {
        if (!items || items.length === 0) {
          db.run('COMMIT', () => res.json({ success: true }));
          return;
        }

        let itemCount = 0;
        items.forEach((item: any) => {
          const newCabinetId = item.cabinet_id ? (cabinetMap.get(item.cabinet_id) || null) : null;
          const newSubId = item.sub_cabinet_id ? (subMap.get(item.sub_cabinet_id) || null) : null;
          
          db.run('INSERT INTO items (user_id, cabinet_id, sub_cabinet_id, name, details, quantity, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, newCabinetId, newSubId, item.name, item.details, item.quantity, item.image_url], function(this: any) {
              itemMap.set(item.id, this.lastID);
              itemCount++;
              if (itemCount === items.length) insertHistory();
            });
        });
      }

      function insertHistory() {
        const validHistory = (action_history || []).filter((h: any) => itemMap.has(h.item_id));
        if (validHistory.length === 0) {
          db.run('COMMIT', () => res.json({ success: true }));
          return;
        }

        let histCount = 0;
        validHistory.forEach((h: any) => {
          db.run('INSERT INTO action_history (user_id, item_id, action_type, quantity_change, timestamp) VALUES (?, ?, ?, ?, ?)',
            [userId, itemMap.get(h.item_id), h.action_type, h.quantity_change, h.timestamp], () => {
              histCount++;
              if (histCount === validHistory.length) {
                db.run('COMMIT', () => res.json({ success: true }));
              }
            });
        });
      }
    });

    fs.unlinkSync(zipFile.path);

  } catch (err: any) {
    console.error('Restore failed:', err);
    res.status(500).json({ error: 'Restore failed: ' + err.message });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    const assetsPath = path.join(distPath, 'assets');
    
    app.use('/assets', express.static(assetsPath, {
      maxAge: '1d',
      immutable: true
    }));
    
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/uploads')) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${isProduction ? 'Production (serving static dist)' : 'Development (Vite Middleware)'}`);
  });
}

startServer();
