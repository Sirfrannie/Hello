import React from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Orders from "./pages/Orders";

// ===== Pages =====
import Login from "./pages/Login";
import Register from "./pages/Register";
import Shop from "./pages/Shop";
import ProtectedRoute from "./pages/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* เข้าเว็บครั้งแรก → ส่งไปหน้า Login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* หน้า Login */}
        <Route path="/login" element={<Login />} />

        {/* หน้า Register */}
        <Route path="/register" element={<Register />} />

        {/* หน้า Shop (ต้องมี token ถึงเข้าได้) */}
        <Route
          path="/shop"
          element={
            <ProtectedRoute>
              <Shop />
            </ProtectedRoute>
          }
        />
        <Route
        path="/cart"
        element={
        <ProtectedRoute>
      <Cart />
    </ProtectedRoute>
  }
/>
        <Route
  path="/checkout"
  element={
    <ProtectedRoute>
      <Checkout />
    </ProtectedRoute>
  }
/>
<Route
  path="/orders"
  element={
    <ProtectedRoute>
      <Orders />
    </ProtectedRoute>
  }
/>

        {/* ถ้า path ไม่ตรงกับที่กำหนด → redirect กลับ /login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    
  );
  
}




