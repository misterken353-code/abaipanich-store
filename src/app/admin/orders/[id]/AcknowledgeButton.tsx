"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AcknowledgeButton({
  orderId,
  acknowledgedAt,
}: {
  orderId: string;
  acknowledgedAt: string | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(!!acknowledgedAt);

  async function handleClick() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/acknowledge`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "รับออเดอร์ไม่สำเร็จ");
        return;
      }
      setDone(true);
      setMessage(data.notified ? "แจ้งลูกค้าทาง LINE เรียบร้อย ✓" : "รับออเดอร์แล้ว (ลูกค้าไม่มี LINE ผูกไว้ จึงไม่ได้แจ้งเตือน)");
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
          done ? "bg-green-100 text-green-700" : "bg-green-700 text-white hover:bg-green-800"
        }`}
      >
        {done ? "✓ รับออเดอร์แล้ว" : loading ? "กำลังส่ง..." : "📦 รับออเดอร์"}
      </button>
      {message && <p className="mt-2 text-xs text-gray-500">{message}</p>}
    </div>
  );
}
