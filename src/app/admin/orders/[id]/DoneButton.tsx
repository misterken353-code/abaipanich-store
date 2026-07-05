"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DoneButton() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  function handleClick() {
    setSaving(true);
    router.push("/admin/orders");
  }

  return (
    <button
      onClick={handleClick}
      disabled={saving}
      className="w-full rounded-full bg-green-700 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-green-800 disabled:opacity-70"
    >
      {saving ? "กำลังบันทึก..." : "✓ บันทึกและไปดูออเดอร์ถัดไป"}
    </button>
  );
}
