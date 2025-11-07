import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

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

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export default function Orders() {
  const nav = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const me = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!me?.email) {
        setErr("กรุณาล็อกอินก่อน");
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/orders?email=${encodeURIComponent(me.email)}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
        setOrders(data.orders || []);
      } catch (e: any) {
        setErr(e.message || "โหลดข้อมูลล้มเหลว");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [me]);

  return (
    <div className="checkout-shell">
      <div className="checkout-card">
        <div style={{ marginBottom: 12 }}>
          <button className="back-btn" onClick={() => nav("/shop")}>🔙 กลับไปหน้าร้านค้า</button>
        </div>
        <header className="checkout-header">
          <h1>คำสั่งซื้อของฉัน</h1>
        </header>

        {loading ? (
          <p>กำลังโหลด…</p>
        ) : err ? (
          <p style={{ color: "crimson" }}>{err}</p>
        ) : orders.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-icon">📦</div>
            <p>ยังไม่มีประวัติการสั่งซื้อ</p>
          </div>
        ) : (
          <ul className="co-list" style={{ marginTop: 12 }}>
            {orders.map((o) => (
              <li key={o.code} className="co-row" style={{ gridTemplateColumns: "1fr 140px 140px 160px" }}>
                <div>
                  <div style={{ fontWeight: 900 }}>
                    รหัส: {o.code} <span style={{ fontWeight: 600, color: "#6a5631" }}>({new Date(o.createdAt).toLocaleString()})</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#6a5631" }}>
                    {o.items.slice(0, 2).map((i) => i.name).join(", ")}
                    {o.items.length > 2 ? ` …อีก ${o.items.length - 2} รายการ` : ""}
                  </div>
                </div>
                <div style={{ fontWeight: 800 }}>{o.method === "QR" ? "สแกน QR" : "ชำระหน้าร้าน"}</div>
                <div style={{ fontWeight: 900 }}>{o.subtotal.toLocaleString()} บาท</div>
                <div style={{ fontWeight: 900, color: o.status === "PAID" ? "#2d5f2b" : o.status === "PENDING" ? "#8a6b2e" : "#333" }}>
                  สถานะ: {o.status}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
