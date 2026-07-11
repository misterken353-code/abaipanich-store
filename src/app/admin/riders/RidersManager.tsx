"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Rider {
  id: string;
  name: string;
  phone: string;
  lineUserId: string | null;
  isActive: boolean;
  accessToken: string;
  commissionPerDelivery: number;
  avgRating: number | null;
  ratedCount: number;
  unsettledCommission: number;
  unsettledCod: number;
}

export default function RidersManager({ riders }: { riders: Rider[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lineUserId, setLineUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [commissionDrafts, setCommissionDrafts] = useState<Record<string, string>>({});
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settlingCodId, setSettlingCodId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setError("กรุณากรอกชื่อและเบอร์โทรศัพท์");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/riders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), lineUserId: lineUserId.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "เพิ่มคนขับไม่สำเร็จ");
        return;
      }
      setName("");
      setPhone("");
      setLineUserId("");
      router.refresh();
    } catch {
      setError("เชื่อมต่อไม่ได้");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(rider: Rider) {
    await fetch(`/api/admin/riders/${rider.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !rider.isActive }),
    });
    router.refresh();
  }

  async function removeRider(rider: Rider) {
    if (!confirm(`ลบคนขับ "${rider.name}" ออกจากทำเนียบ?`)) return;
    await fetch(`/api/admin/riders/${rider.id}`, { method: "DELETE" });
    router.refresh();
  }

  function copyLink(rider: Rider) {
    const url = `${window.location.origin}/rider/${rider.accessToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(rider.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  async function saveCommission(rider: Rider) {
    const draft = commissionDrafts[rider.id];
    if (draft === undefined) return;
    const value = Number(draft);
    if (Number.isNaN(value) || value < 0) return;
    await fetch(`/api/admin/riders/${rider.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commissionPerDelivery: value }),
    });
    setCommissionDrafts((prev) => {
      const next = { ...prev };
      delete next[rider.id];
      return next;
    });
    router.refresh();
  }

  async function settleCommission(rider: Rider) {
    if (!confirm(`ยืนยันว่าจ่ายค่าคอมมิชชั่นค้างจ่าย ฿${rider.unsettledCommission.toLocaleString("th-TH")} ให้ "${rider.name}" แล้ว?`))
      return;
    setSettlingId(rider.id);
    try {
      await fetch(`/api/admin/riders/${rider.id}/settle-commission`, { method: "POST" });
      router.refresh();
    } finally {
      setSettlingId(null);
    }
  }

  async function settleCod(rider: Rider) {
    if (!confirm(`ยืนยันว่า "${rider.name}" นำเงินสด (COD) ฿${rider.unsettledCod.toLocaleString("th-TH")} มาคืนร้านแล้ว?`))
      return;
    setSettlingCodId(rider.id);
    try {
      await fetch(`/api/admin/riders/${rider.id}/settle-cod`, { method: "POST" });
      router.refresh();
    } finally {
      setSettlingCodId(null);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="max-w-xl space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="font-semibold text-gray-700">เพิ่มคนขับใหม่</h2>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">ชื่อคนขับ</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
            placeholder="เช่น พี่แดง"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">เบอร์โทรศัพท์</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
            placeholder="08x-xxx-xxxx"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">LINE User ID (ถ้ามี)</label>
          <input
            value={lineUserId}
            onChange={(e) => setLineUserId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
            placeholder="เช่น Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
          <p className="mt-1 text-xs text-gray-400">
            ให้คนขับทักบอทของร้าน 1 ข้อความ แล้วดู User ID ได้จากตาราง &quot;ข้อความล่าสุด&quot; ด้านล่าง — ถ้าไม่ใส่
            จะมอบหมายงานได้ปกติ แค่ไม่ส่ง LINE แจ้งอัตโนมัติ
          </p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "กำลังเพิ่ม..." : "เพิ่มคนขับ"}
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">ชื่อ</th>
              <th className="px-4 py-2">เบอร์โทร</th>
              <th className="px-4 py-2">LINE</th>
              <th className="px-4 py-2">ลิงก์รับงาน</th>
              <th className="px-4 py-2">คะแนน</th>
              <th className="px-4 py-2">ค่าคอมฯ/งาน</th>
              <th className="px-4 py-2">ค้างจ่าย</th>
              <th className="px-4 py-2">เงินสดค้างนำส่ง</th>
              <th className="px-4 py-2">สถานะ</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {riders.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium">{r.name}</td>
                <td className="px-4 py-2 text-gray-500">{r.phone}</td>
                <td className="px-4 py-2 text-gray-500">
                  {r.lineUserId ? "✓ ผูกแล้ว" : <span className="text-gray-300">ยังไม่ผูก</span>}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => copyLink(r)}
                    className="text-xs font-semibold text-green-700 hover:underline"
                  >
                    {copiedId === r.id ? "คัดลอกแล้ว ✓" : "คัดลอกลิงก์"}
                  </button>
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {r.avgRating != null ? `⭐ ${r.avgRating.toFixed(1)} (${r.ratedCount})` : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={commissionDrafts[r.id] ?? r.commissionPerDelivery}
                      onChange={(e) => setCommissionDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-xs outline-none focus:border-green-500"
                    />
                    {commissionDrafts[r.id] !== undefined && (
                      <button
                        onClick={() => saveCommission(r)}
                        className="text-xs font-semibold text-green-700 hover:underline"
                      >
                        บันทึก
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className={r.unsettledCommission > 0 ? "font-semibold text-amber-600" : "text-gray-400"}>
                      ฿{r.unsettledCommission.toLocaleString("th-TH")}
                    </span>
                    {r.unsettledCommission > 0 && (
                      <button
                        onClick={() => settleCommission(r)}
                        disabled={settlingId === r.id}
                        className="text-xs font-semibold text-green-700 hover:underline disabled:opacity-50"
                      >
                        {settlingId === r.id ? "กำลังบันทึก..." : "จ่ายแล้ว"}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <span className={r.unsettledCod > 0 ? "font-semibold text-amber-600" : "text-gray-400"}>
                      ฿{r.unsettledCod.toLocaleString("th-TH")}
                    </span>
                    {r.unsettledCod > 0 && (
                      <button
                        onClick={() => settleCod(r)}
                        disabled={settlingCodId === r.id}
                        className="text-xs font-semibold text-green-700 hover:underline disabled:opacity-50"
                      >
                        {settlingCodId === r.id ? "กำลังบันทึก..." : "นำส่งเงินแล้ว"}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleActive(r)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      r.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {r.isActive ? "ใช้งานอยู่" : "ปิดใช้งาน"}
                  </button>
                </td>
                <td className="px-4 py-2 text-right">
                  <button onClick={() => removeRider(r)} className="text-xs text-red-500 hover:underline">
                    ลบ
                  </button>
                </td>
              </tr>
            ))}
            {riders.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  ยังไม่มีคนขับในระบบ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
