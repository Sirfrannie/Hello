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
  stock?: number;
  active?: boolean;
};

type Profile = {
  name: string;
  avatar?: string | null;
};

const CATEGORIES = ["ทั้งหมด", "ของที่ระลึก", "อุปกรณ์เรียน", "เสื้อผ้า"];
const CATALOG_KEY = "catalog";

function readCatalog(): Product[] {
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// map รูปให้สินค้าที่มาจาก BE หากไม่มี image
function withImageFallback(p: any): Product {
  const name = String(p?.name || "").toLowerCase();
  const byName: Record<string, string> = {
    "พวงกุญแจตรามหาวิทยาลัย": "/images/key-kmitl.jpg",
    "สติ๊กเกอร์ kmitl": "/images/sticker-kmitl.jpg",
    "casio fx-991ex": "/images/casio-991ex.jpg",
    "casio fx-350ms": "/images/casio-350ms.jpg",
    "เสื้อคณะ science 44": "/images/shirt-sci-44.jpg",
    "หัวเข็มขัดตราครุฑ": "/images/buckle-thai.jpg",
  };
  const picked = p?.image || byName[name] || "/images/default-product.jpg";
  return {
    id: Number(p?.id),
    name: String(p?.name || ""),
    price: Number(p?.price || 0),
    image: picked,
    category: String(p?.category || "ของที่ระลึก"),
    stock: typeof p?.stock === "number" ? p.stock : undefined,
    active: p?.active !== false,
  };
}

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
      // ignore
    }
  }, []);

  // ===== โหลดสินค้าจาก API =====
  const [products, setProducts] = useState<Product[]>([]);

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_URL}/products?_t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `โหลดสินค้าไม่สำเร็จ (${res.status})`);
      }
      const list = await res.json();
      const mapped: Product[] = Array.isArray(list)
        ? list.map(withImageFallback).filter((p) => p.active !== false)
        : [];
      setProducts(mapped);
      localStorage.setItem(CATALOG_KEY, JSON.stringify(mapped));
    } catch (e) {
      // fallback เป็น cache เดิม (หรือว่าง)
      const local = readCatalog();
      setProducts(Array.isArray(local) ? local : []);
      console.error(e);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!alive) return;
      await fetchProducts();
    })();

    // refetch เมื่อกลับมาโฟกัสแท็บนี้ / แท็บถูกแสดง
    const onFocus = () => fetchProducts();
    const onVis = () => {
      if (document.visibilityState === "visible") fetchProducts();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    // ถ้ามีแท็บแอดมิน sync localStorage.catalog → อัปเดตตามด้วย
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === CATALOG_KEY && ev.newValue) {
        try {
          const arr = JSON.parse(ev.newValue);
          if (Array.isArray(arr)) setProducts(arr);
        } catch {}
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // ===== search & filter =====
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState("ทั้งหมด");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const byCat = activeCat === "ทั้งหมด" || p.category === activeCat;
      const byQ = !q || p.name.toLowerCase().includes(q);
      return byCat && byQ;
    });
  }, [query, activeCat, products]);

  // ===== actions =====
  const addToCart = (prod: Product) => {
    if (typeof prod.stock === "number" && prod.stock <= 0) {
      alert("สินค้าหมดสต็อก");
      return;
    }
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
