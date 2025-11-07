import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../App.css";

type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
};

type CartItem = Product & { qty: number };

function readCart(): Product[] {
  try {
    const raw = localStorage.getItem("cart");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function clearCart() {
  localStorage.removeItem("cart");
}

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

export default function Checkout() {
  const nav = useNavigate();
  const [items, setItems] = useState<Product[]>([]);
  const [method, setMethod] = useState<"QR" | "PICKUP">("QR");
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => setItems(readCart()), []);

  const agg = useMemo<CartItem[]>(() => {
    const map = new Map<number, CartItem>();
    for (const p of items) {
      const existed = map.get(p.id);
      if (existed) existed.qty += 1;
      else map.set(p.id, { ...p, qty: 1 });
    }
    return Array.from(map.values());
  }, [items]);

  const subtotal = useMemo(
    () => agg.reduce((s, a) => s + a.qty * a.price, 0),
    [agg]
  );

  const confirmPayment = async () => {
    if (items.length === 0) {
      alert("ตะกร้าว่าง กรุณาเลือกสินค้า");
      nav("/shop");
      return;
    }

    const userRaw = localStorage.getItem("user");
    const user = userRaw ? JSON.parse(userRaw) : null;
    if (!user?.email) {
      alert("กรุณาล็อกอินก่อนชำระเงิน");
      nav("/login");
      return;
    }

    setProcessing(true);
    try {
      const body = {
        email: user.email,
        method,
        subtotal,
        items: agg.map((x) => ({
          id: x.id,
          name: x.name,
          price: x.price,
          qty: x.qty,
        })),
      };

      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      // ✅ ได้รหัสคำสั่งซื้อจาก backend
      const code = data.code as string;
      setOrderCode(code);

      // เก็บประวัติไว้ดูในหน้า Orders
      localStorage.setItem("lastOrder", JSON.stringify(data.order));

      // เคลียร์ตะกร้า
      clearCart();
    } catch (e: any) {
      alert(`เกิดข้อผิดพลาด: ${e.message || e}`);
    } finally {
      setProcessing(false);
    }
  };

  const goShop = () => nav("/shop");

  return (
    <div className="checkout-shell">
      <div className="checkout-card">
        <div style={{ marginBottom: 12 }}>
          <button className="back-btn" onClick={goShop}>
            🔙 กลับไปหน้าร้านค้า
          </button>
        </div>

        <header className="checkout-header">
          <h1>ชำระเงิน</h1>
        </header>

        {orderCode ? (
          <div className="paid-box">
            <div className="paid-title">✅ ชำระเงินสำเร็จ</div>
            <div className="paid-code">
              รหัสคำสั่งซื้อ: <b>{orderCode}</b>
              <button
                className="copy-btn"
                onClick={() => navigator.clipboard.writeText(orderCode)}
              >
                คัดลอก
              </button>
            </div>
            <p>นำรหัสดังกล่าวไปแสดงเมื่อมารับสินค้าที่ร้าน</p>
            <div style={{ marginTop: 10 }}>
              <button className="btn-primary" onClick={goShop}>
                กลับไปหน้าร้านค้า
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* รายการสินค้า */}
            <section className="co-summary">
              <h3>รายการสินค้า</h3>
              {agg.length === 0 ? (
                <div className="cart-empty">
                  <div className="cart-icon">🛒</div>
                  <p>ยังไม่มีสินค้าในตะกร้า</p>
                </div>
              ) : (
                <ul className="co-list">
                  {agg.map((it) => (
                    <li key={it.id} className="co-row">
                      <div className="co-thumb">
                        <img src={it.image} alt={it.name} />
                      </div>
                      <div className="co-info">
                        <div className="co-name">{it.name}</div>
                        <div className="co-cat">{it.category}</div>
                      </div>
                      <div className="co-qty">x {it.qty}</div>
                      <div className="co-price">
                        {(it.qty * it.price).toLocaleString()} <span>บาท</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <div className="co-total">
                <div>ยอดรวม</div>
                <div className="co-sum">
                  {subtotal.toLocaleString()} <span>บาท</span>
                </div>
              </div>
            </section>

            {/* วิธีชำระ */}
            <section className="co-method">
              <h3>เลือกวิธีชำระเงิน</h3>
              <div className="method-tabs">
                <button
                  className={method === "QR" ? "mtab active" : "mtab"}
                  onClick={() => setMethod("QR")}
                >
                  สแกน QR พร้อมเพย์
                </button>
                <button
                  className={method === "PICKUP" ? "mtab active" : "mtab"}
                  onClick={() => setMethod("PICKUP")}
                >
                  ชำระเมื่อรับสินค้า
                </button>
              </div>

              {method === "QR" ? (
                <div className="qr-box">
                  <div className="qr-left">
                    <div className="qr-img">
                      <img src="/images/qr-demo.png" alt="QR สำหรับชำระเงิน" />
                    </div>
                    <div className="qr-note">
                      ยอดที่ต้องชำระ: <b>{subtotal.toLocaleString()}</b> บาท
                    </div>
                  </div>
                  <div className="qr-right">
                    <ul className="qr-steps">
                      <li>เปิดแอปธนาคาร / พร้อมเพย์</li>
                      <li>สแกน QR ด้านซ้าย</li>
                      <li>
                        ตรวจสอบยอด <b>{subtotal.toLocaleString()}</b> บาท
                      </li>
                      <li>กดยืนยันการชำระ</li>
                    </ul>
                    <div className="qr-warn">
                      * QR นี้เป็นตัวอย่าง สำหรับทดสอบเท่านั้น
                    </div>
                  </div>
                </div>
              ) : (
                <div className="pickup-box">
                  <p>
                    เลือกชำระเงินที่หน้าร้าน ระบบจะออก{" "}
                    <b>รหัสคำสั่งซื้อ</b> ให้ทันที
                    กรุณาแสดงรหัสดังกล่าวเมื่อมารับสินค้า
                  </p>
                </div>
              )}
            </section>

            {/* ปุ่มยืนยัน */}
            <div className="co-actions">
              <button
                className="btn-primary"
                onClick={confirmPayment}
                disabled={processing || agg.length === 0}
              >
                {processing
                  ? "กำลังดำเนินการ..."
                  : method === "QR"
                  ? "ยืนยันการชำระเงิน"
                  : "ยืนยันการสั่งซื้อ"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
