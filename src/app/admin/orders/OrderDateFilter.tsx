"use client";

import { useRouter } from "next/navigation";

export interface DateOption {
  value: string; // YYYY-MM-DD
  label: string;
}
export interface MonthGroup {
  label: string; // เช่น "กรกฎาคม 2569"
  options: DateOption[];
}

// dropdown เลือกวันดูออเดอร์ (จัดกลุ่มตามเดือน) — เลือกแล้วเปลี่ยนหน้าเลย
export default function OrderDateFilter({ months, value }: { months: MonthGroup[]; value: string }) {
  const router = useRouter();

  return (
    <select
      value={value}
      onChange={(e) => {
        const v = e.target.value;
        router.push(`/admin/orders?date=${encodeURIComponent(v)}`);
      }}
      className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400"
    >
      <option value="all">🗓️ ทุกวัน (ทั้งหมด)</option>
      {months.map((m) => (
        <optgroup key={m.label} label={m.label}>
          {m.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
