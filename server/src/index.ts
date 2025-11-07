// server/src/index.ts
import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";

dotenv.config();

const PORT: number = Number(process.env.PORT) || 3001;

const app: Express = express();
app.use(cors());
app.use(express.json());

// ===== __dirname (ESM) =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Static files =====
app.use("/img", express.static(path.join(__dirname, "img")));
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/uploads", express.static(uploadsDir));

// ===== Demo /user เดิม =====
interface UserData {
  id: number;
  name: string;
  image_url: string;
}
let users: UserData[] = [
  { id: 1, name: "Somsri", image_url: `http://localhost:${PORT}/img/4.jpg` },
  { id: 2, name: "Somsai", image_url: `http://localhost:${PORT}/img/6.jpg` },
  { id: 3, name: "Somorn", image_url: `http://localhost:${PORT}/img/5.jpg` },
];

app.get("/user", (_req: Request, res: Response) => res.status(200).json(users));
app.post("/user", (req: Request, res: Response) => {
  const { name, image_url } = req.body || {};
  if (!name || typeof name !== "string")
    return res.status(400).json({ error: "Invalid name" });
  const nextId = users.length ? Math.max(...users.map((u) => u.id)) + 1 : 1;
  const newUser: UserData = {
    id: nextId,
    name: name.trim(),
    image_url:
      typeof image_url === "string" && image_url.trim()
        ? image_url.trim()
        : `http://localhost:${PORT}/img/${(nextId % 6) + 1}.jpg`,
  };
  users.push(newUser);
  return res.status(201).json(newUser);
});

// ===== In-memory auth =====
type AuthUser = {
  id: number;
  email: string;
  password: string; // demo only
  firstName?: string;
  lastName?: string;
  major?: string;
  year?: string;
  avatarUrl?: string | null;
};
const authUsers: AuthUser[] = [{ id: 1, email: "test@kmitl.ac.th", password: "1234" }];

// ===== Multer สำหรับ avatar =====
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname || "");
    cb(null, `avatar-${unique}${ext}`);
  },
});
function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (/^image\//i.test(file.mimetype)) cb(null, true);
  else cb(new Error("unsupported file type"));
}
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// ===== Health =====
app.get("/health", (_req, res) => res.json({ ok: true }));

// ===== Register (multipart) =====
app.post("/auth/register", (req, res, next) => {
  upload.single("avatar")(req, res, (err: any) => {
    if (err) return next(err);
    try {
      const { firstName, lastName, major, year, email, password } = req.body || {};
      if (!firstName?.trim() || !lastName?.trim() || !major?.trim() || !year?.trim() || !email?.trim() || !password) {
        return res.status(400).json({ error: "invalid payload" });
      }
      const existed = authUsers.find((u) => u.email.toLowerCase() === String(email).toLowerCase());
      if (existed) return res.status(409).json({ error: "email already used" });

      const file = (req as any).file as Express.Multer.File | undefined;
      const avatarUrl = file ? `http://localhost:${PORT}/uploads/${file.filename}` : null;

      const newUser: AuthUser = {
        id: authUsers.length ? Math.max(...authUsers.map((u) => u.id)) + 1 : 1,
        email: String(email).toLowerCase().trim(),
        password: String(password),
        firstName: String(firstName).trim(),
        lastName: String(lastName).trim(),
        major: String(major).trim(),
        year: String(year).trim(),
        avatarUrl,
      };
      authUsers.push(newUser);

      return res.status(201).json({
        message: "registered",
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          avatarUrl: newUser.avatarUrl,
        },
      });
    } catch (e) {
      next(e);
    }
  });
});

// ===== Login =====
app.post("/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email/password required" });
  const user = authUsers.find(
    (u) => u.email.toLowerCase() === String(email).toLowerCase() && u.password === String(password)
  );
  if (!user) return res.status(401).json({ error: "invalid credentials" });
  const token = `fake-${user.id}-${Date.now()}`;
  return res.json({
    token,
    user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, avatarUrl: user.avatarUrl },
  });
});

// ===== Orders =====
type OrderItem = { id: number; name: string; price: number; qty: number };
type Order = {
  code: string;
  email: string;
  method: "QR" | "PICKUP";
  subtotal: number;
  items: OrderItem[];
  status: "PENDING" | "PAID" | "READY" | "DONE" | "CANCELLED";
  createdAt: string;
};
const orders: Order[] = [];

function genOrderCode() {
  return `ORD-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

// สร้างออเดอร์
app.post("/orders", (req: Request, res: Response) => {
  const { email, method, items, subtotal, status } = req.body || {};
  if (!email?.trim() || !(method === "QR" || method === "PICKUP") || !Array.isArray(items) || typeof subtotal !== "number") {
    return res.status(400).json({ error: "invalid payload" });
  }
  if (items.length === 0) return res.status(400).json({ error: "empty items" });

  const code = genOrderCode();
  const order: Order = {
    code,
    email: String(email).toLowerCase().trim(),
    method,
    items: items.map((it: any) => ({
      id: Number(it.id),
      name: String(it.name),
      price: Number(it.price),
      qty: Number(it.qty),
    })),
    subtotal: Number(subtotal),
    status: status && typeof status === "string" ? status : (method === "QR" ? "PAID" : "PENDING"),
    createdAt: new Date().toISOString(),
  };
  orders.push(order);
  return res.status(201).json({ code, order });
});

// รายการออเดอร์ของผู้ใช้
// GET /orders?email=foo@bar.com
app.get("/orders", (req: Request, res: Response) => {
  const email = String(req.query.email || "").toLowerCase().trim();
  if (!email) return res.status(400).json({ error: "email required" });
  const list = orders
    .filter((o) => o.email === email)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return res.json({ orders: list });
});

// รายละเอียดออเดอร์จาก code
app.get("/orders/:code", (req: Request, res: Response) => {
  const { code } = req.params;
  const ord = orders.find((o) => o.code === code);
  if (!ord) return res.status(404).json({ error: "order not found" });
  return res.json({ order: ord });
});

// (ตัวเลือก) อัปเดตสถานะ
app.patch("/orders/:code", (req: Request, res: Response) => {
  const { code } = req.params;
  const { status } = req.body || {};
  const ord = orders.find((o) => o.code === code);
  if (!ord) return res.status(404).json({ error: "order not found" });
  if (!["PENDING", "PAID", "READY", "DONE", "CANCELLED"].includes(status))
    return res.status(400).json({ error: "invalid status" });
  ord.status = status as Order["status"];
  return res.json({ order: ord });
});

// ===== JSON Error handler =====
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("ERROR:", err);
  const msg =
    err?.message === "File too large" ? "file too large" :
    err?.message === "unsupported file type" ? "unsupported file type" :
    err?.message || "internal error";
  const code =
    err?.message === "File too large" ? 413 :
    err?.message === "unsupported file type" ? 400 :
    500;
  res.status(code).json({ error: msg });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
