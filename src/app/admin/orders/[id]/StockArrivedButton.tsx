"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StockArrivedButton({
  orderId,
  stockArrivedAt,
}: {
  orderId: string;
  stockArrivedAt: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(!!stockArrivedAt);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/stock-arrived`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "อัปเดตไม่สำเร็จ");
        return;
      }
      setDone(true);
      setMessage(
        data.notified
          ? "แจ้งลูกค้าทาง LINE เรียบร้อย ✓"
          : "บันทึกแล้ว (ลูกค้าไม่มี LINE ผูกไว้ จึงไม่ได้แจ้งเตือน)"
      );
      router.refresh();
    } catch {
      setMessage("เชื่อมต่อไม่ได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading || done}
        className={`rounded-full px-5 py-2 text-sm font-bold transition-colors disabled:opacity-70 ${
          done ? "bg-green-100 text-green-700" : "bg-amber-500 text-white hover:bg-amber-600"
        }`}
      >
        {done ? "✓ สินค้าถึงร้านแล้ว" : loading ? "กำลังบันทึก..." : "📦 สินค้ามาถึงร้านแล้ว"}
      </button>
      {!done && (
        <p className="mt-2 text-xs text-gray-400">
          กดปุ่มนี้เมื่อสินค้า Pre-order มาถึงร้านจริง — ถ้าเลือกส่งม้าเร็ว ออเดอร์จะเข้าคิวให้คนขับกดรับงานได้หลังกดปุ่มนี้เท่านั้น
        </p>
      )}
      {message && <p className="mt-2 text-xs text-gray-500">{message}</p>}
    </div>
  );
}
