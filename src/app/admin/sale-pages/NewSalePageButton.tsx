"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewSalePageButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sale-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "เพจใหม่" }),
      });
      const data = await res.json();
      if (res.ok && data.salePage?.id) {
        router.push(`/admin/sale-pages/${data.salePage.id}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleCreate}
      disabled={loading}
      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
    >
      {loading ? "กำลังสร้าง..." : "+ สร้างเพจใหม่"}
    </button>
  );
}
