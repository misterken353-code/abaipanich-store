import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StatusButtons from "./StatusButtons";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, customer: true },
  });

  if (!order) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold">ออเดอร์ {order.orderNo}</h1>
      <p className="mb-6 text-sm text-gray-400">
        สั่งเมื่อ {order.createdAt.toLocaleString("th-TH")}
      </p>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-gray-700">สถานะออเดอร์</h2>
        <StatusButtons orderId={order.id} status={order.status} />
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-gray-700">รายการสินค้า</h2>
        <div className="divide-y">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <p className="font-medium text-gray-800">{item.nameSnapshot}</p>
                <p className="text-xs text-gray-400">
                  {item.quantity} x {Number(item.priceSnapshot).toLocaleString("th-TH")}
                </p>
              </div>
              <p className="font-semibold">
                {(item.quantity * Number(item.priceSnapshot)).toLocaleString("th-TH")}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="font-semibold text-gray-500">ยอดรวม</span>
          <span className="text-xl font-bold text-green-700">
            {Number(order.totalAmount).toLocaleString("th-TH")} บาท
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
        <h2 className="mb-2 font-semibold text-gray-700">ข้อมูลลูกค้า</h2>
        <p>ชื่อ: {order.customer.name}</p>
        <p>เบอร์โทร: {order.customer.phone}</p>
        {order.customer.address && <p>ที่อยู่: {order.customer.address}</p>}
        {order.customer.lineUserId && <p>LINE: {order.customer.lineUserId}</p>}
        {order.note && <p>หมายเหตุ: {order.note}</p>}
        {order.slipUrl && (
          <p className="mt-2">
            สลิปโอนเงิน:{" "}
            <a href={order.slipUrl} target="_blank" rel="noreferrer" className="text-green-700 underline">
              ดูสลิป
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
