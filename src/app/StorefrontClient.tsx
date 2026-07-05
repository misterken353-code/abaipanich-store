"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cartCount, cartTotal, getCart, saveCart, type CartItem } from "@/lib/cart";

export interface StorefrontProduct {
  id: string;
  code: string;
  name: string;
  categoryName: string | null;
  unitName: string | null;
  salePrice: number;
  image1Url: string | null;
  image2Url: string | null;
  availableQty: number;
  isPreOrder: boolean;
}

type TabType = "instock" | "preorder";

export default function StorefrontClient({ items }: { items: StorefrontProduct[] }) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ทั้งหมด");
  const [activeTab, setActiveTab] = useState<TabType>("instock");
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    setCart(getCart());
  }, []);

  function addToCart(product: StorefrontProduct) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      const next = existing
        ? prev.map((i) => (i.productId === product.id ? { ...i, qty: i.qty + 1 } : i))
        : [
            ...prev,
            {
              productId: product.id,
              code: product.code,
              name: product.name,
              price: product.salePrice,
              imageUrl: product.image1Url || product.image2Url,
              qty: 1,
            },
          ];
      saveCart(next);
      return next;
    });
  }

  const inStock = useMemo(() => items.filter((p) => !p.isPreOrder), [items]);
  const preOrder = useMemo(() => items.filter((p) => p.isPreOrder), [items]);
  const sourceList = activeTab === "instock" ? inStock : preOrder;

  const categories = useMemo(
    () => [
      "ทั้งหมด",
      ...Array.from(new Set(sourceList.map((p) => p.categoryName ?? "ไม่ระบุหมวด"))),
    ],
    [sourceList]
  );

  const filtered = sourceList.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      selectedCategory === "ทั้งหมด" ||
      (p.categoryName ?? "ไม่ระบุหมวด") === selectedCategory;
    return matchSearch && matchCat;
  });

  function handleTabChange(tab: TabType) {
    setActiveTab(tab);
    setSearch("");
    setSelectedCategory("ทั้งหมด");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===== HEADER ===== */}
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <h1 className="text-xl font-extrabold tracking-wide">สบายพาณิชย์</h1>
          <p className="text-emerald-200 text-xs mt-0.5">
            เลือกสินค้า สั่งซื้อ และชำระเงินผ่าน PromptPay
          </p>
        </div>
      </header>

      {/* ===== TAB BAR ===== */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex">
            <button
              onClick={() => handleTabChange("instock")}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-all ${
                activeTab === "instock"
                  ? "border-emerald-700 text-emerald-700"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <span>🟢</span>
              <span>สินค้าพร้อมส่ง</span>
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {inStock.length}
              </span>
            </button>
            <button
              onClick={() => handleTabChange("preorder")}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-bold border-b-2 transition-all ${
                activeTab === "preorder"
                  ? "border-amber-500 text-amber-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <span>🕐</span>
              <span>สั่งจอง (Pre-order)</span>
              <span className="bg-amber-100 text-amber-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {preOrder.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ===== PRE-ORDER NOTICE ===== */}
      {activeTab === "preorder" && (
        <div className="bg-amber-50 border-b border-amber-200">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-start gap-3">
            <span className="text-2xl mt-0.5">📦</span>
            <div>
              <p className="text-amber-800 font-bold text-sm">
                สินค้า Pre-order — รับสินค้าภายใน 3–5 วันทำการ
              </p>
              <p className="text-amber-600 text-xs mt-0.5">
                สั่งจองได้เลย ทางร้านจะจัดส่งให้หลังยืนยันออเดอร์
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ===== SEARCH + CATEGORY ===== */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="ค้นหาสินค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  selectedCategory === cat
                    ? activeTab === "preorder"
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-emerald-700 text-white border-emerald-700"
                    : "bg-white text-gray-600 border-gray-300 hover:border-emerald-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== PRODUCT GRID ===== */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-5">
          <p className="text-gray-500 text-sm">
            แสดง{" "}
            <span
              className={`font-bold ${
                activeTab === "preorder" ? "text-amber-600" : "text-emerald-700"
              }`}
            >
              {filtered.length}
            </span>{" "}
            รายการ
          </p>
        </div>

        {sourceList.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <div className="text-5xl mb-3">🛒</div>
            <p className="font-semibold">ยังไม่มีสินค้าในระบบ</p>
            <p className="text-sm mt-1">กรุณากลับมาดูใหม่อีกครั้งเร็ว ๆ นี้</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-3">{activeTab === "preorder" ? "📋" : "📦"}</div>
            <p className="font-semibold">ไม่พบสินค้าที่ตรงกัน</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {filtered.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isPreOrder={activeTab === "preorder"}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        )}
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-emerald-700 text-emerald-200 text-center py-6 mt-10 text-sm">
        <p className="font-bold text-white text-base mb-1">สบายพาณิชย์</p>
        <p className="mt-3 text-emerald-300 text-xs">
          Pre-order รับสินค้าภายใน 3–5 วันทำการ
        </p>
      </footer>

      {/* ===== FLOATING CART BAR ===== */}
      {cart.length > 0 && (
        <Link
          href="/cart"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-emerald-700 text-white rounded-full shadow-xl px-5 py-3 hover:bg-emerald-800 transition-colors"
        >
          <span className="text-xl">🛒</span>
          <span className="font-bold text-sm">{cartCount(cart)} รายการ</span>
          <span className="w-px h-4 bg-emerald-400" />
          <span className="font-extrabold text-sm">
            ฿{cartTotal(cart).toLocaleString("th-TH")}
          </span>
        </Link>
      )}
    </div>
  );
}

function ProductCard({
  product,
  isPreOrder,
  onAddToCart,
}: {
  product: StorefrontProduct;
  isPreOrder: boolean;
  onAddToCart: (product: StorefrontProduct) => void;
}) {
  const imgSrc = product.image1Url || product.image2Url;

  const stockBadge = isPreOrder ? (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-amber-600 bg-amber-50">
      Pre-order
    </span>
  ) : product.availableQty > 10 ? (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-emerald-600 bg-emerald-50">
      คงเหลือ {product.availableQty}
    </span>
  ) : product.availableQty > 3 ? (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-yellow-600 bg-yellow-50">
      คงเหลือ {product.availableQty}
    </span>
  ) : (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-orange-500 bg-orange-50">
      คงเหลือ {product.availableQty}
    </span>
  );

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col ${
        isPreOrder ? "border-amber-200" : "border-gray-100"
      }`}
    >
      <div className="aspect-square bg-gray-50 relative overflow-hidden">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={product.name}
            className={`w-full h-full object-cover ${isPreOrder ? "opacity-80" : ""}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-200">
            {isPreOrder ? "📋" : "🛍️"}
          </div>
        )}

        {isPreOrder && (
          <div className="absolute top-0 left-0 right-0 bg-amber-500/90 text-white text-[10px] font-bold text-center py-1">
            🕐 Pre-order · 3–5 วัน
          </div>
        )}

        {product.categoryName && (
          <span
            className={`absolute ${isPreOrder ? "top-6" : "top-2"} left-2 bg-white/80 backdrop-blur text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isPreOrder ? "text-amber-700 border-amber-200" : "text-emerald-700 border-emerald-200"
            }`}
          >
            {product.categoryName}
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <p className="text-[11px] text-gray-400 font-mono mb-0.5">{product.code}</p>
        <p className="text-sm font-semibold text-gray-800 leading-snug flex-1 line-clamp-2">
          {product.name}
        </p>

        <div className="mt-2 flex items-end justify-between gap-1">
          <div>
            <p className={`text-lg font-extrabold ${isPreOrder ? "text-amber-600" : "text-emerald-700"}`}>
              ฿{product.salePrice.toLocaleString("th-TH", { minimumFractionDigits: 0 })}
            </p>
            {product.unitName && <p className="text-[11px] text-gray-400">/ {product.unitName}</p>}
          </div>
          {stockBadge}
        </div>

        <button
          onClick={() => onAddToCart(product)}
          className={`mt-3 w-full rounded-full py-1.5 text-xs font-bold text-white transition-colors ${
            isPreOrder ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-700 hover:bg-emerald-800"
          }`}
        >
          + ใส่ตะกร้า
        </button>
      </div>
    </div>
  );
}
