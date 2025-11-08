import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

const API_URL =
  process.env.REACT_APP_API_URL?.replace(/\/+$/, "") || "http://localhost:3001";

// ✅ เพิ่มรายการสาขาไว้ด้านบน
const MAJORS = [
  "วิทยาการคอมพิวเตอร์",
  "วิศวกรรมคอมพิวเตอร์",
  "วิศวกรรมซอฟต์แวร์",
  "เทคโนโลยีสารสนเทศ",
  "วิทยาศาสตร์ข้อมูล",
  "วิศวกรรมไฟฟ้า",
  "วิศวกรรมอุตสาหการ",
  "บริหารธุรกิจ/ระบบสารสนเทศ",
];

export default function Register() {
  const nav = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [major, setMajor]         = useState("");
  const [year, setYear]           = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");

  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState<string | null>(null);

  const [loading, setLoading]     = useState(false);
  const [err, setErr]             = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onPickFile = () => fileInputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  const validate = () => {
    if (!firstName.trim()) return "กรุณากรอกชื่อ";
    if (!lastName.trim())  return "กรุณากรอกนามสกุล";
    if (!major.trim())     return "กรุณาเลือกสาขา";
    if (!year.trim())      return "กรุณากรอกชั้นปี";
    if (!email.trim())     return "กรุณากรอกอีเมล์";
    if (!password)         return "กรุณากรอกรหัสผ่าน";
    if (password.length < 6) return "รหัสผ่านอย่างน้อย 6 ตัวอักษร";
    if (password !== confirm) return "รหัสผ่านและยืนยันรหัสไม่ตรงกัน";
    return null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) { setErr(v); return; }
    setErr(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("firstName", firstName.trim());
      fd.append("lastName",  lastName.trim());
      fd.append("major",     major.trim());
      fd.append("year",      year.trim());
      fd.append("email",     email.trim());
      fd.append("password",  password);
      if (file) fd.append("avatar", file);

      const res = await fetch(`${API_URL}/auth/register`, { method: "POST", body: fd });

      const ct = res.headers.get("content-type") || "";
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        if (!ct.includes("application/json")) {
          throw new Error(
            text
              ? text.slice(0, 200)
              : `Register failed (${res.status}). ตรวจสอบว่าเซิร์ฟเวอร์มี /auth/register และ CORS/พอร์ตถูกต้อง`
          );
        }
        let data: any = {};
        try { data = JSON.parse(text || "{}"); } catch {}
        throw new Error(data?.error || data?.message || `Register failed (${res.status})`);
      }

      const result = ct.includes("application/json") ? await res.json() : {};
      alert("สมัครสมาชิกสำเร็จ! เข้าสู่ระบบได้เลย");
      nav("/login", { replace: true });
    } catch (e: any) {
      setErr(e?.message ?? "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-shell">
      <div className="register-card">
        <button className="reg-back" onClick={() => nav(-1)} aria-label="ย้อนกลับ">←</button>

        <div className="reg-avatar">
          <div className="avatar-circle">
            {preview ? <img src={preview} alt="avatar" /> : <span>👤</span>}
          </div>
          <button className="btn-upload" type="button" onClick={onPickFile}>
            อัปโหลดภาพ
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onFileChange}
          />
        </div>

        <form className="reg-form" onSubmit={onSubmit}>
          {err && <div className="reg-error">{err}</div>}

          <div className="reg-row">
            <label>
              <span>ชื่อ</span>
              <input value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
            </label>
            <label>
              <span>นามสกุล</span>
              <input value={lastName} onChange={(e)=>setLastName(e.target.value)} />
            </label>
          </div>

          <div className="reg-row">
            <label>
              <span>สาขา</span>
              {/* ✅ เปลี่ยนเป็น select dropdown */}
              <select value={major} onChange={(e)=>setMajor(e.target.value)}>
                <option value="" disabled>— เลือกสาขา —</option>
                {MAJORS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </label>

            <label>
              <span>ชั้นปี</span>
              <input value={year} onChange={(e)=>setYear(e.target.value)} />
            </label>
          </div>

          <label className="reg-full">
            <span>อีเมล์</span>
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
          </label>

          <label className="reg-full">
            <span>รหัสผ่าน</span>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          </label>

          <label className="reg-full">
            <span>ยืนยันรหัส</span>
            <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
          </label>

          <button className="btn-register" type="submit" disabled={loading}>
            {loading ? "กำลังสร้างบัญชี..." : "สร้างบัญชี"}
          </button>
        </form>
      </div>
    </div>
  );
}
