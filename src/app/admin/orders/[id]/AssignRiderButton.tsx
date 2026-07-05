"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Rider {
  id: string;
  name: string;
  phone: string;
  lineUserId: string | null;
}

export default function AssignRiderButton({
  orderId,
  riders,
  currentRiderId,
}: {
  orderId: string;
  riders: Rider[];
  currentRiderId: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(currentRiderId ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleAssign() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/assign-rider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ riderId: selected || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "มอบหมายไม่สำเร็จ");
        return;
      }
      if (!selected) {
        setMessage("ยกเลิกการมอบหมายแล้ว");
      } else {
        setMessage(data.notified ? "แจ้งงานเข้า LINE คนขับแล้ว ✓" : "มอบหมายแล้ว (คนขับไม่มี LINE ผูกไว้ จึงไม่ได้แจ้งเตือน)");
      }
      router.refresh();
    } catch {
      setMessage("เชื่อมต่อไม่ได้");
    } finally {
      setSaving(false);
    }
  }

  if (riders.length === 0) {
    return <p className="text-sm text-gray-400">ยังไม่มีคนขับในระบบ — เพิ่มได้ที่เมนู &quot;คนขับ (ม้าเร็ว)&quot;</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
      >
        <option value="">— ไม่ได้มอบหมาย —</option>
        {riders.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name} ({r.phone}){!r.lineUserId ? " — ไม่มี LINE" : ""}
          </option>
        ))}
      </select>
      <button
        onClick={handleAssign}
        disabled={saving}
        className="rounded-full bg-green-700 px-5 py-2 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-50"
      >
        {saving ? "กำลังบันทึก..." : "มอบหมายงาน"}
      </button>
      {message && <p className="text-xs text-gray-500">{message}</p>}
    </div>
  );
}
