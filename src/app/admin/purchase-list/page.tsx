import { prisma } from "@/lib/prisma";
import ConfirmArrivedButton from "./ConfirmArrivedButton";

export default async function PurchaseListPage() {
  const pendingItems = await prisma.orderItem.findMany({
    where: { isPreOrder: true, arrivedAt: null, order: { status: { not: "CANCELLED" } } },
    include: { order: { include: { customer: true } } },
    orderBy: { order: { createdAt: "asc" } },
  });

  const grouped = new Map<
    string,
    { productId: string; name: string; totalQty: number; orders: { orderNo: string; customerName: string; qty: number }[] }
  >();
  for (const item of pendingItems) {
    const g = grouped.get(item.productId) ?? {
      productId: item.productId,
      name: item.nameSnapshot,
      totalQty: 0,
      orders: [],
    };
    g.totalQty += item.quantity;
    g.orders.push({ orderNo: item.order.orderNo, customerName: item.order.customer.name, qty: item.quantity });
    grouped.set(item.productId, g);
  }
  const list = Array.from(grouped.values()).sort((a, b) => b.totalQty - a.totalQty);

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-xl font-semibold">รายการที่ต้องสั่งซื้อ (Pre-order)</h1>
      <p className="mb-6 text-sm text-gray-400">
        รวมยอดสินค้า Pre-order ที่ลูกค้าสั่งแล้วแต่ยังไม่ได้ซื้อเข้าร้าน — เช็คลิสต์นี้ไปซื้อของได้ในทีเดียว
        แล้วกดยืนยันเพื่อรับเข้าสต็อกให้ทุกออเดอร์ที่รออยู่พร้อมกัน
      </p>

      {list.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">
          ไม่มีรายการที่ต้องสั่งซื้อตอนนี้
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((g) => (
            <div key={g.productId} className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-800">{g.name}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    ต้องซื้อทั้งหมด <span className="font-bold text-amber-600">{g.totalQty}</span> ชิ้น — มี{" "}
                    {g.orders.length} ออเดอร์รอ
                  </p>
                </div>
                <ConfirmArrivedButton productId={g.productId} />
              </div>
              <div className="mt-3 space-y-1 border-t pt-3 text-xs text-gray-500">
                {g.orders.map((o, i) => (
                  <div key={i}>
                    #{o.orderNo} — {o.customerName} × {o.qty}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
