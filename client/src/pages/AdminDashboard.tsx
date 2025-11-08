import React, { useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  stock: number;
  active?: boolean;
};

type OrderItem = { id: number; name: string; price: number; qty: number };
type OrderStatus = "PENDING" | "PAID" | "READY" | "DONE" | "CANCELLED";
type Order = {
  code: string;
  email: string;
  method: "QR" | "PICKUP";
  subtotal: number;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
};

const API_URL =
  process.env.REACT_APP_API_URL?.replace(/\/+$/, "") || "http://localhost:3001";

/* ===== helpers (catalog in localStorage) ===== */
const CATALOG_KEY = "catalog";

function saveCatalog(list: Product[]) {
  localStorage.setItem(CATALOG_KEY, JSON.stringify(list));
  // กระตุ้นให้แท็บ Shop รีเฟรชเองผ่าน storage event
  // (บางเบราว์เซอร์ไม่ยิง event ให้แท็บปัจจุบัน แต่แท็บอื่นจะได้รับ)
  try {
    const ev = new StorageEvent("storage", {
      key: CATALOG_KEY,
      newValue: JSON.stringify(list),
    } as any);
    window.dispatchEvent(ev);
  } catch {}
}

const token = () => {
  try {
    // รองรับทั้งที่เก็บใน user.token และ key "token"
    const t1 = localStorage.getItem("token") || "";
    if (t1) return t1;
    const t2 = JSON.parse(localStorage.getItem("user") || "{}").token || "";
    return t2 || "";
  } catch {
    return "";
  }
};

async function apiGet(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "x-token": token() },
    cache: "no-store",
  });
  const text = await res.text().catch(() => "");
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!res.ok) throw new Error(data?.error || text || `HTTP ${res.status}`);
  return data;
}
async function apiPost(path: string, body: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-token": token() },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!res.ok) throw new Error(data?.error || text || `HTTP ${res.status}`);
  return data;
}
async function apiPatch(path: string, body: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-token": token() },
    body: JSON.stringify(body),
  });
  const text = await res.text().catch(() => "");
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!res.ok) throw new Error(data?.error || text || `HTTP ${res.status}`);
  return data;
}
async function apiDelete(path: string) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "DELETE",
    headers: { "x-token": token() },
  });
  const text = await res.text().catch(() => "");
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = {}; }
  if (!res.ok) throw new Error(data?.error || text || `HTTP ${res.status}`);
  return data;
}

export default function AdminDashboard() {
  const [tab, setTab] = useState<"stock" | "orders">("stock");

  /* ===== STOCK TAB ===== */
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loadingCat, setLoadingCat] = useState(false);

  // โหลดสินค้าจาก server (แทนที่จะใช้ localStorage ล้วนๆ)
  const loadProducts = async () => {
    setLoadingCat(true);
    try {
      const list = await apiGet("/products"); // public แต่เราให้ no-cache
      const arr: Product[] = Array.isArray(list) ? list : [];
      setCatalog(arr);
      saveCatalog(arr); // sync ให้ Shop
    } catch (e: any) {
      alert(e?.message || "โหลดสินค้าจากเซิร์ฟเวอร์ไม่สำเร็จ");
    } finally {
      setLoadingCat(false);
    }
  };
  useEffect(() => {
    loadProducts();
  }, []);

  const [draft, setDraft] = useState<Partial<Product>>({});
  const addDisabled = useMemo(() => {
    const d = draft;
    return (
      !d.name?.trim() ||
      typeof d.price !== "number" ||
      isNaN(d.price) ||
      typeof d.stock !== "number" ||
      isNaN(d.stock)
    );
  }, [draft]);

  // เพิ่มสินค้า → POST ไป server แล้วรีโหลด/อัปเดต state
  const addProduct = async () => {
    if (addDisabled) return;
    try {
      const body = {
        name: String(draft.name).trim(),
        price: Number(draft.price),
        stock: Math.max(0, Number(draft.stock)),
        category: draft.category?.trim() || "อื่นๆ",
        image: draft.image?.trim() || undefined,
        active: true,
      };
      const p = await apiPost("/products", body);
      const next = [p, ...catalog];
      setCatalog(next);
      saveCatalog(next);
      setDraft({});
    } catch (e: any) {
      alert(e?.message || "เพิ่มสินค้าไม่สำเร็จ");
    }
  };

  // ปรับสต็อก (client-side) + PATCH ไป server
  const updateStock = async (id: number, s: number) => {
    setCatalog((list) => list.map((p) => (p.id === id ? { ...p, stock: Math.max(0, s) } : p)));
    try {
      const updated = await apiPatch(`/products/${id}`, { stock: Math.max(0, s) });
      const next = (prev: Product[]) =>
        prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
      setCatalog(next as any);
      // sync
      const cur = typeof next === "function" ? (next as any)(catalog) : (next as any);
      saveCatalog(cur);
    } catch (e: any) {
      alert(e?.message || "อัปเดตสต็อกไม่สำเร็จ");
      // rollback โดยเรียกโหลดใหม่
      loadProducts();
    }
  };

  // เปิด/ปิด active → PATCH
  const toggleActive = async (id: number) => {
    const found = catalog.find((p) => p.id === id);
    if (!found) return;
    const want = !(found.active !== false);
    // optimistic
    setCatalog((list) => list.map((p) => (p.id === id ? { ...p, active: !want } : p)));
    try {
      const updated = await apiPatch(`/products/${id}`, { active: !want });
      const next = catalog.map((p) => (p.id === updated.id ? { ...p, ...updated } : p));
      setCatalog(next);
      saveCatalog(next);
    } catch (e: any) {
      alert(e?.message || "สลับสถานะไม่สำเร็จ");
      loadProducts();
    }
  };

  // ลบสินค้า → DELETE
  const removeProduct = async (id: number) => {
    if (!confirm("ลบสินค้านี้ออกจากแค็ตตาล็อก?")) return;
    try {
      await apiDelete(`/products/${id}`);
      const next = catalog.filter((p) => p.id !== id);
      setCatalog(next);
      saveCatalog(next);
    } catch (e: any) {
      alert(e?.message || "ลบสินค้าไม่สำเร็จ");
    }
  };

  /* ===== ORDERS TAB ===== */
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [filter, setFilter] = useState<OrderStatus | "">("");

  async function loadOrders() {
    setLoadingOrders(true);
    try {
      // ฝั่ง server: ถ้าเป็น admin และไม่ใส่ email → คืนทั้งหมด
      const data = await apiGet(`/orders`);
      let list: Order[] = Array.isArray(data?.orders) ? data.orders : [];
      if (filter) list = list.filter((o) => o.status === filter);
      setOrders(list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
    } catch (e: any) {
      alert(e?.message || "โหลดออเดอร์ไม่สำเร็จ");
    } finally {
      setLoadingOrders(false);
    }
  }
  useEffect(() => {
    if (tab === "orders") loadOrders();
  }, [tab, filter]);

  const setStatus = async (code: string, s: OrderStatus) => {
    try {
      await apiPatch(`/orders/${code}`, { status: s });
      await loadOrders();
    } catch (e: any) {
      alert(e?.message || "อัปเดตสถานะไม่สำเร็จ");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h1 style={{ marginBottom: 8 }}>หน้าแอดมิน</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => setTab("stock")}
          className={tab === "stock" ? "mtab active" : "mtab"}
        >
          จัดการสต็อก
        </button>
        <button
          onClick={() => setTab("orders")}
          className={tab === "orders" ? "mtab active" : "mtab"}
        >
          คำสั่งซื้อ
        </button>
      </div>

      {tab === "stock" ? (
        <>
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 12,
              boxShadow: "0 6px 0 rgba(0,0,0,.08)",
              marginBottom: 12,
            }}
          >
            <h3 style={{ marginTop: 0 }}>เพิ่มสินค้า</h3>
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 120px 120px 1fr 1fr 120px" }}>
              <input placeholder="ชื่อสินค้า" value={draft.name || ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <input placeholder="ราคา" type="number" value={draft.price ?? ""} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} />
              <input placeholder="สต็อก" type="number" value={draft.stock ?? ""} onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })} />
              <input placeholder="หมวดหมู่ (เช่น ของที่ระลึก)" value={draft.category || ""} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
              <input placeholder="ลิงก์รูป (ไม่ใส่ก็ได้)" value={draft.image || ""} onChange={(e) => setDraft({ ...draft, image: e.target.value })} />
              <button disabled={addDisabled} onClick={addProduct}>เพิ่ม</button>
            </div>
          </div>

          <div>
            {loadingCat ? (
              <p>กำลังโหลดสินค้า…</p>
            ) : catalog.length === 0 ? (
              <p>ยังไม่มีสินค้าในแค็ตตาล็อก</p>
            ) : (
              <table style={{ width: "100%", background: "#fff", borderRadius: 12, overflow: "hidden" }}>
                <thead style={{ background: "#f7ead8" }}>
                  <tr>
                    <th style={{ textAlign: "left", padding: 8 }}>สินค้า</th>
                    <th>ราคา</th>
                    <th>สต็อก</th>
                    <th>สถานะ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((p) => (
                    <tr key={p.id}>
                      <td style={{ padding: 8 }}>{p.name}</td>
                      <td style={{ textAlign: "center" }}>{p.price.toLocaleString()}</td>
                      <td style={{ textAlign: "center" }}>
                        <input
                          type="number"
                          value={p.stock}
                          onChange={(e) => updateStock(p.id, Number(e.target.value))}
                          style={{ width: 90, textAlign: "right" }}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button onClick={() => toggleActive(p.id)}>
                          {p.active === false ? "ปิด" : "เปิด"}
                        </button>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: 8 }}>
                        <button onClick={() => removeProduct(p.id)} style={{ color: "#a00" }}>
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <div>
          <div style={{ marginBottom: 10 }}>
            <label>Filter สถานะ: </label>
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
              <option value="">(ทั้งหมด)</option>
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="READY">READY</option>
              <option value="DONE">DONE</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          {loadingOrders ? (
            <div>กำลังโหลด…</div>
          ) : orders.length === 0 ? (
            <div>ยังไม่มีคำสั่งซื้อ</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {orders.map((o) => (
                <div key={o.code} style={{ background: "#ffffffff", borderRadius: 12, padding: 12, boxShadow: "0 6px 0 rgba(135, 113, 113, 0.08)" }}>
                  <div style={{ fontWeight: 900 }}>
                    รหัส: {o.code} <span style={{ color: "#6a5631", fontWeight: 600 }}>({new Date(o.createdAt).toLocaleString()})</span>
                  </div>
                  <div style={{ marginTop: 4 }}>อีเมล: {o.email}</div>
                  <div style={{ marginTop: 4 }}>สถานะ: <b>{o.status}</b></div>
                  <ul style={{ marginTop: 6 }}>
                    {o.items.map((it, i) => (
                      <li key={i}>{it.name} × {it.qty} @ ฿{it.price.toLocaleString()}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: 6, fontWeight: 900 }}>
                    รวม: ฿{o.subtotal.toLocaleString()}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <button onClick={() => setStatus(o.code, "PENDING")}>→ PENDING</button>
                    <button onClick={() => setStatus(o.code, "PAID")}>→ PAID</button>
                    <button onClick={() => setStatus(o.code, "READY")}>→ READY</button>
                    <button onClick={() => setStatus(o.code, "DONE")}>→ DONE</button>
                    <button onClick={() => setStatus(o.code, "CANCELLED")} style={{ color: "#a00" }}>ยกเลิก</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
