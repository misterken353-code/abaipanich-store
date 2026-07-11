"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  STAGE_ORDER,
  stageLabels,
  type DeliveryStageValue,
  type ShippingMethodValue,
} from "@/lib/deliveryStage";

// ปุ่มเลื่อนขั้นการจัดส่ง (แอดมิน) — กดเพื่อให้ลูกค้าเห็นสถานะอัปเดตในหน้าติดตามออเดอร์
export default function DeliveryStageButtons({
  orderId,
  current,
  shippingMethod,
}: {
  orderId: string;
  current: DeliveryStageValue | null;
  shippingMethod: ShippingMethodValue;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const labels = stageLabels(shippingMethod);
  const currentIdx = current ? STAGE_ORDER.indexOf(current) : -1;

  async function setStage(stage: DeliveryStageValue) {
    setLoading(stage);
    setError(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryStage: stage }),
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
      setLoading(null);
    }
  }

  return (
    <div>
      <p className="mb-3 text-xs text-gray-400">
        กดเลื่อนขั้นการจัดส่ง — ลูกค้าจะเห็นสถานะนี้ในหน้าติดตามออเดอร์ทันที
        (กด &quot;รับออเดอร์&quot; ด้านบนจะตั้งขั้นแรกให้อัตโนมัติ, คนขับกด &quot;จัดส่งสำเร็จ&quot; จะตั้งขั้นสุดท้ายให้เอง)
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {STAGE_ORDER.map((stage, i) => {
          const reached = i <= currentIdx;
          const isCurrent = i === currentIdx;
          return (
            <button
              key={stage}
              disabled={loading !== null}
              onClick={() => setStage(stage)}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                isCurrent
                  ? "border-green-700 bg-green-700 text-white"
                  : reached
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-gray-300 bg-white text-gray-600 hover:border-green-400"
              }`}
            >
              {loading === stage ? "..." : `${labels[stage].icon} ${labels[stage].title}`}
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
