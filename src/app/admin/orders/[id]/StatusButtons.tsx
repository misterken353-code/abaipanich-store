"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const OPTIONS: { value: string; label: string }[] = [
  { value: "PENDING_PAYMENT", label: "รอชำระเงิน" },
  { value: "PAID", label: "ชำระเงินแล้ว" },
  { value: "SHIPPED", label: "จัดส่งแล้ว" },
  { value: "CANCELLED", label: "ยกเลิก" },
];

export default function StatusButtons({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(next: string) {
    if (next === status) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "อัปเดตไม่สำเร็จ");
        return;
      }
      router.refresh();
    } catch {
      setError("เชื่อมต่อไม่ได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            disabled={loading}
            onClick={() => updateStatus(opt.value)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition-colors disabled:opacity-50 ${
              status === opt.value
                ? "bg-green-700 text-white border-green-700"
                : "bg-white text-gray-600 border-gray-300 hover:border-green-400"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
