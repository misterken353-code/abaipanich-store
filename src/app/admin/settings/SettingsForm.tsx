"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  initial: {
    lineChannelSecret: string;
    lineChannelAccessToken: string;
    lineShopUserId: string;
    promptPayId: string;
  };
}

export default function SettingsForm({ initial }: Props) {
  const router = useRouter();
  const [lineChannelSecret, setLineChannelSecret] = useState(initial.lineChannelSecret);
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState(initial.lineChannelAccessToken);
  const [lineShopUserId, setLineShopUserId] = useState(initial.lineShopUserId);
  const [promptPayId, setPromptPayId] = useState(initial.promptPayId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineChannelSecret: lineChannelSecret.trim() || null,
          lineChannelAccessToken: lineChannelAccessToken.trim() || null,
          lineShopUserId: lineShopUserId.trim() || null,
          promptPayId: promptPayId.trim() || null,
        }),
      });
      if (!res.ok) {
        setMessage("บันทึกไม่สำเร็จ");
        return;
      }
      setMessage("บันทึกเรียบร้อย");
      router.refresh();
    } catch {
      setMessage("เชื่อมต่อไม่ได้");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">LINE Channel Secret</label>
        <input
          value={lineChannelSecret}
          onChange={(e) => setLineChannelSecret(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder="จาก LINE Developers Console > Messaging API"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">LINE Channel Access Token</label>
        <input
          value={lineChannelAccessToken}
          onChange={(e) => setLineChannelAccessToken(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder="Long-lived token"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">LINE User ID ของร้าน (รับแจ้งเตือน)</label>
        <input
          value={lineShopUserId}
          onChange={(e) => setLineShopUserId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder="เช่น Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
        />
        <p className="mt-1 text-xs text-gray-400">
          ดูวิธีหา User ID ได้จากตาราง &quot;ข้อความล่าสุด&quot; ด้านล่าง — ทักบอทของคุณ 1 ข้อความแล้วรีเฟรชหน้านี้
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">PromptPay ID</label>
        <input
          value={promptPayId}
          onChange={(e) => setPromptPayId(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500"
          placeholder="เบอร์โทร/เลขบัตรประชาชนที่ผูก PromptPay"
        />
      </div>

      {message && <p className="text-sm text-gray-600">{message}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {saving ? "กำลังบันทึก..." : "บันทึก"}
      </button>
    </form>
  );
}
