"use client";

// ปุ่มพิมพ์ใบส่งของ — เรียก window.print() แล้ว CSS @media print จะโชว์เฉพาะ #print-receipt
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-full bg-gray-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-900"
    >
      🖨️ พิมพ์ใบส่งของ
    </button>
  );
}
