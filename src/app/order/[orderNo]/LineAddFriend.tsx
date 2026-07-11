"use client";

import { useEffect, useState } from "react";

// การ์ด "เพิ่มเพื่อน LINE OA" แบบกดปุ่มเดียว — โชว์ที่หน้าสั่งซื้อสำเร็จ
// บนมือถือจะเด้งเปิดแอป LINE ไปหน้าเพิ่มเพื่อนให้อัตโนมัติ 1 ครั้ง (ลูกค้าแค่กดยืนยันเพิ่มเพื่อน)
// บนคอมพิวเตอร์จะโชว์ QR ให้สแกน — ทั้งสองทางเหลือแค่ "กดปุ่มเดียว" ตามที่ต้องการ
export default function LineAddFriend({
  addUrl,
  qrDataUrl,
  storageKey,
}: {
  addUrl: string;
  qrDataUrl: string | null;
  storageKey: string;
}) {
  const [opened, setOpened] = useState(false);

  useEffect(() => {
    // เด้งเปิด LINE อัตโนมัติเฉพาะบนมือถือ และเฉพาะครั้งแรกของออเดอร์นี้ (กันเด้งซ้ำตอนรีเฟรช)
    const key = `line-added:${storageKey}`;
    const isMobile =
      typeof window !== "undefined" &&
      window.matchMedia?.("(pointer: coarse)").matches === true;
    if (!isMobile) return;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const t = setTimeout(() => {
      setOpened(true);
      window.location.href = addUrl;
    }, 1400);
    return () => clearTimeout(t);
  }, [addUrl, storageKey]);

  return (
    <div className="rounded-2xl border-2 border-green-500 bg-green-50 p-5 text-center">
      <div className="mb-1 text-3xl">💬</div>
      <p className="text-lg font-extrabold text-green-800">เพิ่มเพื่อน LINE ร้านสบายพาณิชย์</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-green-700">
        เพิ่มเพื่อนเพื่อ <b>ส่งสลิป</b> · <b>ติดตามสถานะออเดอร์</b> · <b>สอบถามสินค้า</b> ได้ทันที
        {opened && <span className="mt-1 block text-xs text-green-600">กำลังเปิดแอป LINE ให้คุณ…</span>}
      </p>

      <a
        href={addUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-[#06C755] px-8 py-3 font-bold text-white shadow-md transition-transform hover:scale-105"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 5.64 2 10.12c0 4.02 3.55 7.39 8.35 8.03.33.07.77.22.88.5.1.26.07.66.03.92l-.14.85c-.04.26-.2 1.02.9.56 1.1-.46 5.93-3.49 8.09-5.98C21.4 13.36 22 11.82 22 10.12 22 5.64 17.52 2 12 2Z" />
        </svg>
        เพิ่มเพื่อน LINE
      </a>

      {qrDataUrl && (
        <div className="mt-4">
          <p className="text-xs text-green-700">หรือสแกน QR นี้ด้วยแอป LINE</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="เพิ่มเพื่อน LINE QR" className="mx-auto mt-2 h-40 w-40 rounded-xl bg-white p-2" />
        </div>
      )}
    </div>
  );
}
