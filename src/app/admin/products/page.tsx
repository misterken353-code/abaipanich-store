import { prisma } from "@/lib/prisma";
import SyncButton from "./SyncButton";

export default async function AdminProductsPage() {
  const products = await prisma.syncedProduct.findMany({
    orderBy: { code: "asc" },
    take: 200,
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">สินค้า (sync จาก GearGao-SaaS)</h1>
        <SyncButton />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">รูป</th>
              <th className="px-4 py-2">รหัส</th>
              <th className="px-4 py-2">ชื่อสินค้า</th>
              <th className="px-4 py-2">ราคา</th>
              <th className="px-4 py-2">คงเหลือ</th>
              <th className="px-4 py-2">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  {p.image1Url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image1Url} alt={p.name} className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-gray-100" />
                  )}
                </td>
                <td className="px-4 py-2">{p.code}</td>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">{Number(p.salePrice).toLocaleString("th-TH")}</td>
                <td className="px-4 py-2">{p.availableQty}</td>
                <td className="px-4 py-2">
                  {p.isPreOrder ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      สั่งจอง
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      พร้อมส่ง
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  ยังไม่มีสินค้า — กด &quot;Sync สต็อก/รูปตอนนี้&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
