import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

const API_URL =
  process.env.REACT_APP_API_URL?.replace(/\/+$/, "") || "http://localhost:3001";

const ADMIN_EMAILS =
  (process.env.REACT_APP_ADMIN_EMAILS || "Admin@test.com")
    .split(",")
    .map((s) => s.trim().toLowerCase());

export default function Login() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = payload?.error || `Login failed (${res.status})`;
        throw new Error(msg);
      }

      // user + token จาก server
      const userFromServer = payload?.user || {};
      const token = payload?.token || "";

      // ตัดสินว่าเป็นแอดมินไหม (role=admin หรืออยู่ใน allowlist)
      const emailLower = String(userFromServer.email || "").toLowerCase();
      const isAdmin =
        userFromServer.role === "admin" || ADMIN_EMAILS.includes(emailLower);

      // เก็บลง localStorage
      localStorage.setItem(
        "user",
        JSON.stringify({ ...userFromServer, token, isAdmin })
      );
      localStorage.setItem("token", token);

      // เส้นทางหลังล็อกอิน
      if (isAdmin) {
        nav("/admin"); // ✅ ใช้ตัวพิมพ์เล็กให้ตรงกับ route
      } else {
        nav("/shop");
      }
    } catch (e: any) {
      setErr(e?.message ?? "ไม่สามารถเข้าสู่ระบบได้");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <aside className="login-left">
          <div className="brand-row">
            <div className="brand-mark">
              <div className="circle" />
              <div className="word">
                SCHOOL OF <b>SCIENCE</b>
              </div>
            </div>
            <div className="kmitl">KMITL • FIGHT TOGETHER</div>
          </div>

          <div className="cart-hero">
            <svg viewBox="0 0 256 160" className="cart-svg" aria-hidden>
              <g
                stroke="#e4b54e"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 26h40l18 88h118l16-64H64" />
                <circle cx="88" cy="138" r="12" fill="#e4b54e" />
                <circle cx="168" cy="138" r="12" fill="#e4b54e" />
              </g>
            </svg>
            <h1 className="cart-title">
              SHOPPING <br /> SMO
            </h1>
          </div>
        </aside>

        <main className="login-right">
          <div className="right-inner">
            <h2 className="welcome">ยินดีต้อนรับ</h2>
            <p className="subtitle">ล็อคอินเข้าสู่ระบบ</p>

            <form className="form" onSubmit={onSubmit}>
              {err && <div className="error-box">{err}</div>}

              <label className="field">
                <span className="label">อีเมล์</span>
                <input
                  type="email"
                  placeholder="อีเมล์"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>

              <label className="field">
                <span className="label">รหัสผ่าน</span>
                <div className="password-wrap">
                  <input
                    type={showPw ? "text" : "password"}
                    placeholder="รหัสผ่าน"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="pw-toggle"
                    onClick={() => setShowPw((v) => !v)}
                  >
                    {showPw ? "ซ่อน" : "แสดง"}
                  </button>
                </div>
                <a
                  className="forgot"
                  href="#"
                  onClick={(e) => e.preventDefault()}
                >
                  ลืมรหัสผ่าน
                </a>
              </label>

              <button className="btn-login" type="submit" disabled={loading}>
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </button>

              <div className="signup-row">
                <Link to="/register">สร้างบัญชี</Link>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
