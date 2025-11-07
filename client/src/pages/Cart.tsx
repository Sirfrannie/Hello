import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ เพิ่ม import นี้
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
function writeCart(items: Product[]) {
  localStorage.setItem("cart", JSON.stringify(items));
}

export default function Cart() {
  const [items, setItems] = useState<Product[]>([]);
  const nav = useNavigate(); // ✅ ใช้ navigate ได้เลย

  useEffect(() => setItems(readCart()), []);

  const agg: CartItem[] = useMemo(() => {
    const map = new Map<number, CartItem>();
    for (const p of items) {
      const existed = map.get(p.id);
      if (existed) existed.qty += 1;
      else map.set(p.id, { ...p, qty: 1 });
    }
    return Array.from(map.values());
  }, [items]);
  // ลำดับ id ตามการพบครั้งแรกใน items (คงที่ขณะหน้านี้เปิดอยู่)
    const order = useMemo(() => {
        const seen = new Set<number>();
        const arr: number[] = [];
    for (const it of items) {
        if (!seen.has(it.id)) {
      seen.add(it.id);
      arr.push(it.id);
    }
  }
  return arr;
}, [items]);


  const updateQty = (id: number, qty: number) => {
  const clamped = Math.max(qty, 0);

  // นับจำนวนเดิมของแต่ละ id
  const countMap = new Map<number, number>();
  for (const it of items) {
    countMap.set(it.id, (countMap.get(it.id) || 0) + 1);
  }
  // ปรับจำนวนของ id ที่แก้ไข
  countMap.set(id, clamped);

  // เตรียม template (ข้อมูลสินค้าต้นฉบับ) สำหรับแต่ละ id
  const templateMap = new Map<number, Product>();
  for (const it of items) {
    if (!templateMap.has(it.id)) templateMap.set(it.id, it);
  }

  // ประกอบ newList ตามลำดับ order เดิม
  const newList: Product[] = [];
  for (const pid of order) {
    const tmpl = templateMap.get(pid);
    if (!tmpl) continue;
    const c = countMap.get(pid) || 0;
    for (let k = 0; k < c; k++) {
      newList.push({ ...tmpl });
    }
  }

  setItems(newList);
  writeCart(newList);
};

const removeItem = (id: number) => {
  // นับจำนวนเดิม แล้วตั้งของ id นี้เป็น 0
  const countMap = new Map<number, number>();
  for (const it of items) {
    countMap.set(it.id, (countMap.get(it.id) || 0) + 1);
  }
  countMap.set(id, 0);

  const templateMap = new Map<number, Product>();
  for (const it of items) {
    if (!templateMap.has(it.id)) templateMap.set(it.id, it);
  }

  const newList: Product[] = [];
  for (const pid of order) {
    if (pid === id) continue;
    const tmpl = templateMap.get(pid);
    if (!tmpl) continue;
    const c = countMap.get(pid) || 0;
    for (let k = 0; k < c; k++) {
      newList.push({ ...tmpl });
    }
  }

  setItems(newList);
  writeCart(newList);
};


  const clearCart = () => {
    setItems([]);
    writeCart([]);
  };

  const { subtotal, count } = useMemo(() => {
    const c = agg.reduce((s, a) => s + a.qty, 0);
    const sub = agg.reduce((s, a) => s + a.qty * a.price, 0);
    return { subtotal: sub, count: c };
  }, [agg]);

  const checkout = () => {
  nav("/checkout");
};


  return (
    <div className="cart-shell">
      <div className="cart-card">
        {/* ✅ ปุ่มกลับ */}
        <div style={{ marginBottom: "12px" }}>
          <button
            className="back-btn"
            onClick={() => nav("/shop")}
            style={{
              background: "#f4b871",
              border: "none",
              padding: "8px 14px",
              borderRadius: "10px",
              fontWeight: "900",
              cursor: "pointer",
            }}
          >
            🔙 กลับไปหน้าร้านค้า
          </button>
        </div>

        <header className="cart-header">
          <h1>ตะกร้าสินค้า</h1>
          <div className="cart-actions">
            {items.length > 0 && (
              <button className="cart-clear" onClick={clearCart}>
                ล้างตะกร้า
              </button>
            )}
          </div>
        </header>

        {agg.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-icon">🛒</div>
            <p>ยังไม่มีสินค้าในตะกร้า</p>
          </div>
        ) : (
          <>
            <ul className="cart-list">
              {agg.map((it) => (
                <li key={it.id} className="cart-row">
                  <div className="cart-thumb">
                    <img src={it.image} alt={it.name} />
                  </div>
                  <div className="cart-info">
                    <div className="cart-name" title={it.name}>{it.name}</div>
                    <div className="cart-cat">{it.category}</div>
                  </div>
                  <div className="cart-price">
                    {it.price.toLocaleString()} <span>บาท</span>
                  </div>
                  <div className="cart-qty">
                    <button onClick={() => updateQty(it.id, it.qty - 1)} disabled={it.qty <= 1}>−</button>
                    <span>{it.qty}</span>
                    <button onClick={() => updateQty(it.id, it.qty + 1)}>＋</button>
                  </div>
                  <div className="cart-total">
                    {(it.qty * it.price).toLocaleString()} <span>บาท</span>
                  </div>
                  <div className="cart-remove">
                    <button onClick={() => removeItem(it.id)}>ลบ</button>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="cart-footer">
              <div className="cart-sum">
                <div>จำนวนสินค้า: <b>{count}</b> ชิ้น</div>
                <div>ยอดรวม: <b>{subtotal.toLocaleString()}</b> บาท</div>
              </div>
              <button className="btn-checkout" onClick={checkout}>ชำระเงิน</button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
