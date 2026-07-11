import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STORE, LINE_OA_CHAT_URL } from "@/lib/store";
import StatusButtons from "./StatusButtons";
import AcknowledgeButton from "./AcknowledgeButton";
import AssignRiderButton from "./AssignRiderButton";
import DoneButton from "./DoneButton";
import StockArrivedButton from "./StockArrivedButton";
import CustomerActions from "./CustomerActions";
import PrintButton from "./PrintButton";

const baht = (n: number) => n.toLocaleString("th-TH");

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

  // สรุปยอด: ค่าสินค้า + ค่าส่งม้าเร็ว (ถ้ามี) = ยอดที่ลูกค้าต้องจ่ายทั้งหมด
  const productTotal = Number(order.totalAmount);
  const deliveryFee =
    order.shippingMethod === "MOTORCYCLE" && order.deliveryFee != null ? Number(order.deliveryFee) : 0;
  const grandTotal = productTotal + deliveryFee;
  const collectNote =
    order.paymentMethod === "COD"
      ? "เก็บเงินปลายทางจากลูกค้า (ค่าสินค้า + ค่าส่ง)"
      : deliveryFee > 0
        ? "ค่าสินค้าโอนแล้ว — เหลือเก็บค่าส่งสดกับคนขับ"
        : "ชำระครบแล้วผ่าน PromptPay";

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-semibold">ออเดอร์ {order.orderNo}</h1>
          <p className="text-sm text-gray-400">สั่งเมื่อ {order.createdAt.toLocaleString("th-TH")}</p>
        </div>
        <PrintButton />
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-gray-700">รับออเดอร์</h2>
        <AcknowledgeButton orderId={order.id} acknowledgedAt={order.acknowledgedAt?.toISOString() ?? null} />
      </div>

      {order.hasPreOrder && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-1 font-semibold text-amber-800">🕐 มีสินค้า Pre-order ในออเดอร์นี้</h2>
          <p className="mb-3 text-xs text-amber-700">
            ออเดอร์นี้จะยังไม่เข้าคิวให้คนขับกดรับงาน (กรณีเลือกส่งม้าเร็ว) จนกว่าจะกดปุ่มด้านล่างยืนยันว่าสินค้ามาถึงร้านแล้วจริง —
            กดแล้วระบบจะเพิ่มจำนวนสต็อกของสินค้า Pre-order ในออเดอร์นี้ให้ทันที (ลูกค้าคนอื่นสั่งซื้อต่อได้)
          </p>
          <StockArrivedButton orderId={order.id} stockArrivedAt={order.stockArrivedAt?.toISOString() ?? null} />
        </div>
      )}

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
                <p className="font-medium text-gray-800">
                  {item.nameSnapshot}
                  {item.isPreOrder && (
                    <span
                      className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.arrivedAt ? "text-green-600 bg-green-50" : "text-amber-600 bg-amber-50"
                      }`}
                    >
                      {item.arrivedAt ? "✓ ของถึงแล้ว" : "🕐 Pre-order — รอของ"}
                    </span>
                  )}
                </p>
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
        <div className="mt-3 space-y-1 border-t pt-3 text-sm">
          <div className="flex items-center justify-between text-gray-600">
            <span>ค่าสินค้า</span>
            <span>{baht(productTotal)} บาท</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex items-center justify-between text-gray-600">
              <span>ค่าส่งม้าเร็ว (คนขับเก็บสด)</span>
              <span>{baht(deliveryFee)} บาท</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t pt-2">
            <span className="font-semibold text-gray-700">
              {order.paymentMethod === "COD" ? "ยอดที่ต้องเก็บทั้งหมด" : "ยอดรวมทั้งหมด"}
            </span>
            <span className="text-xl font-bold text-green-700">{baht(grandTotal)} บาท</span>
          </div>
          <p className="pt-1 text-xs text-amber-700">💰 {collectNote}</p>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
        <h2 className="mb-2 font-semibold text-gray-700">การจัดส่งและชำระเงิน</h2>
        <p>วิธีชำระเงิน: {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
        {order.paymentMethod === "COD" && (
          <p className="text-xs">
            {order.codRemitted ? (
              <span className="font-semibold text-green-600">✓ คนขับนำเงินสดส่งร้านแล้ว</span>
            ) : (
              <span className="font-semibold text-amber-600">ยังไม่ได้นำเงินสดส่งร้าน</span>
            )}
          </p>
        )}
        <p>วิธีจัดส่ง: {SHIPPING_LABEL[order.shippingMethod] ?? order.shippingMethod}</p>
        {order.shippingMethod === "MOTORCYCLE" && order.deliveryFee != null && Number(order.deliveryFee) > 0 && (
          <p className="text-xs text-gray-500">
            ค่าส่ง (คนขับเก็บสดจากลูกค้า): {Number(order.deliveryFee).toLocaleString("th-TH")} บาท
          </p>
        )}
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
        {order.customer.lineUserId && (
          <p className="break-all text-xs text-gray-400">LINE User ID: {order.customer.lineUserId}</p>
        )}
        {order.note && <p>หมายเหตุ: {order.note}</p>}

        <div className="mt-3">
          <CustomerActions
            phone={order.customer.phone}
            lineChatUrl={LINE_OA_CHAT_URL}
            hasLineUser={Boolean(order.customer.lineUserId)}
          />
        </div>

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

      {/* ใบส่งของสำหรับพิมพ์ — ซ่อนบนจอ แสดงเฉพาะตอน window.print() */}
      <div id="print-receipt" className="text-black">
        <div className="text-center">
          <div className="text-2xl font-bold">{STORE.name}</div>
          <div className="text-sm">{STORE.tagline}</div>
          <div className="mt-1 text-xs">{STORE.address}</div>
          <div className="text-xs">โทร. {STORE.phone}</div>
        </div>

        <div className="my-3 border-t border-black" />

        <div className="text-center text-lg font-semibold">ใบส่งของ / ใบเสร็จรับเงิน</div>

        <div className="mt-3 flex justify-between text-sm">
          <div>
            <div>เลขที่: {order.orderNo}</div>
            <div>วันที่: {order.createdAt.toLocaleString("th-TH")}</div>
          </div>
          <div className="text-right">
            <div>ลูกค้า: {order.customer.name}</div>
            <div>โทร. {order.customer.phone}</div>
          </div>
        </div>
        {order.shippingAddress && (
          <div className="mt-1 text-sm">ที่อยู่จัดส่ง: {order.shippingAddress}</div>
        )}

        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-black">
              <th className="py-1 text-left font-semibold">รายการ</th>
              <th className="py-1 text-center font-semibold">จำนวน</th>
              <th className="py-1 text-right font-semibold">ราคา/หน่วย</th>
              <th className="py-1 text-right font-semibold">รวม</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b border-gray-400">
                <td className="py-1">{item.nameSnapshot}</td>
                <td className="py-1 text-center">{item.quantity}</td>
                <td className="py-1 text-right">{baht(Number(item.priceSnapshot))}</td>
                <td className="py-1 text-right">{baht(item.quantity * Number(item.priceSnapshot))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 ml-auto w-64 text-sm">
          <div className="flex justify-between">
            <span>ค่าสินค้า</span>
            <span>{baht(productTotal)} บาท</span>
          </div>
          {deliveryFee > 0 && (
            <div className="flex justify-between">
              <span>ค่าส่งม้าเร็ว</span>
              <span>{baht(deliveryFee)} บาท</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-black pt-1 text-base font-bold">
            <span>ยอดรวมทั้งสิ้น</span>
            <span>{baht(grandTotal)} บาท</span>
          </div>
        </div>

        <div className="mt-2 text-sm">
          การชำระเงิน: {order.paymentMethod === "COD" ? "เก็บเงินปลายทาง (COD)" : "โอนผ่าน PromptPay"}
        </div>

        <div className="mt-8 flex justify-between text-center text-sm">
          <div>
            <div className="mb-8">......................................</div>
            <div>ผู้รับสินค้า</div>
          </div>
          <div>
            <div className="mb-8">......................................</div>
            <div>ผู้ส่งสินค้า</div>
          </div>
        </div>

        <div className="mt-4 text-center text-xs">ขอบคุณที่อุดหนุน {STORE.name} 🙏</div>
      </div>
    </div>
  );
}
