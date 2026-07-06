"use client";

import { useCallback, useEffect, useState } from "react";

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
  shippingAddress: string | null;
  customerLat: number | null;
  customerLng: number | null;
  customer: { name: string; phone: string };
  items: OrderItem[];
}

const SHIPPING_LABEL: Record<string, string> = { PICKUP: "รับเองหน้าร้าน", MOTORCYCLE: "ม้าเร็ว", FREIGHT: "ขนส่ง" };

export default function RiderDashboard({ token }: { token: string }) {
  const [riderName, setRiderName] = useState<string | null>(null);
  const [available, setAvailable] = useState<OrderInfo[]>([]);
  const [mine, setMine] = useState<OrderInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/rider/${token}/orders`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "โหลดข้อมูลไม่สำเร็จ");
        return;
      }
      setRiderName(data.rider.name);
      setAvailable(data.available);
      setMine(data.mine);
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

  if (error && !riderName) {
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
          <h1 className="text-lg font-bold">🛵 สวัสดี {riderName ?? "..."}</h1>
          <p className="text-emerald-200 text-xs mt-0.5">สบายพาณิชย์ — งานส่งของ</p>
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
          💵 เก็บเงินปลายทาง ฿{Number(order.totalAmount).toLocaleString("th-TH")}
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
