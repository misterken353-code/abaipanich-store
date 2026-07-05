import { prisma } from "@/lib/prisma";
import RidersManager from "./RidersManager";

export default async function AdminRidersPage() {
  const [riders, recentMessages] = await Promise.all([
    prisma.rider.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.lineMessageLog.findMany({
      where: { direction: "IN" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">คนขับ (ม้าเร็ว)</h1>

      <RidersManager riders={riders} />

      <div className="mt-6 max-w-xl rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-gray-700">ข้อความล่าสุดที่มีคนทักบอท LINE</h2>
        <p className="mb-3 text-xs text-gray-400">
          ให้คนขับทักบอทของร้าน 1 ข้อความ แล้ว User ID จะปรากฏด้านล่างนี้ — คัดลอกไปใส่ตอนเพิ่มคนขับด้านบน
        </p>
        <div className="divide-y text-sm">
          {recentMessages.map((m) => (
            <div key={m.id} className="py-2">
              <p className="font-mono text-xs text-gray-500">{m.lineUserId}</p>
              <p className="text-gray-800">{m.message}</p>
              <p className="text-xs text-gray-400">{m.createdAt.toLocaleString("th-TH")}</p>
            </div>
          ))}
          {recentMessages.length === 0 && (
            <p className="py-6 text-center text-gray-400">ยังไม่มีข้อความเข้ามา</p>
          )}
        </div>
      </div>
    </div>
  );
}
