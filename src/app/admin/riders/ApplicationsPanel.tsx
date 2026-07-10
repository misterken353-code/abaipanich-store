"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ImageLightbox from "@/components/ImageLightbox";

export interface RiderApplicationView {
  id: string;
  name: string;
  phone: string;
  idCardImage: string;
  note: string | null;
  createdAt: string;
}

export default function ApplicationsPanel({ applications }: { applications: RiderApplicationView[] }) {
  const router = useRouter();
  const [viewingImage, setViewingImage] = useState<RiderApplicationView | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  async function review(app: RiderApplicationView, action: "approve" | "reject") {
    const confirmText =
      action === "approve"
        ? `อนุมัติ "${app.name}" เป็นคนขับ? ระบบจะสร้างคนขับให้อัตโนมัติ แล้วค่อยคัดลอกลิงก์รับงานส่งให้ทาง LINE`
        : `ปฏิเสธใบสมัครของ "${app.name}"?`;
    if (!confirm(confirmText)) return;
    setWorkingId(app.id);
    try {
      const res = await fetch(`/api/admin/rider-applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "ดำเนินการไม่สำเร็จ");
      }
      router.refresh();
    } finally {
      setWorkingId(null);
    }
  }

  async function remove(app: RiderApplicationView) {
    if (!confirm(`ลบใบสมัครของ "${app.name}"? รูปบัตรประชาชนจะถูกลบออกจากระบบ`)) return;
    setWorkingId(app.id);
    try {
      await fetch(`/api/admin/rider-applications/${app.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setWorkingId(null);
    }
  }

  if (applications.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <h2 className="font-semibold text-amber-800">
        ผู้สมัครม้าเร็วรอตรวจสอบ ({applications.length})
      </h2>
      <p className="mb-3 mt-1 text-xs text-amber-700">
        ตรวจรูปบัตรประชาชนก่อนอนุมัติ — อนุมัติแล้วระบบสร้างคนขับให้อัตโนมัติ
        จากนั้นกด &quot;คัดลอกลิงก์&quot; ในตารางคนขับด้านล่างส่งให้ทาง LINE
      </p>
      <div className="space-y-3">
        {applications.map((app) => (
          <div
            key={app.id}
            className="flex flex-wrap items-center gap-4 rounded-lg border border-amber-200 bg-white p-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={app.idCardImage}
              alt={`บัตรประชาชนของ ${app.name}`}
              onClick={() => setViewingImage(app)}
              className="h-16 w-24 cursor-zoom-in rounded border border-gray-200 object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-800">{app.name}</p>
              <p className="text-sm text-gray-500">{app.phone}</p>
              {app.note && <p className="text-xs text-gray-400">หมายเหตุ: {app.note}</p>}
              <p className="text-xs text-gray-400">
                สมัครเมื่อ {new Date(app.createdAt).toLocaleString("th-TH")}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => review(app, "approve")}
                disabled={workingId === app.id}
                className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                อนุมัติเป็นคนขับ
              </button>
              <button
                onClick={() => review(app, "reject")}
                disabled={workingId === app.id}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                ปฏิเสธ
              </button>
              <button
                onClick={() => remove(app)}
                disabled={workingId === app.id}
                className="text-xs text-red-500 hover:underline disabled:opacity-50"
              >
                ลบ
              </button>
            </div>
          </div>
        ))}
      </div>
      {viewingImage && (
        <ImageLightbox
          src={viewingImage.idCardImage}
          alt={`บัตรประชาชนของ ${viewingImage.name}`}
          onClose={() => setViewingImage(null)}
        />
      )}
    </div>
  );
}
