"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface OrderItem {
  id: string;
  nameSnapshot: string;
  quantity: number;
}

interface OrderInfo {
  id: string;
  orderNo: string;
  totalAmount: string;
  paymentMethod: string;
  deliveryFee: string | null;
  shippingAddress: string | null;
  customerLat: number | null;
  customerLng: number | null;
  customer: { name: string; phone: string };
  items: OrderItem[];
}

interface HistoryOrder {
  id: string;
  orderNo: string;
  totalAmount: string;
  riderRating: number | null;
  riderCommission: string | null;
  commissionSettled: boolean;
  updatedAt: string;
}

interface RiderStats {
  name: string;
  avgRating: number | null;
  ratedCount: number;
  unsettledCommission: number;
  unsettledCod: number;
}

const LOCATION_UPDATE_INTERVAL_MS = 60_000;

export default function RiderDashboard({ token }: { token: string }) {
  const [rider, setRider] = useState<RiderStats | null>(null);
  const [available, setAvailable] = useState<OrderInfo[]>([]);
  const [mine, setMine] = useState<OrderInfo[]>([]);
  const [history, setHistory] = useState<HistoryOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [locationShared, setLocationShared] = useState(false);
  const lastSentRef = useRef(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/rider/${token}/orders`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "โหลดข้อมูลไม่สำเร็จ");
        return;
      }
      setRider(data.rider);
      setAvailable(data.available);
      setMine(data.mine);
      setHistory(data.history);
      setError(null);
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  // แชร์ตำแหน่งเป็นระยะ ๆ (ใช้จับคู่งานใหม่กับคนขับที่อยู่ใกล้ลูกค้าที่สุด)
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSentRef.current < LOCATION_UPDATE_INTERVAL_MS) return;
        lastSentRef.current = now;
        fetch(`/api/rider/${token}/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        })
          .then(() => setLocationShared(true))
          .catch(() => {});
      },
      () => setLocationShared(false),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [token]);

  async function claim(orderId: string) {
    setBusyId(orderId);
    setMessage(null);
    try {
      const res = await fetch(`/api/rider/${token}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "รับงานไม่สำเร็จ");
      }
      await load();
    } catch {
      setMessage("เชื่อมต่อไม่ได้");
    } finally {
      setBusyId(null);
    }
  }

  async function deliver(orderId: string) {
    if (!confirm("ยืนยันว่าจัดส่งสำเร็จแล้ว?")) return;
    setBusyId(orderId);
    setMessage(null);
    try {
      const res = await fetch(`/api/rider/${token}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "แจ้งจัดส่งไม่สำเร็จ");
      }
      await load();
    } catch {
      setMessage("เชื่อมต่อไม่ได้");
    } finally {
      setBusyId(null);
    }
  }

  if (error && !rider) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-3">🚫</div>
          <p className="font-semibold text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-700 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <h1 className="text-lg font-bold">🛵 สวัสดี {rider?.name ?? "..."}</h1>
          <div className="flex items-center gap-3 mt-1 text-emerald-200 text-xs">
            <span>
              {rider?.avgRating != null ? `⭐ ${rider.avgRating.toFixed(1)} (${rider.ratedCount})` : "ยังไม่มีคะแนน"}
            </span>
            <span>·</span>
            <span>ค้างจ่าย ฿{(rider?.unsettledCommission ?? 0).toLocaleString("th-TH")}</span>
            <span>·</span>
            <span>เงินสดค้างนำส่งร้าน ฿{(rider?.unsettledCod ?? 0).toLocaleString("th-TH")}</span>
            <span>·</span>
            <span>{locationShared ? "📍 แชร์ตำแหน่งอยู่" : "📍 ไม่ได้แชร์ตำแหน่ง"}</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-5 space-y-6">
        {message && (
          <p className="bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold rounded-xl px-4 py-2">
            {message}
          </p>
        )}

        <section>
          <h2 className="font-bold text-gray-700 mb-3">งานของฉัน ({mine.length})</h2>
          {mine.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีงานที่รับไว้</p>
          ) : (
            <div className="space-y-3">
              {mine.map((o) => (
                <OrderCard key={o.id} order={o} action={{ label: "✅ จัดส่งสำเร็จแล้ว", busy: busyId === o.id, onClick: () => deliver(o.id) }} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-bold text-gray-700 mb-3">งานที่ว่าง ({available.length})</h2>
          {loading ? (
            <p className="text-sm text-gray-400">กำลังโหลด...</p>
          ) : available.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีงานว่างตอนนี้</p>
          ) : (
            <div className="space-y-3">
              {available.map((o) => (
                <OrderCard key={o.id} order={o} action={{ label: "📦 รับงานนี้", busy: busyId === o.id, onClick: () => claim(o.id) }} />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-bold text-gray-700 mb-3">ประวัติงานที่ส่งสำเร็จ ({history.length})</h2>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400">ยังไม่มีประวัติ</p>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 divide-y">
              {history.map((o) => (
                <div key={o.id} className="p-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-semibold text-gray-800">{o.orderNo}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(o.updatedAt).toLocaleDateString("th-TH")}
                      {o.riderRating != null && ` · ${"⭐".repeat(o.riderRating)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-400">ค่าคอมฯ</p>
                    <p className={`font-bold ${o.commissionSettled ? "text-gray-400" : "text-amber-600"}`}>
                      ฿{Number(o.riderCommission ?? 0).toLocaleString("th-TH")}
                      {o.commissionSettled && " ✓"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function OrderCard({
  order,
  action,
}: {
  order: OrderInfo;
  action: { label: string; busy: boolean; onClick: () => void };
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between">
        <p className="font-bold text-gray-800">{order.orderNo}</p>
        <p className="text-emerald-700 font-extrabold">฿{Number(order.totalAmount).toLocaleString("th-TH")}</p>
      </div>
      <p className="text-sm text-gray-600 mt-1">{order.customer.name} · {order.customer.phone}</p>
      <p className="text-xs text-gray-400 mt-1">
        {order.items.map((i) => `${i.nameSnapshot} x${i.quantity}`).join(", ")}
      </p>
      {order.shippingAddress && <p className="text-sm text-gray-600 mt-2">📍 {order.shippingAddress}</p>}
      {order.customerLat != null && order.customerLng != null && (
        <a
          href={`https://www.google.com/maps?q=${order.customerLat},${order.customerLng}`}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-1 text-xs font-semibold text-emerald-700 underline"
        >
          เปิดแผนที่นำทาง
        </a>
      )}
      {order.paymentMethod === "COD" && (
        <p className="mt-2 text-xs font-bold text-amber-600 bg-amber-50 inline-block rounded-full px-3 py-1">
          💵 เก็บเงินค่าสินค้าจากลูกค้า ฿{Number(order.totalAmount).toLocaleString("th-TH")} (นำส่งร้าน)
        </p>
      )}
      {order.deliveryFee != null && Number(order.deliveryFee) > 0 && (
        <p className="mt-2 ml-2 text-xs font-bold text-emerald-700 bg-emerald-50 inline-block rounded-full px-3 py-1">
          💰 ค่าส่งเก็บจากลูกค้า ฿{Number(order.deliveryFee).toLocaleString("th-TH")} (ของคุณ)
        </p>
      )}

      <button
        onClick={action.onClick}
        disabled={action.busy}
        className="mt-3 w-full rounded-full bg-emerald-700 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50"
      >
        {action.busy ? "กำลังบันทึก..." : action.label}
      </button>
    </div>
  );
}
