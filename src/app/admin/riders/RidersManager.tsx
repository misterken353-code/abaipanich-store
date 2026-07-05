"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Rider {
  id: string;
  name: string;
  phone: string;
  lineUserId: string | null;
  isActive: boolean;
}

export default function RidersManager({ riders }: { riders: Rider[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lineUserId, setLineUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      <div className="rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">ชื่อ</th>
              <th className="px-4 py-2">เบอร์โทร</th>
              <th className="px-4 py-2">LINE</th>
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
                    onClick={() => toggleActive(r)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      r.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"
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
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
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
