import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewSalePageButton from "./NewSalePageButton";

export default async function AdminSalePagesPage() {
  const salePages = await prisma.salePage.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">เพจขาย</h1>
        <NewSalePageButton />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">ชื่อเพจ</th>
              <th className="px-4 py-2">slug</th>
              <th className="px-4 py-2">จำนวนสินค้า</th>
              <th className="px-4 py-2">สถานะ</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {salePages.map((sp) => (
              <tr key={sp.id} className="border-t border-gray-100">
                <td className="px-4 py-2">{sp.title}</td>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">/p/{sp.slug}</td>
                <td className="px-4 py-2">{sp._count.items}</td>
                <td className="px-4 py-2">
                  {sp.isActive ? (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      เผยแพร่
                    </span>
                  ) : (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      ร่าง
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    href={`/admin/sale-pages/${sp.id}`}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50"
                  >
                    แก้ไข
                  </Link>
                </td>
              </tr>
            ))}
            {salePages.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  ยังไม่มีเพจขาย — กด &quot;สร้างเพจใหม่&quot;
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
