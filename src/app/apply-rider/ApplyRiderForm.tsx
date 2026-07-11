"use client";

import { useState } from "react";
import { namesMatch } from "@/lib/nameMatch";

const BANKS = [
  "กสิกรไทย", "ไทยพาณิชย์", "กรุงไทย", "กรุงเทพ", "กรุงศรีอยุธยา",
  "ทหารไทยธนชาต", "ออมสิน", "ธ.ก.ส.", "ซีไอเอ็มบี ไทย", "ยูโอบี", "อื่น ๆ",
];

const FIELD_CLASS =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-500";

// บีบอัดรูปบัตรประชาชนฝั่ง client — ย่อให้กว้าง/สูงไม่เกิน 1280px แล้วแปลงเป็น JPEG
// เพื่อให้ base64 เล็กพอเก็บใน DB ได้ (ยังไม่มี Blob storage)
async function compressImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("decode failed"));
    el.src = dataUrl;
  });

  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export default function ApplyRiderForm({ lineOaUrl }: { lineOaUrl: string | null }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [note, setNote] = useState("");
  const [idCardImage, setIdCardImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setProcessing(true);
    try {
      const compressed = await compressImage(file);
      setIdCardImage(compressed);
    } catch {
      setError("อ่านไฟล์รูปไม่สำเร็จ กรุณาลองรูปอื่น");
    } finally {
      setProcessing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setError("กรุณากรอกชื่อและเบอร์โทรศัพท์");
      return;
    }
    if (!idCardImage) {
      setError("กรุณาแนบรูปบัตรประชาชน");
      return;
    }
    if (!bankName || !bankAccountNumber.trim() || !bankAccountName.trim()) {
      setError("กรุณากรอกข้อมูลบัญชีธนาคารให้ครบ (สำหรับโอนค่าวิ่งงาน)");
      return;
    }
    if (!namesMatch(name, bankAccountName)) {
      setError("ชื่อบัญชีธนาคารต้องตรงกับชื่อผู้สมัคร (ต้องเป็นบัญชีของคุณเองเท่านั้น)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/rider-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          idCardImage,
          bankName,
          bankAccountNumber: bankAccountNumber.trim(),
          bankAccountName: bankAccountName.trim(),
          note: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "ส่งใบสมัครไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-6 text-center">
        <p className="text-3xl">✅</p>
        <h2 className="mt-2 text-lg font-semibold text-green-800">ส่งใบสมัครเรียบร้อยแล้ว</h2>
        <p className="mt-2 text-sm text-gray-600">
          ขั้นตอนต่อไป: <strong>เพิ่มเพื่อน LINE ของร้าน</strong> แล้วทักแจ้งชื่อ-เบอร์โทรที่สมัครไว้
          ทางร้านจะตรวจสอบและคุยรายละเอียดงานกับคุณทาง LINE
        </p>
        {lineOaUrl ? (
          <a
            href={lineOaUrl}
            className="mt-4 inline-block rounded-lg bg-[#06C755] px-6 py-3 text-sm font-semibold text-white hover:opacity-90"
          >
            ➕ เพิ่มเพื่อน LINE ร้านสบายพาณิชย์
          </a>
        ) : (
          <p className="mt-4 text-sm text-gray-500">
            ค้นหา LINE Official Account &quot;สบายพาณิชย์&quot; แล้วกดเพิ่มเพื่อนได้เลย
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-5">
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">ชื่อ-นามสกุล</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={FIELD_CLASS}
          placeholder="เช่น สมชาย ใจดี"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">เบอร์โทรศัพท์</label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          type="tel"
          inputMode="tel"
          className={FIELD_CLASS}
          placeholder="08x-xxx-xxxx"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">รูปบัตรประชาชน</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-green-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-green-700"
        />
        <p className="mt-1 text-xs text-gray-400">
          ถ่ายรูปบัตรประชาชนให้เห็นชื่อ-เลขบัตรชัดเจน ใช้ยืนยันตัวตนเท่านั้น
        </p>
        {processing && <p className="mt-2 text-xs text-gray-500">กำลังเตรียมรูป...</p>}
        {idCardImage && !processing && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={idCardImage}
            alt="รูปบัตรประชาชนที่แนบ"
            className="mt-2 max-h-48 rounded-lg border border-gray-200 object-contain"
          />
        )}
      </div>
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-sm font-semibold text-gray-700">บัญชีธนาคารสำหรับรับค่าวิ่งงาน</p>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">ธนาคาร</label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className={FIELD_CLASS}
            >
              <option value="">เลือกธนาคาร</option>
              {BANKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">เลขบัญชี</label>
            <input
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              inputMode="numeric"
              className={FIELD_CLASS}
              placeholder="เลขที่บัญชีธนาคาร"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">ชื่อบัญชี</label>
            <input
              value={bankAccountName}
              onChange={(e) => setBankAccountName(e.target.value)}
              className={FIELD_CLASS}
              placeholder="ต้องตรงกับชื่อ-นามสกุลด้านบน"
            />
            {bankAccountName.trim() && (
              <p className={`mt-1 text-xs ${namesMatch(name, bankAccountName) ? "text-green-600" : "text-red-600"}`}>
                {namesMatch(name, bankAccountName)
                  ? "✓ ชื่อบัญชีตรงกับชื่อผู้สมัคร"
                  : "⚠️ ชื่อบัญชีต้องตรงกับชื่อผู้สมัครด้านบน (ต้องเป็นบัญชีของคุณเอง)"}
              </p>
            )}
          </div>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">
          ข้อมูลเพิ่มเติม <span className="font-normal text-gray-400">(ไม่บังคับ)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className={FIELD_CLASS}
          placeholder="เช่น มีมอเตอร์ไซค์เอง วิ่งงานได้ช่วงเย็น"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting || processing}
        className="w-full rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
      >
        {submitting ? "กำลังส่งใบสมัคร..." : "ส่งใบสมัคร"}
      </button>
      <p className="text-center text-xs text-gray-400">
        ส่งใบสมัครแล้วอย่าลืมเพิ่มเพื่อน LINE ของร้านเพื่อคุยรายละเอียดงาน
      </p>
    </form>
  );
}
