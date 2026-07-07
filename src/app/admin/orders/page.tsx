import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STATUS_STYLE: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-700",
  PAID: "bg-emerald-100 text-emerald-700",
  SHIPPED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-200 text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "รอชำระเงิน",
  PAID: "ชำระเงินแล้ว",
  SHIPPED: "จัดส่งแล้ว",
  CANCELLED: "ยกเลิก",
};

const SHIPPING_LABEL: Record<string, string> = {
  PICKUP: "รับเองหน้าร้าน",
  MOTORCYCLE: "ม้าเร็ว",
  FREIGHT: "ขนส่ง",
};

const PAYMENT_LABEL: Record<string, string> = {
  COD: "จ่ายปลายทาง",
  TRANSFER: "โอนเงิน",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim();

  const orders = await prisma.order.findMany({
    where: query
      ? {
          OR: [
            { orderNo: { contains: query, mode: "insensitive" } },
            { customer: { name: { contains: query, mode: "insensitive" } } },
            { customer: { phone: { contains: query, mode: "insensitive" } } },
          ],
        }
      : undefined,
    include: { customer: true, items: true, rider: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">ออเดอร์ลูกค้า</h1>

      <form className="mb-4 flex gap-2" action="/admin/orders" method="get">
        <input
          type="text"
          name="q"
          defaultValue={query ?? ""}
          placeholder="ค้นหาเลขที่ออเดอร์ (เช่น SP202607050004) ชื่อ หรือเบอร์โทรลูกค้า"
          className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400"
        />
        <button
          type="submit"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          ค้นหา
        </button>
        {query && (
          <a
            href="/admin/orders"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            ล้างการค้นหา
          </a>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">เลขที่ออเดอร์</th>
              <th className="px-4 py-2">รับแล้ว</th>
              <th className="px-4 py-2">ลูกค้า</th>
              <th className="px-4 py-2">รายการ</th>
              <th className="px-4 py-2">จัดส่ง</th>
              <th className="px-4 py-2">คนขับ</th>
              <th className="px-4 py-2">ชำระเงิน</th>
              <th className="px-4 py-2">ยอดรวม</th>
              <th className="px-4 py-2">สถานะ</th>
              <th className="px-4 py-2">วันที่</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-green-700 hover:underline">
                    {o.orderNo}
                  </Link>
                  {o.hasPreOrder && (
                    <span
                      className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-amber-600 bg-amber-50"
                      title={o.stockArrivedAt ? `สินค้าถึงร้านแล้ว ${o.stockArrivedAt.toLocaleString("th-TH")}` : "รอสินค้า Pre-order เข้าร้าน"}
                    >
                      {o.stockArrivedAt ? "✓ ของถึงแล้ว" : "🕐 รอของ"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {o.acknowledgedAt ? (
                    <span className="text-emerald-600 font-bold" title={o.acknowledgedAt.toLocaleString("th-TH")}>
                      ✓
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {o.customer.name}
                  <div className="text-xs text-gray-400">{o.customer.phone}</div>
                </td>
                <td className="px-4 py-2 text-gray-500">{o.items.length} รายการ</td>
                <td className="px-4 py-2 text-gray-500">{SHIPPING_LABEL[o.shippingMethod] ?? o.shippingMethod}</td>
                <td className="px-4 py-2 text-gray-500">{o.rider ? o.rider.name : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2 text-gray-500">{PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}</td>
                <td className="px-4 py-2 font-semibold">
                  {Number(o.totalAmount).toLocaleString("th-TH")}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[o.status]}`}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-400">
                  {o.createdAt.toLocaleString("th-TH")}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  {query ? `ไม่พบออเดอร์ที่ตรงกับ "${query}"` : "ยังไม่มีออเดอร์"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
