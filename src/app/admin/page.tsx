import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const [productCount, lastSynced] = await Promise.all([
    prisma.syncedProduct.count(),
    prisma.syncedProduct.findFirst({ orderBy: { lastSyncedAt: "desc" }, select: { lastSyncedAt: true } }),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">ภาพรวม</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">สินค้าที่ sync แล้ว</p>
          <p className="text-2xl font-semibold">{productCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">sync ล่าสุด</p>
          <p className="text-lg font-medium">
            {lastSynced?.lastSyncedAt
              ? new Date(lastSynced.lastSyncedAt).toLocaleString("th-TH")
              : "ยังไม่เคย sync"}
          </p>
        </div>
      </div>
    </div>
  );
}
