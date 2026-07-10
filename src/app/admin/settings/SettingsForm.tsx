"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Values {
  lineChannelSecret: string;
  lineChannelAccessToken: string;
  lineShopUserId: string;
  lineOaUrl: string;
  promptPayId: string;
  facebookPageId: string;
  facebookPageAccessToken: string;
  storeLat: number | null;
  storeLng: number | null;
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
  const [lineOaUrl, setLineOaUrl] = useState(initial.lineOaUrl);
  const [promptPayId, setPromptPayId] = useState(initial.promptPayId);
  const [facebookPageId, setFacebookPageId] = useState(initial.facebookPageId);
  const [facebookPageAccessToken, setFacebookPageAccessToken] = useState(initial.facebookPageAccessToken);
  const [storeLat, setStoreLat] = useState(initial.storeLat);
  const [storeLng, setStoreLng] = useState(initial.storeLng);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  function startEditing() {
    setMessage(null);
    setEditing(true);
  }

  function cancelEditing() {
    setLineChannelSecret(savedValues.lineChannelSecret);
    setLineChannelAccessToken(savedValues.lineChannelAccessToken);
    setLineShopUserId(savedValues.lineShopUserId);
    setLineOaUrl(savedValues.lineOaUrl);
    setPromptPayId(savedValues.promptPayId);
    setFacebookPageId(savedValues.facebookPageId);
    setFacebookPageAccessToken(savedValues.facebookPageAccessToken);
    setStoreLat(savedValues.storeLat);
    setStoreLng(savedValues.storeLng);
    setMessage(null);
    setEditing(false);
  }

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("อุปกรณ์นี้ไม่รองรับการแชร์โลเคชั่น");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStoreLat(pos.coords.latitude);
        setStoreLng(pos.coords.longitude);
        setLocating(false);
      },
      () => {
        setMessage("ดึงตำแหน่งไม่สำเร็จ กรุณาอนุญาตการเข้าถึงตำแหน่ง");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
        lineOaUrl: lineOaUrl.trim(),
        promptPayId: promptPayId.trim(),
        facebookPageId: facebookPageId.trim(),
        facebookPageAccessToken: facebookPageAccessToken.trim(),
        storeLat,
        storeLng,
      };
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lineChannelSecret: next.lineChannelSecret || null,
          lineChannelAccessToken: next.lineChannelAccessToken || null,
          lineShopUserId: next.lineShopUserId || null,
          lineOaUrl: next.lineOaUrl || null,
          promptPayId: next.promptPayId || null,
          facebookPageId: next.facebookPageId || null,
          facebookPageAccessToken: next.facebookPageAccessToken || null,
          storeLat: next.storeLat,
          storeLng: next.storeLng,
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
        <label className="mb-1 block text-sm font-semibold text-gray-700">ลิงก์เพิ่มเพื่อน LINE OA</label>
        <input
          value={lineOaUrl}
          onChange={(e) => setLineOaUrl(e.target.value)}
          disabled={!editing}
          className={fieldClass}
          placeholder="เช่น https://lin.ee/xxxxxxx"
        />
        <p className="mt-1 text-xs text-gray-400">
          ดูได้จาก LINE Official Account Manager &gt; เพิ่มเพื่อน &gt; คัดลอก URL — ใช้เป็นปุ่ม
          &quot;เพิ่มเพื่อน&quot; ในหน้าสมัครม้าเร็ว (/apply-rider) หลังผู้สมัครส่งใบสมัครสำเร็จ
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
        <p className="mt-1 text-xs text-gray-400">
          ใช้เปิดหน้าเพจให้ตอนกด &quot;เตรียมโพสต์ Facebook&quot; ในหน้าแก้ไขเพจขาย (คัดลอกข้อความให้อัตโนมัติ กดโพสต์เอง)
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">
          Facebook Page Access Token <span className="font-normal text-gray-400">(ไม่จำเป็นแล้ว)</span>
        </label>
        <input
          value={facebookPageAccessToken}
          onChange={(e) => setFacebookPageAccessToken(e.target.value)}
          disabled={!editing}
          className={fieldClass}
          placeholder="Long-lived Page Access Token จาก Graph API Explorer"
        />
        <p className="mt-1 text-xs text-gray-400">
          เดิมใช้โพสต์อัตโนมัติผ่าน API แต่ Meta กำหนดให้ต้องผ่าน Business Verification ยุ่งยากเกินไป
          ตอนนี้เปลี่ยนไปใช้วิธีคัดลอกข้อความ+เปิดหน้าเพจแทน (ดูช่อง Page ID ด้านบน) ไม่ต้องกรอกช่องนี้ก็ได้
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">พิกัดร้าน (สำหรับคำนวณค่าส่ง)</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            step="any"
            value={storeLat ?? ""}
            onChange={(e) => setStoreLat(e.target.value === "" ? null : Number(e.target.value))}
            disabled={!editing}
            className={fieldClass}
            placeholder="ละติจูด (lat)"
          />
          <input
            type="number"
            step="any"
            value={storeLng ?? ""}
            onChange={(e) => setStoreLng(e.target.value === "" ? null : Number(e.target.value))}
            disabled={!editing}
            className={fieldClass}
            placeholder="ลองจิจูด (lng)"
          />
        </div>
        {editing && (
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {locating ? "กำลังดึงตำแหน่ง..." : "📍 ใช้ตำแหน่งปัจจุบัน"}
          </button>
        )}
        <p className="mt-1 text-xs text-gray-400">
          ใช้คำนวณค่าส่งม้าเร็วตามระยะทางจริง — กดปุ่มนี้ตอนอยู่ที่ร้าน หรือใส่พิกัดจาก Google Maps เอง
          ถ้ายังไม่ตั้งค่านี้ ระบบจะแสดงแค่สูตรคำนวณเป็นข้อความเหมือนเดิม
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
