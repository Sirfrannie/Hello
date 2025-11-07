import React, { useEffect, useMemo, useState } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";

const API_URL =
  process.env.REACT_APP_API_URL?.replace(/\/+$/, "") || "http://localhost:3001";
type Product = {
  id: number;
  name: string;
  price: number;
  image: string;
  category: string;
};

type Profile = {
  name: string;
  avatar?: string | null;
};

const SAMPLE_PRODUCTS: Product[] = [
  { id: 1, name: "พวงกุญแจตรามหาวิทยาลัย", price: 45, image: "/images/key-kmitl.jpg",  category: "ของที่ระลึก" },
  { id: 2, name: "สติ๊กเกอร์ KMITL",           price: 30, image: "/images/sticker-kmitl.jpg", category: "ของที่ระลึก" },
  { id: 3, name: "Casio FX-991EX",               price: 2150, image: "/images/casio-991ex.jpg",  category: "อุปกรณ์เรียน" },
  { id: 4, name: "เสื้อคณะ Science 44",         price: 370, image: "/images/shirt-sci-44.jpg",  category: "เสื้อผ้า" },
  { id: 5, name: "Casio FX-350MS",               price: 900, image: "/images/casio-350ms.jpg",   category: "อุปกรณ์เรียน" },
  { id: 6, name: "หัวเข็มขัดตราครุฑ",            price: 40, image: "/images/buckle-thai.jpg",   category: "ของที่ระลึก" },
];

const CATEGORIES = ["ทั้งหมด", "ของที่ระลึก", "อุปกรณ์เรียน", "เสื้อผ้า"];


export default function Shop() {
  // ===== profile from localStorage =====
  const [profile, setProfile] = useState<Profile | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return;
      const u = JSON.parse(raw);
      const name =
        `${u.firstName || ""} ${u.lastName || ""}`.trim() || u.email || "ผู้ใช้ใหม่";
      const avatar = u.avatarUrl || "/images/default-avatar.jpg";
      setProfile({ name, avatar });
    } catch {
      // ถ้า parse ไม่ได้ก็ไม่ต้องทำอะไร
    }
  }, []);

  // ===== search & filter =====
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("ทั้งหมด");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SAMPLE_PRODUCTS.filter((p) => {
      const byCat = activeCat === "ทั้งหมด" || p.category === activeCat;
      const byQ = !q || p.name.toLowerCase().includes(q);
      return byCat && byQ;
    });
  }, [query, activeCat]);

  // ===== actions =====
  const addToCart = (prod: Product) => {
    const raw = localStorage.getItem("cart");
    const cart: Product[] = raw ? JSON.parse(raw) : [];
    cart.push(prod);
    localStorage.setItem("cart", JSON.stringify(cart));
    alert(`ใส่ตะกร้า: ${prod.name}`);
  };

  const payNow = (prod: Product) => {
    alert(`ชำระสินค้า: ${prod.name} ราคา ${prod.price.toLocaleString()} บาท`);
    // TODO: ไปหน้า checkout / QR / promptpay
  };

  return (
    <div className="shop-shell">
      {/* Header */}
      <header className="shop-header">
        <div className="shop-brand">
          <div className="brand-cart" />
        </div>

        <div className="shop-search">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาสินค้า เช่น เครื่องคิดเลข, เสื้อคณะ..."
          />
          <button aria-label="search">🔍</button>
        </div>

        <div className="shop-actions">
        <button className="cart-btn" title="ตะกร้า" onClick={() => nav("/cart")}>🛍️</button>
        </div>
      </header>

      {/* Body */}
      <div className="shop-body">
        {/* Main */}
        <main className="shop-main">
          {/* Tabs */}
          <div className="shop-tabs">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setActiveCat(c)}
                className={c === activeCat ? "tab active" : "tab"}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Banner */}
          <div className="shop-banner">
            <div className="banner-dot" />
            <div className="banner-title">โฆษณา</div>
          </div>

          {/* Grid */}
          <section className="shop-grid">
            {filtered.map((p) => (
              <article className="product-card" key={p.id}>
                <div className="product-thumb">
                  <img src={p.image} alt={p.name} />
                </div>

                <div className="product-meta">
                  <h3 className="product-price">
                    {p.price.toLocaleString()} <span>บาท</span>
                  </h3>
                  <div className="product-row">
                    <button className="ghost" onClick={() => addToCart(p)}>🛍️</button>
                    <button className="pay" onClick={() => payNow(p)}>จ่าย</button>
                  </div>
                </div>

                <div className="product-name" title={p.name}>{p.name}</div>
              </article>
            ))}
          </section>
        </main>

        {/* Aside */}
        <aside className="shop-aside">
          <div className="profile-card">
            <div className="avatar">
              <img
                src={profile?.avatar || "/images/default-avatar.jpg"}
                alt={profile?.name || "ผู้ใช้ใหม่"}
              />
            </div>
            <div className="profile-name">{profile?.name || "ผู้ใช้ใหม่"}</div>
          </div>

          <nav className="profile-menu">
          
            
            <nav className="profile-menu">
                <button onClick={() => nav("/orders")}>คำสั่งซื้อของฉัน</button>
               
            </nav>
          </nav>
        </aside>
      </div>
    </div>
  );
}
