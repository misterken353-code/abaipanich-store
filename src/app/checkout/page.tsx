"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cartTotal, getCart, saveCart, type CartItem } from "@/lib/cart";

type ShippingMethod = "PICKUP" | "MOTORCYCLE" | "FREIGHT";

const SHIPPING_OPTIONS: { value: ShippingMethod; label: string; desc: string }[] = [
  { value: "PICKUP", label: "รับเองหน้าร้าน", desc: "ไม่มีค่าจัดส่ง" },
  {
    value: "MOTORCYCLE",
    label: "เรียกม้าเร็วจัดส่ง",
    desc: "เริ่มต้น 15 บาท (กม. แรก) กม. ที่ 2 ขึ้นไป กม. ละ 5 บาท",
  },
  { value: "FREIGHT", label: "จัดส่งทางขนส่ง", desc: "ชำระค่าส่งปลายทางกับบริษัทขนส่ง" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [lineUserId, setLineUserId] = useState("");
  const [note, setNote] = useState("");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("PICKUP");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCart(getCart());
    setLoaded(true);
  }, []);

  useEffect(() => {
    setLocation(null);
    setLocationError(null);
  }, [shippingMethod]);

  function shareLocation() {
    if (!navigator.geolocation) {
      setLocationError("อุปกรณ์นี้ไม่รองรับการแชร์โลเคชั่น");
      return;
    }
    setLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError("แชร์โลเคชั่นไม่สำเร็จ กรุณาอนุญาตการเข้าถึงตำแหน่ง");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

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
    if (shippingMethod !== "PICKUP" && !address.trim()) {
      setError("กรุณากรอกที่อยู่จัดส่ง");
      return;
    }
    if (shippingMethod === "MOTORCYCLE" && !location) {
      setError("กรุณากดแชร์โลเคชั่นสำหรับให้คนขับม้าเร็วมารับ-ส่ง");
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
          shippingMethod,
          customerLat: location?.lat ?? null,
          customerLng: location?.lng ?? null,
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">วิธีจัดส่ง *</label>
            <div className="space-y-2">
              {SHIPPING_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-start gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                    shippingMethod === opt.value
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-emerald-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="shippingMethod"
                    checked={shippingMethod === opt.value}
                    onChange={() => setShippingMethod(opt.value)}
                    className="mt-1 accent-emerald-700"
                  />
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>

            {shippingMethod === "MOTORCYCLE" && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs text-amber-700 font-semibold">
                  ⚠️ ค่าส่งม้าเร็วเป็นค่าใช้จ่ายเพิ่มเติม ไม่รวมอยู่ในยอดชำระค่าสินค้า — ชำระค่าส่งให้คนขับโดยตรง
                </p>
                <button
                  type="button"
                  onClick={shareLocation}
                  disabled={locating}
                  className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold py-2 rounded-full disabled:opacity-50"
                >
                  {locating ? "กำลังขอตำแหน่ง..." : location ? "📍 แชร์โลเคชั่นแล้ว ✓" : "📍 แชร์โลเคชั่น"}
                </button>
                {location && (
                  <p className="text-xs text-emerald-700 mt-2">
                    ได้รับตำแหน่งของคุณแล้ว ({location.lat.toFixed(5)}, {location.lng.toFixed(5)})
                  </p>
                )}
                {locationError && <p className="text-xs text-red-600 mt-2">{locationError}</p>}
              </div>
            )}
          </div>

          {shippingMethod !== "PICKUP" && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">ที่อยู่จัดส่ง *</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="ที่อยู่สำหรับจัดส่งสินค้า"
              />
            </div>
          )}
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
