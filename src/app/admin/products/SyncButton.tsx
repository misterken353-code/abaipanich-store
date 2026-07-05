"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSync() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "sync ไม่สำเร็จ");
      } else {
        setMessage(`sync แล้ว ${data.upserted}/${data.total} รายการ`);
        router.refresh();
      }
    } catch {
      setMessage("เชื่อมต่อไม่ได้");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={handleSync}
        disabled={loading}
        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? "กำลัง sync..." : "Sync สต็อก/รูปตอนนี้"}
      </button>
      {message && <span className="text-sm text-gray-600">{message}</span>}
    </div>
  );
}
