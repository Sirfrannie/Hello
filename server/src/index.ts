import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Minimal Auth + Admin Inventory/Orders Server
 * - POST   /auth/login       email+password → {token,user(role)}
 * - GET    /products         ทุกคนดูได้ (เฉพาะ active)
 * - POST   /products         (admin) เพิ่มสินค้า
 * - PATCH  /products/:id     (admin) แก้สินค้า/สต็อก/active
 * - DELETE /products/:id     (admin) ลบสินค้า
 * - POST   /orders           (login) สร้างออเดอร์ → หักสต็อก
 * - GET    /orders           (login) user เห็นของตัวเอง, admin เห็นทั้งหมด (รองรับ ?email=)
 * - PATCH  /orders/:code     (admin) เปลี่ยนสถานะ; คืนสต็อกเมื่อ CANCELLED
 */

const app = express();
const PORT = Number(process.env.PORT || 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

/* ========== In-memory Demo Data ========== */

type Role = 'admin' | 'user';
type User = {
  email: string;
  password: string; 
  role: Role;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
};

const USERS: User[] = [
  { email: 'Admin@test.com', password: '123456', role: 'admin', firstName: 'Admin' },
  { email: 'user@example.com',  password: '123456', role: 'user',  firstName: 'Guest' },
];

// token → email
const SESSIONS = new Map<string, string>();

type Product = {
  id: number;
  name: string;
  price: number;
  image?: string;
  category?: string;
  stock: number;
  active?: boolean;
};

type OrderStatus = 'PENDING' | 'PAID' | 'READY' | 'DONE' | 'CANCELLED';
type OrderItem = { id: number; name: string; price: number; qty: number };
type Order = {
  code: string;
  email: string;
  method: 'QR' | 'PICKUP';
  subtotal: number;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
};

const PRODUCTS: Product[] = [
  { id: 1, name: 'พวงกุญแจตรามหาวิทยาลัย', price: 45,   stock: 50, category: 'ของที่ระลึก', active: true },
  { id: 2, name: 'สติ๊กเกอร์ KMITL',           price: 30,   stock: 40, category: 'ของที่ระลึก', active: true },
  { id: 3, name: 'Casio FX-991EX',               price: 2150, stock: 10, category: 'อุปกรณ์เรียน', active: true },
  { id: 4, name: 'เสื้อคณะ Science 44',         price: 370,  stock: 25, category: 'เสื้อผ้า',     active: true },
];

const ORDERS: Order[] = [];



/* ========== Helpers ========== */

function genToken() {
  return crypto.randomBytes(24).toString('hex');
}
function genOrderCode() {
  return 'ORD-' + Date.now().toString(36).toUpperCase().slice(-6);
}
function nowISO() {
  return new Date().toISOString();
}
function findUserByToken(token?: string): User | null {
  if (!token) return null;
  const email = SESSIONS.get(token);
  if (!email) return null;
  return USERS.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/* ========== Middlewares ========== */

function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = (req.headers['x-token'] as string) || '';
  const user = findUserByToken(token);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  (req as any).user = user;
  (req as any).token = token;
  next();
}

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const me = (req as any).user as User | undefined;
  if (!me) return res.status(401).json({ error: 'Unauthorized' });
  if (me.role !== 'admin') return res.status(403).json({ error: 'Forbidden: admin only' });
  next();
}

/* ========== Auth ========== */

// email+password → token + user(role)
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const u = USERS.find(
    x => x.email.toLowerCase() === String(email).toLowerCase() && x.password === String(password)
  );
  if (!u) return res.status(401).json({ error: 'Invalid email or password' });

  const token = genToken();
  SESSIONS.set(token, u.email);

  const { password: _pw, ...safe } = u;
  res.json({ token, user: safe });
});

/* ========== Products ========== */

// public
app.get('/products', (_req, res) => {
  const visible = PRODUCTS.filter(p => p.active !== false);
  res.json(visible);
});

// admin create
app.post('/products', requireAuth, requireAdmin, (req, res) => {
  const { name, price, stock, category, image, active } = req.body || {};
  if (!name || typeof price !== 'number' || typeof stock !== 'number') {
    return res.status(400).json({ error: 'name, price, stock are required' });
  }
  const id = PRODUCTS.length ? Math.max(...PRODUCTS.map(p => p.id)) + 1 : 1;
  const p: Product = {
    id,
    name: String(name),
    price: Number(price),
    stock: Math.max(0, Number(stock)),
    category: category ? String(category) : 'อื่นๆ',
    image: image ? String(image) : undefined,
    active: active !== undefined ? !!active : true,
  };
  PRODUCTS.push(p);
  res.json(p);
});

// admin update
app.patch('/products/:id', requireAuth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return res.status(404).json({ error: 'Product not found' });

  const { name, price, stock, category, image, active } = req.body || {};
  if (name !== undefined) p.name = String(name);
  if (price !== undefined) p.price = Number(price);
  if (stock !== undefined) p.stock = Math.max(0, Number(stock));
  if (category !== undefined) p.category = String(category);
  if (image !== undefined) p.image = String(image);
  if (active !== undefined) p.active = !!active;

  res.json(p);
});

// admin delete
app.delete('/products/:id', requireAuth, requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const idx = PRODUCTS.findIndex(x => x.id === id);
  if (idx < 0) return res.status(404).json({ error: 'Product not found' });
  const [removed] = PRODUCTS.splice(idx, 1);
  res.json({ ok: true, removed });
});

/* ========== Orders ========== */

// create (login)
app.post('/orders', requireAuth, (req, res) => {
  const me = (req as any).user as User;
  const { method, subtotal, items, email } = req.body || {};
  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'items required' });
  }
  const whoEmail = String(email || me.email);

  // validate stock
  const lack: Array<{ id: number; need: number; have: number; productId?: number }> = [];
  for (const it of items) {
    const pid = Number(it.id);
    const p = PRODUCTS.find(x => x.id === pid);
    const need = Number(it.qty || 0);
    const have = p ? Number(p.stock || 0) : 0;
    if (!p || need <= 0) {
      lack.push({ id: pid, productId: pid, need, have: 0 });
      continue;
    }
    if (have < need) lack.push({ id: pid, productId: pid, need, have });
  }
  if (lack.length) return res.status(409).json({ error: 'INSUFFICIENT_STOCK', detail: lack });

  // deduct stock
  for (const it of items) {
    const p = PRODUCTS.find(x => x.id === Number(it.id))!;
    p.stock = Math.max(0, Number(p.stock) - Number(it.qty));
  }

  // snapshot items with current data
  const snapItems: OrderItem[] = items.map((it: any) => {
    const p = PRODUCTS.find(x => x.id === Number(it.id));
    return {
      id: Number(it.id),
      name: p?.name ?? String(it.name ?? ''),
      price: p?.price ?? Number(it.price ?? 0),
      qty: Number(it.qty ?? 0),
    };
  });

  const code = genOrderCode();
  const order: Order = {
    code,
    email: whoEmail,
    method: method === 'PICKUP' ? 'PICKUP' : 'QR',
    subtotal: Number(subtotal ?? snapItems.reduce((s, x) => s + x.price * x.qty, 0)),
    items: snapItems,
    status: 'PENDING',
    createdAt: nowISO(),
  };
  ORDERS.push(order);

  res.json({ code, order });
});

// list
app.get('/orders', requireAuth, (req, res) => {
  const me = (req as any).user as User;
  const qEmail = String(req.query.email || '').toLowerCase();

  if (me.role === 'admin') {
    const list = qEmail
      ? ORDERS.filter(o => o.email.toLowerCase() === qEmail)
      : ORDERS.slice();
    return res.json({ orders: list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)) });
  }

  const mine = ORDERS
    .filter(o => o.email.toLowerCase() === me.email.toLowerCase())
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  res.json({ orders: mine });
});

// change status (admin)
app.patch('/orders/:code', requireAuth, requireAdmin, (req, res) => {
  const code = String(req.params.code);
  const { status } = req.body || {};
  const allowed: OrderStatus[] = ['PENDING', 'PAID', 'READY', 'DONE', 'CANCELLED'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const o = ORDERS.find(x => x.code === code);
  if (!o) return res.status(404).json({ error: 'Order not found' });

  // คืนสต็อกเมื่อยกเลิก
  if (status === 'CANCELLED' && o.status !== 'CANCELLED') {
    for (const it of o.items) {
      const p = PRODUCTS.find(x => x.id === it.id);
      if (p) p.stock = Number(p.stock || 0) + Number(it.qty || 0);
    }
  }

  o.status = status;
  res.json({ ok: true, order: o });
});

/* ========== Start ========== */

app.get('/', (_req, res) => res.send('OK'));
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// ====== ตั้งค่าอัปโหลดไฟล์แบบง่าย ======
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    cb(null, `avatar_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// ให้ client เข้าถึงไฟล์ได้
app.use('/uploads', express.static(UPLOAD_DIR));

/* ====== เพิ่ม endpoint สมัครสมาชิก ======
   รองรับฟอร์มแบบ multipart: fields + avatar (อัปโหลดรูป) */
app.post('/auth/register', upload.single('avatar'), (req, res) => {
  try {
    const { firstName = '', lastName = '', major = '', year = '', email = '', password = '' } = req.body || {};
    const emailNorm = String(email).trim().toLowerCase();

    // validate เบื้องต้น
    if (!emailNorm) return res.status(400).json({ error: 'email is required' });
    if (!password || String(password).length < 6)
      return res.status(400).json({ error: 'password must be at least 6 chars' });
    if (USERS.find(u => u.email.toLowerCase() === emailNorm))
      return res.status(409).json({ error: 'email already exists' });

    // เก็บ avatarUrl ถ้ามีไฟล์
    const avatarUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    // demo: เก็บ in-memory (งานจริงควรบันทึก DB + hash password)
   USERS.push({
  email: emailNorm,
  password: String(password),
  role: "user",
  firstName: String(firstName || ""),
  lastName: String(lastName || ""),
  avatarUrl,
} as User);


    // ไม่ auto-login: ให้ไปล็อกอินตาม UX ปัจจุบัน
    return res.status(201).json({ ok: true, user: { email: emailNorm, firstName, lastName, avatarUrl } });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'register failed' });
  }
});