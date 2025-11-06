// server/src/index.ts
import express, { Express, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

dotenv.config();

const PORT: number = Number(process.env.PORT) || 3001;

const app: Express = express();
app.use(cors());
app.use(express.json());

// __dirname แบบ ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Static files =====
app.use("/img", express.static(path.join(__dirname, "img")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== Demo data สำหรับหน้า /user เดิม =====
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

app.get("/user", (_req: Request, res: Response) => {
  res.status(200).json(users);
});

app.post("/user", (req: Request, res: Response) => {
  const { name, image_url } = req.body || {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Invalid name" });
  }
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

// ===== In-memory auth store (สำหรับสมัคร/ล็อกอินจริง) =====
type AuthUser = {
  id: number;
  email: string;
  password: string; // เดโม่: เก็บ plain text ชั่วคราว (จริงควร hash ด้วย bcrypt)
  firstName?: string;
  lastName?: string;
  major?: string;
  year?: string;
  avatarUrl?: string | null;
};

const authUsers: AuthUser[] = [
  // seed ไว้ 1 บัญชีเพื่อทดสอบเพิ่มเติมได้
  { id: 1, email: "test@kmitl.ac.th", password: "1234" },
];

// ===== Multer สำหรับรับไฟล์รูปจาก Register (avatar) =====
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) =>
      cb(null, path.join(__dirname, "uploads")),
    filename: (_req, file, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname || "");
      cb(null, `avatar-${unique}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// ===== Register =====
app.post(
  "/auth/register",
  upload.single("avatar"),
  (req: Request, res: Response) => {
    const { firstName, lastName, major, year, email, password } = req.body || {};

    // validate ข้อมูลหลัก ๆ
    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !major?.trim() ||
      !year?.trim() ||
      !email?.trim() ||
      !password
    ) {
      return res.status(400).json({ error: "invalid payload" });
    }

    // กันอีเมลซ้ำ
    const existed = authUsers.find(
      (u) => u.email.toLowerCase() === String(email).toLowerCase()
    );
    if (existed) {
      return res.status(409).json({ error: "email already used" });
    }

    const file = (req as any).file as Express.Multer.File | undefined;
    const avatarUrl = file
      ? `http://localhost:${PORT}/uploads/${file.filename}`
      : null;

    const newUser: AuthUser = {
      id: authUsers.length ? Math.max(...authUsers.map((u) => u.id)) + 1 : 1,
      email: String(email).toLowerCase().trim(),
      password: String(password), // เดโม่: ยังไม่ hash
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
  }
);

// ===== Login (เช็คกับ authUsers ที่สมัครไว้จริง) =====
app.post("/auth/login", (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email/password required" });
  }

  const user = authUsers.find(
    (u) =>
      u.email.toLowerCase() === String(email).toLowerCase() &&
      u.password === String(password)
  );

  if (!user) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  // เดโม่: ออก token ปลอม
  const token = `fake-${user.id}-${Date.now()}`;
  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
