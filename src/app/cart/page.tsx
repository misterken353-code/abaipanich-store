"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartTotal, getCart, saveCart, type CartItem } from "@/lib/cart";

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCart(getCart());
    setLoaded(true);
  }, []);

  function updateQty(productId: string, qty: number) {
    setCart((prev) => {
      const next =
        qty <= 0
          ? prev.filter((i) => i.productId !== productId)
          : prev.map((i) => (i.productId === productId ? { ...i, qty } : i));
      saveCart(next);
      return next;
    });
  }

  function removeItem(productId: string) {
    updateQty(productId, 0);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-green-200 hover:text-white text-sm">
            ← กลับไปเลือกสินค้า
          </Link>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-4">
          <h1 className="text-xl font-extrabold">ตะกร้าสินค้า</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {!loaded ? null : cart.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <div className="text-5xl mb-3">🛒</div>
            <p className="font-semibold">ยังไม่มีสินค้าในตะกร้า</p>
            <Link
              href="/"
              className="inline-block mt-4 bg-green-700 text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-green-800"
            >
              ไปเลือกสินค้า
            </Link>
          </div>
        ) : (
          <>
            {cart.some((i) => i.isPreOrder) && (
              <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <span className="text-xl mt-0.5">🕐</span>
                <p className="text-amber-700 text-xs leading-relaxed">
                  <span className="font-bold text-amber-800">มีสินค้า Pre-order ในตะกร้า</span> — นัดรับสินค้าประมาณ
                  2–5 วันหลังโอนเงิน รับประกันคืนเงินเต็มจำนวนที่ร้านหากไม่ได้ของภายใน 5 วัน
                </p>
              </div>
            )}
            <div className="bg-white rounded-2xl border border-gray-100 divide-y">
              {cart.map((item) => (
                <div key={item.productId} className="flex items-center gap-3 p-3">
                  <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-gray-200">
                        🛍️
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-400 font-mono">{item.code}</p>
                    <p className="text-sm font-semibold text-gray-800 line-clamp-2">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-green-700 font-bold text-sm">
                        ฿{item.price.toLocaleString("th-TH")}
                      </p>
                      {item.isPreOrder && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-amber-600 bg-amber-50">
                          🕐 นัดรับ 2–5 วัน
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQty(item.productId, item.qty - 1)}
                      className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 font-bold hover:bg-gray-100"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.qty}</span>
                    <button
                      onClick={() => updateQty(item.productId, item.qty + 1)}
                      className="w-7 h-7 rounded-full border border-gray-300 text-gray-600 font-bold hover:bg-gray-100"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.productId)}
                    className="text-gray-300 hover:text-red-500 text-lg px-1"
                    aria-label="ลบ"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
              <span className="text-gray-500 font-semibold">ยอดรวม</span>
              <span className="text-2xl font-extrabold text-green-700">
                ฿{cartTotal(cart).toLocaleString("th-TH")}
              </span>
            </div>

            <Link
              href="/checkout"
              className="mt-4 block text-center bg-green-700 text-white font-bold py-3 rounded-full hover:bg-green-800 transition-colors"
            >
              ดำเนินการสั่งซื้อ
            </Link>
          </>
        )}
      </main>
    </div>
  );
}
