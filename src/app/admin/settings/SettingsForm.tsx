"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Values {
  lineChannelSecret: string;
  lineChannelAccessToken: string;
  lineShopUserId: string;
  promptPayId: string;
  facebookPageId: string;
  facebookPageAccessToken: string;
}

interface Props {
  initial: Values;
}

const FIELD_CLASS =
  "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors";

export default function SettingsForm({ initial }: Props) {
  const router = useRouter();
  const [savedValues, setSavedValues] = useState<Values>(initial);
  const [lineChannelSecret, setLineChannelSecret] = useState(initial.lineChannelSecret);
  const [lineChannelAccessToken, setLineChannelAccessToken] = useState(initial.lineChannelAccessToken);
  const [lineShopUserId, setLineShopUserId] = useState(initial.lineShopUserId);
  const [promptPayId, setPromptPayId] = useState(initial.promptPayId);
  const [facebookPageId, setFacebookPageId] = useState(initial.facebookPageId);
  const [facebookPageAccessToken, setFacebookPageAccessToken] = useState(initial.facebookPageAccessToken);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function startEditing() {
    setMessage(null);
    setEditing(true);
  }

  function cancelEditing() {
    setLineChannelSecret(savedValues.lineChannelSecret);
    setLineChannelAccessToken(savedValues.lineChannelAccessToken);
    setLineShopUserId(savedValues.lineShopUserId);
    setPromptPayId(savedValues.promptPayId);
    setFacebookPageId(savedValues.facebookPageId);
    setFacebookPageAccessToken(savedValues.facebookPageAccessToken);
    setMessage(null);
    setEditing(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const next = {
        lineChannelSecret: lineChannelSecret.trim(),
        lineChannelAccessToken: lineChannelAccessToken.trim(),
        lineShopUserId: lineShopUserId.trim(),
        promptPayId: promptPayId.trim(),
        facebookPageId: facebookPageId.trim(),
        facebookPageAccessToken: facebookPageAccessToken.trim(),
      };
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineChannelSecret: next.lineChannelSecret || null,
          lineChannelAccessToken: next.lineChannelAccessToken || null,
          lineShopUserId: next.lineShopUserId || null,
          promptPayId: next.promptPayId || null,
          facebookPageId: next.facebookPageId || null,
          facebookPageAccessToken: next.facebookPageAccessToken || null,
        }),
      });
      if (!res.ok) {
        setMessage("บันทึกไม่สำเร็จ");
        return;
      }
      setSavedValues(next);
      setEditing(false);
      setMessage("บันทึกเรียบร้อย");
      router.refresh();
    } catch {
      setMessage("เชื่อมต่อไม่ได้");
    } finally {
      setSaving(false);
    }
  }

  const fieldClass = `${FIELD_CLASS} ${
    editing
      ? "border-gray-300 bg-white focus:border-green-500"
      : "border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
  }`;

  return (
    <form onSubmit={handleSave} className="max-w-xl space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">LINE Channel Secret</label>
        <input
          value={lineChannelSecret}
          onChange={(e) => setLineChannelSecret(e.target.value)}
          disabled={!editing}
          className={fieldClass}
          placeholder="จาก LINE Developers Console > Messaging API"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">LINE Channel Access Token</label>
        <input
          value={lineChannelAccessToken}
          onChange={(e) => setLineChannelAccessToken(e.target.value)}
          disabled={!editing}
          className={fieldClass}
          placeholder="Long-lived token"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">LINE User ID ของร้าน (รับแจ้งเตือน)</label>
        <input
          value={lineShopUserId}
          onChange={(e) => setLineShopUserId(e.target.value)}
          disabled={!editing}
          className={fieldClass}
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
          disabled={!editing}
          className={fieldClass}
          placeholder="เบอร์โทร/เลขบัตรประชาชนที่ผูก PromptPay"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Facebook Page ID</label>
        <input
          value={facebookPageId}
          onChange={(e) => setFacebookPageId(e.target.value)}
          disabled={!editing}
          className={fieldClass}
          placeholder="ดูได้จากหน้า “เกี่ยวกับ” ของเพจ Facebook"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Facebook Page Access Token</label>
        <input
          value={facebookPageAccessToken}
          onChange={(e) => setFacebookPageAccessToken(e.target.value)}
          disabled={!editing}
          className={fieldClass}
          placeholder="Long-lived Page Access Token จาก Graph API Explorer"
        />
        <p className="mt-1 text-xs text-gray-400">
          ใช้สำหรับปุ่ม &quot;โพสต์ไปยัง Facebook&quot; ในหน้าแก้ไขเพจขาย
        </p>
      </div>

      {message && <p className="text-sm text-gray-600">{message}</p>}

      {editing ? (
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
          <button
            type="button"
            onClick={cancelEditing}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            ยกเลิก
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className="rounded-lg bg-green-600 px-5 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          แก้ไขข้อมูล
        </button>
      )}
    </form>
  );
}
