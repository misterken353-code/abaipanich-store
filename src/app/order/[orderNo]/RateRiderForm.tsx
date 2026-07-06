"use client";

import { useState } from "react";

export default function RateRiderForm({ orderNo, riderName }: { orderNo: string; riderName: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (rating === 0) {
      setError("กรุณากดเลือกดาวก่อน");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderNo}/rate-rider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "ให้คะแนนไม่สำเร็จ");
        return;
      }
      setDone(true);
    } catch {
      setError("เชื่อมต่อไม่ได้");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
        <p className="text-emerald-700 font-bold">✓ ขอบคุณสำหรับคะแนน!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <p className="font-bold text-gray-700 mb-1">ให้คะแนนคนขับ ({riderName})</p>
      <p className="text-xs text-gray-400 mb-3">ช่วยให้ร้านพัฒนาบริการจัดส่งให้ดีขึ้น</p>
      <div className="flex justify-center gap-2 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(star)}
            className="text-3xl transition-transform hover:scale-110"
            aria-label={`${star} ดาว`}
          >
            {(hover || rating) >= star ? "⭐" : "☆"}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        placeholder="ความคิดเห็นเพิ่มเติม (ถ้ามี)"
      />
      {error && <p className="text-red-600 text-xs font-semibold mt-2">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-3 w-full bg-emerald-700 text-white font-bold py-2 rounded-full hover:bg-emerald-800 transition-colors disabled:opacity-50"
      >
        {submitting ? "กำลังส่ง..." : "ส่งคะแนน"}
      </button>
    </div>
  );
}
