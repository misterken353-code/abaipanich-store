"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ConfirmArrivedButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/purchase-list/${productId}/confirm`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "ยืนยันไม่สำเร็จ");
        return;
      }
      setMessage(
        `รับเข้าสต็อก ${data.totalQty} ชิ้น (${data.ordersAffected} ออเดอร์) — ของถึงร้านครบแล้ว ${data.ordersReady} ออเดอร์ แจ้งลูกค้าแล้ว ${data.notified} ราย`
      );
      router.refresh();
    } catch {
      setMessage("เชื่อมต่อไม่ได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="shrink-0 text-right">
      <button
        onClick={handleClick}
        disabled={loading}
        className="whitespace-nowrap rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
      >
        {loading ? "กำลังบันทึก..." : "✅ ซื้อมาแล้ว รับเข้าสต็อก"}
      </button>
      {message && <p className="mt-2 max-w-xs text-xs text-gray-500">{message}</p>}
    </div>
  );
}
