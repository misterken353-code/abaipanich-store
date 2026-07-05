"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cartTotal, getCart, saveCart, type CartItem } from "@/lib/cart";

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [lineUserId, setLineUserId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCart(getCart());
    setLoaded(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !phone.trim()) {
      setError("กรุณากรอกชื่อและเบอร์โทรศัพท์");
      return;
    }
    if (cart.length === 0) {
      setError("ตะกร้าว่างเปล่า");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: { name: name.trim(), phone: phone.trim(), address: address.trim() || null, lineUserId: lineUserId.trim() || null },
          note: note.trim() || null,
          items: cart.map((i) => ({ productId: i.productId, qty: i.qty })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "สั่งซื้อไม่สำเร็จ");
        return;
      }
      saveCart([]);
      router.push(`/order/${data.orderNo}`);
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setSubmitting(false);
    }
  }

  if (loaded && cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3">🛒</div>
          <p className="font-semibold text-gray-500">ตะกร้าว่างเปล่า</p>
          <Link
            href="/"
            className="inline-block mt-4 bg-emerald-700 text-white text-sm font-bold px-5 py-2 rounded-full hover:bg-emerald-800"
          >
            ไปเลือกสินค้า
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-700 text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/cart" className="text-emerald-200 hover:text-white text-sm">
            ← กลับไปตะกร้า
          </Link>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-4">
          <h1 className="text-xl font-extrabold">ข้อมูลจัดส่ง</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อ-นามสกุล *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="ชื่อผู้รับสินค้า"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">เบอร์โทรศัพท์ *</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="08x-xxx-xxxx"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">ที่อยู่จัดส่ง</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="ที่อยู่สำหรับจัดส่งสินค้า"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">LINE ID (ถ้ามี)</label>
            <input
              value={lineUserId}
              onChange={(e) => setLineUserId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="สำหรับติดต่อเรื่องออเดอร์"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">หมายเหตุ</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="เช่น เวลาที่สะดวกให้จัดส่ง"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-gray-500 font-semibold">ยอดรวม</span>
            <span className="text-xl font-extrabold text-emerald-700">
              ฿{cartTotal(cart).toLocaleString("th-TH")}
            </span>
          </div>

          {error && <p className="text-red-600 text-sm font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-emerald-700 text-white font-bold py-3 rounded-full hover:bg-emerald-800 transition-colors disabled:opacity-50"
          >
            {submitting ? "กำลังสั่งซื้อ..." : "ยืนยันสั่งซื้อ"}
          </button>
        </form>
      </main>
    </div>
  );
}
