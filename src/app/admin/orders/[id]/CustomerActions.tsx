"use client";

import { useState } from "react";

// แถวปุ่มติดต่อลูกค้า: โทร / คัดลอกเบอร์ / เปิดแชท LINE OA
export default function CustomerActions({
  phone,
  lineChatUrl,
  hasLineUser,
}: {
  phone: string;
  lineChatUrl: string;
  hasLineUser: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copyPhone() {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const btn =
    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors";

  return (
    <div className="flex flex-wrap gap-2">
      <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`} className={`${btn} bg-green-600 text-white hover:bg-green-700`}>
        📞 โทรหาลูกค้า
      </a>
      <button type="button" onClick={copyPhone} className={`${btn} border border-gray-300 text-gray-700 hover:bg-gray-50`}>
        {copied ? "✓ คัดลอกแล้ว" : "📋 คัดลอกเบอร์"}
      </button>
      <a
        href={lineChatUrl}
        target="_blank"
        rel="noreferrer"
        className={`${btn} bg-[#06C755] text-white hover:brightness-95`}
        title={hasLineUser ? "ลูกค้าคนนี้ทักผ่าน LINE OA แล้ว — เปิดกล่องแชทเพื่อตอบ" : "เปิดกล่องแชท LINE OA ของร้าน"}
      >
        💬 แชทลูกค้าใน LINE OA
      </a>
    </div>
  );
}
