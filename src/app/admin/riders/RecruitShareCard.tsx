"use client";

import { useState } from "react";

// การ์ดแชร์รับสมัครม้าเร็ว — คัดลอกลิงก์/ข้อความโพสต์สำเร็จรูป เอาไปโพสต์ Facebook/LINE ได้เลย
export default function RecruitShareCard({ appUrl }: { appUrl: string }) {
  // ใช้ค่าจาก env (production) ก่อน ถ้าไม่มี fallback เป็น origin ปัจจุบัน
  const base = appUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const applyUrl = `${base}/apply-rider`;

  const recruitMessage = `🏍️ รับสมัครม้าเร็ว (คนขับส่งของ) — ร้านสบายพาณิชย์

✅ รับงานผ่านมือถือ กดรับงานเองได้ ไม่ต้องลงเวลา
✅ มีค่ารอบต่อเที่ยว รับเงินไว
✅ สมัครง่าย แค่กรอกข้อมูล + แนบรูปบัตรประชาชน

👉 สมัครเลยที่ลิงก์นี้
${applyUrl}

สมัครแล้วเพิ่มเพื่อน LINE ของร้าน คุยรายละเอียดงานกันต่อได้เลย 😊`;

  const [copied, setCopied] = useState<"link" | "message" | null>(null);

  async function copy(text: string, which: "link" | "message") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // เผื่อ clipboard ใช้ไม่ได้ — เลือกข้อความในกล่องให้ผู้ใช้กด Ctrl+C เอง
      const box = document.getElementById("recruit-message-box") as HTMLTextAreaElement | null;
      if (box && which === "message") {
        box.focus();
        box.select();
      }
    }
  }

  return (
    <div className="rounded-xl border border-green-200 bg-green-50 p-5">
      <h2 className="font-semibold text-green-800">📣 แชร์รับสมัครม้าเร็ว</h2>
      <p className="mb-3 mt-1 text-xs text-green-700">
        คัดลอกลิงก์หรือข้อความด้านล่างไปโพสต์ Facebook / LINE / กลุ่มต่างๆ เพื่อรับสมัครคนขับ —
        ผู้สมัครกรอกข้อมูล + แนบรูปบัตรประชาชน แล้วมาคุยงานต่อทาง LINE OA
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <code className="rounded-lg border border-green-200 bg-white px-3 py-1.5 text-sm text-gray-700">
          {applyUrl}
        </code>
        <button
          onClick={() => copy(applyUrl, "link")}
          className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
        >
          {copied === "link" ? "คัดลอกลิงก์แล้ว ✓" : "คัดลอกลิงก์"}
        </button>
        <a
          href="/apply-rider"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-green-300 px-4 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-100"
        >
          เปิดหน้าสมัคร ↗
        </a>
      </div>

      <label className="mb-1 block text-xs font-semibold text-green-800">
        ข้อความโพสต์สำเร็จรูป (แก้ไขได้ก่อนคัดลอก)
      </label>
      <textarea
        id="recruit-message-box"
        defaultValue={recruitMessage}
        rows={9}
        className="w-full rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-500"
      />
      <button
        onClick={() => {
          const box = document.getElementById("recruit-message-box") as HTMLTextAreaElement | null;
          copy(box?.value ?? recruitMessage, "message");
        }}
        className="mt-2 rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
      >
        {copied === "message" ? "คัดลอกข้อความแล้ว ✓" : "คัดลอกข้อความไปโพสต์"}
      </button>
    </div>
  );
}
