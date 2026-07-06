import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StatusButtons from "./StatusButtons";
import AcknowledgeButton from "./AcknowledgeButton";
import AssignRiderButton from "./AssignRiderButton";
import DoneButton from "./DoneButton";

const SHIPPING_LABEL: Record<string, string> = {
  PICKUP: "รับเองหน้าร้าน",
  MOTORCYCLE: "เรียกม้าเร็วจัดส่ง",
  FREIGHT: "จัดส่งทางขนส่ง",
};

const PAYMENT_LABEL: Record<string, string> = {
  COD: "จ่ายตอนรับของ",
  TRANSFER: "โอนเงินผ่าน PromptPay",
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [order, riders] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: { items: true, customer: true, rider: true },
    }),
    prisma.rider.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  if (!order) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-semibold">ออเดอร์ {order.orderNo}</h1>
      <p className="mb-6 text-sm text-gray-400">
        สั่งเมื่อ {order.createdAt.toLocaleString("th-TH")}
      </p>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-gray-700">รับออเดอร์</h2>
        <AcknowledgeButton orderId={order.id} acknowledgedAt={order.acknowledgedAt?.toISOString() ?? null} />
      </div>

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

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
        <h2 className="mb-2 font-semibold text-gray-700">การจัดส่งและชำระเงิน</h2>
        <p>วิธีชำระเงิน: {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
        <p>วิธีจัดส่ง: {SHIPPING_LABEL[order.shippingMethod] ?? order.shippingMethod}</p>
        {order.shippingAddress && <p>ที่อยู่: {order.shippingAddress}</p>}
        {order.customerLat != null && order.customerLng != null && (
          <a
            href={`https://www.google.com/maps?q=${order.customerLat},${order.customerLng}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-green-700 underline"
          >
            📍 เปิดตำแหน่งลูกค้าใน Google Maps
          </a>
        )}
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-gray-700">คนขับ</h2>
        <p className="mb-3 text-xs text-gray-400">
          ปกติคนขับจะกดรับงานเอง (ถ้า &quot;วิธีจัดส่ง&quot; เป็นม้าเร็ว และกด &quot;รับออเดอร์&quot; ด้านบนแล้ว) —
          ใช้ตรงนี้เพื่อมอบหมายเอง/เปลี่ยนคนขับกรณีจำเป็น
        </p>
        {order.rider && (
          <p className="mb-3 text-sm text-gray-600">
            มอบหมายให้: <span className="font-semibold">{order.rider.name}</span> ({order.rider.phone})
            {order.assignedAt && (
              <span className="text-gray-400"> — {order.assignedAt.toLocaleString("th-TH")}</span>
            )}
          </p>
        )}
        <AssignRiderButton orderId={order.id} riders={riders} currentRiderId={order.riderId} />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
        <h2 className="mb-2 font-semibold text-gray-700">ข้อมูลลูกค้า</h2>
        <p>ชื่อ: {order.customer.name}</p>
        <p>เบอร์โทร: {order.customer.phone}</p>
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

      <div className="mt-6">
        <DoneButton />
      </div>
    </div>
  );
}
