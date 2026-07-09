"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cartTotal, getCart, saveCart, type CartItem } from "@/lib/cart";

type ShippingMethod = "PICKUP" | "MOTORCYCLE" | "FREIGHT";
type PaymentMethod = "COD" | "TRANSFER";

const SHIPPING_OPTIONS: { value: ShippingMethod; label: string; desc: string }[] = [
  { value: "PICKUP", label: "รับเองหน้าร้าน", desc: "ไม่มีค่าจัดส่ง" },
  {
    value: "MOTORCYCLE",
    label: "เรียกม้าเร็วจัดส่ง",
    desc: "เริ่มต้น 15 บาท (กม. แรก) กม. ที่ 2 ขึ้นไป กม. ละ 5 บาท",
  },
  { value: "FREIGHT", label: "จัดส่งทางขนส่ง", desc: "ชำระค่าส่งปลายทางกับบริษัทขนส่ง" },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; desc: string }[] = [
  { value: "TRANSFER", label: "โอนเงินผ่าน PromptPay", desc: "สแกน QR ชำระเงินทันทีหลังสั่งซื้อ" },
  { value: "COD", label: "จ่ายตอนรับของ", desc: "ชำระเงินสดเมื่อได้รับสินค้า" },
];

const FIELD_CLASS = "w-full rounded-xl border px-4 py-2 text-sm outline-none transition-colors";

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  const [note, setNote] = useState("");
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("PICKUP");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("TRANSFER");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [deliveryFeeEstimate, setDeliveryFeeEstimate] = useState<{ distanceKm: number; fee: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCart(getCart());
    setLoaded(true);
  }, []);

  const hasPreOrder = cart.some((i) => i.isPreOrder);

  // สินค้า Pre-order ต้องชำระเงินล่วงหน้าเท่านั้น (ร้านต้องมีเงินไปสั่งของก่อน)
  useEffect(() => {
    if (hasPreOrder) setPaymentMethod("TRANSFER");
  }, [hasPreOrder]);

  useEffect(() => {
    setLocation(null);
    setLocationError(null);
    setDeliveryFeeEstimate(null);
  }, [shippingMethod]);

  // พอแชร์โลเคชั่นสำเร็จสำหรับม้าเร็ว ลองประเมินค่าส่งจริงตามระยะทาง (ถ้าร้านตั้งพิกัดไว้แล้ว)
  useEffect(() => {
    if (shippingMethod !== "MOTORCYCLE" || !location) {
      setDeliveryFeeEstimate(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/delivery-fee/estimate?lat=${location.lat}&lng=${location.lng}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setDeliveryFeeEstimate({ distanceKm: data.distanceKm, fee: data.fee });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [shippingMethod, location]);

  async function handlePhoneBlur() {
    const p = phone.trim();
    if (p.length < 9) return;
    setCheckingPhone(true);
    try {
      const res = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(p)}`);
      const data = await res.json();
      if (data.customer) {
        setName(data.customer.name ?? "");
        setAddress(data.customer.address ?? "");
        setLineUserId(data.customer.lineUserId ?? null);
        setPrefilled(true);
      } else {
        setPrefilled(false);
      }
    } catch {
      // เงียบไว้ — ไม่ใช่ error ร้ายแรง แค่ prefill ไม่สำเร็จ ลูกค้ากรอกเองได้ตามปกติ
    } finally {
      setCheckingPhone(false);
    }
  }

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
          customer: { name: name.trim(), phone: phone.trim(), address: address.trim() || null, lineUserId },
          note: note.trim() || null,
          shippingMethod,
          paymentMethod,
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
        {hasPreOrder && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-2xl mt-0.5">🕐</span>
            <div className="text-sm">
              <p className="font-bold text-amber-800">ตะกร้ามีสินค้า Pre-order — นัดรับสินค้า ประมาณ 2–5 วัน</p>
              <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                เมื่อโอนเงินยืนยันแล้ว ทางร้านจะรีบสั่งสินค้าเข้ามาให้ทันที รับประกันความมั่นใจ:
                หากไม่ได้รับสินค้าภายใน 5 วัน สามารถขอคืนเงินเต็มจำนวนได้ที่หน้าร้าน — จึงต้องชำระเงินผ่าน
                PromptPay ล่วงหน้าเท่านั้นสำหรับสินค้า Pre-order
              </p>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">เบอร์โทรศัพท์ *</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={handlePhoneBlur}
              className={`${FIELD_CLASS} border-gray-200 bg-white focus:ring-2 focus:ring-emerald-400`}
              placeholder="08x-xxx-xxxx"
            />
            {checkingPhone && <p className="text-xs text-gray-400 mt-1">กำลังตรวจสอบ...</p>}
          </div>

          {prefilled && (
            <p className="text-xs text-emerald-700 font-semibold bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2">
              ✓ พบข้อมูลลูกค้าเดิม — ดึงชื่อ/ที่อยู่จากคำสั่งซื้อก่อนหน้าให้แล้ว แก้ไขได้ตามต้องการ
            </p>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">ชื่อ-นามสกุล *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${FIELD_CLASS} border-gray-200 bg-white focus:ring-2 focus:ring-emerald-400`}
              placeholder="ชื่อผู้รับสินค้า"
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
                {deliveryFeeEstimate && (
                  <p className="text-xs font-bold text-amber-800 mt-2 bg-amber-100 rounded-lg px-3 py-2">
                    ค่าส่งโดยประมาณ ฿{deliveryFeeEstimate.fee.toLocaleString("th-TH")} (ระยะทาง ~
                    {deliveryFeeEstimate.distanceKm.toFixed(1)} กม.)
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
                className={`${FIELD_CLASS} border-gray-200 bg-white focus:ring-2 focus:ring-emerald-400`}
                placeholder="ที่อยู่สำหรับจัดส่งสินค้า"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">วิธีชำระเงิน *</label>
            <div className="space-y-2">
              {PAYMENT_OPTIONS.map((opt) => {
                const disabled = hasPreOrder && opt.value === "COD";
                return (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-3 border rounded-xl px-4 py-3 transition-colors ${
                      disabled
                        ? "opacity-40 cursor-not-allowed border-gray-200"
                        : "cursor-pointer " +
                          (paymentMethod === opt.value
                            ? "border-emerald-500 bg-emerald-50"
                            : "border-gray-200 hover:border-emerald-300")
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      checked={paymentMethod === opt.value}
                      disabled={disabled}
                      onChange={() => setPaymentMethod(opt.value)}
                      className="mt-1 accent-emerald-700"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {disabled ? "ไม่รองรับสำหรับสินค้า Pre-order — ต้องชำระเงินล่วงหน้าเท่านั้น" : opt.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">หมายเหตุ</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className={`${FIELD_CLASS} border-gray-200 bg-white focus:ring-2 focus:ring-emerald-400`}
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
