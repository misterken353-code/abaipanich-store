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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
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

  const categories = useMemo(() => {
    const map = new Map<string, { count: number; imageUrl: string | null }>();
    for (const p of sourceList) {
      const cat = p.categoryName ?? "ไม่ระบุหมวด";
      const entry = map.get(cat) ?? { count: 0, imageUrl: null };
      entry.count++;
      if (!entry.imageUrl) {
        const img = p.image1Url || p.image2Url;
        if (img) entry.imageUrl = img;
      }
      map.set(cat, entry);
    }
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  }, [sourceList]);

  const isSearching = search.trim().length > 0;

  const filtered = sourceList.filter((p) => {
    const matchSearch =
      !isSearching ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());
    const matchCat =
      isSearching || selectedCategory === null || (p.categoryName ?? "ไม่ระบุหมวด") === selectedCategory;
    return matchSearch && matchCat;
  });

  const showCategoryGrid = !isSearching && selectedCategory === null;

  function handleTabChange(tab: TabType) {
    setActiveTab(tab);
    setSearch("");
    setSelectedCategory(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ===== BANNER ===== */}
      <header className="relative sticky top-0 z-50 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/banner.png" alt="สบายพาณิชย์" className="w-full h-28 sm:h-36 object-cover" />
      </header>

      {/* ===== TAB BAR ===== */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4">
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
          <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-start gap-3">
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

      {/* ===== SEARCH ===== */}
      <div className="bg-white border-b">
        <div className="max-w-[1600px] mx-auto px-4 py-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="ค้นหาสินค้า..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-4 py-6">
        {sourceList.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <div className="text-5xl mb-3">🛒</div>
            <p className="font-semibold">ยังไม่มีสินค้าในระบบ</p>
            <p className="text-sm mt-1">กรุณากลับมาดูใหม่อีกครั้งเร็ว ๆ นี้</p>
          </div>
        ) : showCategoryGrid ? (
          <>
            <h2 className="text-gray-700 font-bold text-lg mb-4">เลือกหมวดหมู่สินค้า</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className="group bg-white rounded-2xl shadow-sm border border-gray-100 hover:border-amber-300/60 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-left"
                >
                  <div className="aspect-[4/3] bg-gray-50 relative overflow-hidden">
                    {cat.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cat.imageUrl}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-200">
                        🗂️
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-white font-bold text-base leading-snug drop-shadow">{cat.name}</p>
                      <p className="text-amber-200/90 text-xs font-semibold mt-0.5">{cat.count} รายการ</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                {!isSearching && (
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-sm font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    ← กลับไปหมวดหมู่
                  </button>
                )}
                {isSearching && (
                  <button
                    onClick={() => setSearch("")}
                    className="text-sm font-semibold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    ✕ ล้างการค้นหา
                  </button>
                )}
              </div>
              <p className="text-gray-500 text-sm">
                แสดง{" "}
                <span
                  className={`font-bold ${
                    activeTab === "preorder" ? "text-amber-600" : "text-emerald-700"
                  }`}
                >
                  {filtered.length}
                </span>{" "}
                รายการ{!isSearching && selectedCategory ? ` ใน "${selectedCategory}"` : ""}
              </p>
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <div className="text-5xl mb-3">{activeTab === "preorder" ? "📋" : "📦"}</div>
                <p className="font-semibold">ไม่พบสินค้าที่ตรงกัน</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
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
          </>
        )}
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="relative bg-gradient-to-b from-[#0a3d2c] to-[#04241a] text-center py-10 mt-10 overflow-hidden">
        <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-amber-400/40" />
        <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-amber-400/40" />
        <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-amber-400/40" />
        <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-amber-400/40" />

        <div className="relative max-w-xl mx-auto px-4">
          <p className="font-serif-th font-bold text-amber-200 text-2xl sm:text-3xl tracking-wide">
            สบายพาณิชย์
          </p>
          <div className="w-16 h-px bg-amber-400/60 mx-auto my-3" />

          <p className="text-emerald-100/90 text-sm leading-relaxed">
            📍 63 หมู่ 3 บ้านสบาย ต.รุ่งระวี อ.น้ำเกลี้ยง จ.ศรีสะเกษ 33130
          </p>
          <a
            href="tel:0956123937"
            className="inline-block mt-1 text-amber-200 text-sm font-semibold hover:text-amber-100"
          >
            📞 095-612-3937
          </a>

          <div className="mt-5 inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 rounded-full px-5 py-2">
            <span className="text-amber-200 text-xs sm:text-sm font-semibold">
              🛵 สินค้าพร้อมส่งทุกรายการ รับเองที่หน้าร้าน หรือให้ม้าเร็ววิ่งส่งถึงมือคุณ
            </span>
          </div>

          <p className="mt-4 text-emerald-300/70 text-xs">
            Pre-order รับสินค้าภายใน 3–5 วันทำการ
          </p>
        </div>
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
      className={`group bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col ${
        isPreOrder ? "border-amber-200 hover:border-amber-300" : "border-gray-100 hover:border-amber-300/60"
      }`}
    >
      <div className="aspect-square bg-gray-50 relative overflow-hidden">
        {imgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={product.name}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isPreOrder ? "opacity-80" : ""}`}
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

      <div className="p-4 flex flex-col flex-1">
        <p className="text-[11px] text-gray-400 font-mono mb-1">{product.code}</p>
        <p className="text-sm font-semibold text-gray-800 leading-snug flex-1 line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </p>

        <div className="mt-3 flex items-end justify-between gap-1">
          <div>
            <p className={`text-xl font-extrabold tracking-tight ${isPreOrder ? "text-amber-600" : "text-emerald-700"}`}>
              ฿{product.salePrice.toLocaleString("th-TH", { minimumFractionDigits: 0 })}
            </p>
            {product.unitName && <p className="text-[11px] text-gray-400">/ {product.unitName}</p>}
          </div>
          {stockBadge}
        </div>

        <button
          onClick={() => onAddToCart(product)}
          className={`mt-3 w-full rounded-full py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md ${
            isPreOrder ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-700 hover:bg-emerald-800"
          }`}
        >
          + ใส่ตะกร้า
        </button>
      </div>
    </div>
  );
}
