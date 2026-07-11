import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { getAddFriendUrl } from "@/lib/lineOa";
import RateRiderForm from "./RateRiderForm";
import LineAddFriend from "./LineAddFriend";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "รอชำระเงิน",
  PAID: "ชำระเงินแล้ว",
  SHIPPED: "จัดส่งแล้ว",
  CANCELLED: "ยกเลิก",
};

const SHIPPING_LABEL: Record<string, string> = {
  PICKUP: "รับเองหน้าร้าน",
  MOTORCYCLE: "เรียกม้าเร็วจัดส่ง",
  FREIGHT: "จัดส่งทางขนส่ง",
};

const SHIPPING_NOTE: Record<string, string> = {
  PICKUP: "ไม่มีค่าจัดส่ง",
  MOTORCYCLE: "ค่าส่งม้าเร็ว (เริ่มต้น 15 บาท กม.แรก, กม.ที่ 2 ขึ้นไป กม.ละ 5 บาท) ไม่รวมในยอดนี้ — ชำระให้คนขับโดยตรง",
  FREIGHT: "ชำระค่าส่งปลายทางกับบริษัทขนส่ง",
};

const PAYMENT_LABEL: Record<string, string> = {
  COD: "จ่ายตอนรับของ",
  TRANSFER: "โอนเงินผ่าน PromptPay",
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { items: true, customer: true, rider: true },
  });

  if (!order) notFound();

  // ลิงก์เพิ่มเพื่อน LINE OA + QR (สร้างฝั่ง server) สำหรับการ์ด "เพิ่มเพื่อนแบบกดปุ่มเดียว"
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  const addFriendUrl = getAddFriendUrl(settings?.lineOaUrl);
  const addFriendQr = await QRCode.toDataURL(addFriendUrl, { width: 320, margin: 1 }).catch(() => null);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-green-700 text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h1 className="text-xl font-extrabold">สั่งซื้อสำเร็จ</h1>
          <p className="text-green-200 text-sm mt-1">เลขที่ออเดอร์ {order.orderNo}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <LineAddFriend addUrl={addFriendUrl} qrDataUrl={addFriendQr} storageKey={order.orderNo} />

        {order.hasPreOrder && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
            <span className="text-2xl mt-0.5">🕐</span>
            <div className="text-sm">
              {order.stockArrivedAt ? (
                <>
                  <p className="font-bold text-amber-800">✓ สินค้ามาถึงร้านแล้ว</p>
                  <p className="text-amber-700 text-xs mt-1">
                    ทางร้านกำลังจัดเตรียม{order.shippingMethod === "PICKUP" ? "ให้คุณมารับที่ร้านได้เลย" : "จัดส่งให้คุณ"}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-amber-800">คำสั่งซื้อนี้มีสินค้า Pre-order — นัดรับสินค้า ประมาณ 2–5 วัน</p>
                  <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                    ทางร้านกำลังสั่งสินค้าเข้ามาให้คุณ รับประกันความมั่นใจ: หากไม่ได้รับสินค้าภายใน 5 วัน
                    สามารถขอคืนเงินเต็มจำนวนได้ที่หน้าร้าน
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-500 text-sm">สถานะ</span>
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-3 py-1 rounded-full">
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
          </div>
          <div className="divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{item.nameSnapshot}</p>
                  <p className="text-xs text-gray-400">
                    {item.quantity} x ฿{Number(item.priceSnapshot).toLocaleString("th-TH")}
                  </p>
                </div>
                <p className="text-sm font-bold text-green-700 shrink-0">
                  ฿{(item.quantity * Number(item.priceSnapshot)).toLocaleString("th-TH")}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t">
            <span className="text-gray-500 font-semibold">ยอดรวม</span>
            <span className="text-2xl font-extrabold text-green-700">
              ฿{Number(order.totalAmount).toLocaleString("th-TH")}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          {order.paymentMethod === "COD" ? (
            <>
              <div className="text-3xl mb-2">💵</div>
              <p className="font-bold text-gray-700">ชำระเงินปลายทางเมื่อได้รับสินค้า</p>
              <p className="text-sm text-gray-500 mt-1">
                เตรียมเงินสด ฿{Number(order.totalAmount).toLocaleString("th-TH")} ไว้ชำระตอนรับสินค้าได้เลย
              </p>
            </>
          ) : order.promptPayQr ? (
            <>
              <p className="font-bold text-gray-700 mb-3">สแกน QR เพื่อชำระเงินผ่าน PromptPay</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={order.promptPayQr} alt="PromptPay QR" className="mx-auto w-64 h-64" />
              <p className="text-xs text-gray-400 mt-2">
                ยอดชำระ ฿{Number(order.totalAmount).toLocaleString("th-TH")}
              </p>
              <p className="text-sm font-semibold text-amber-700 bg-amber-50 rounded-xl px-4 py-2 mt-4">
                📎 โอนเสร็จแล้ว กรุณาส่งสลิปยืนยันการชำระเงินให้ทางร้านทาง LINE
              </p>
            </>
          ) : (
            <>
              <div className="text-3xl mb-2">📞</div>
              <p className="font-bold text-gray-700">ทางร้านได้รับออเดอร์ของคุณแล้ว</p>
              <p className="text-sm text-gray-500 mt-1">
                ทางร้านจะติดต่อกลับเพื่อแจ้งช่องทางชำระเงินเร็ว ๆ นี้
              </p>
            </>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-sm text-gray-600 space-y-1">
          <p className="font-semibold text-gray-800 mb-2">การจัดส่ง</p>
          <p>วิธีชำระเงิน: {PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod}</p>
          <p>วิธีจัดส่ง: {SHIPPING_LABEL[order.shippingMethod] ?? order.shippingMethod}</p>
          {order.shippingMethod === "MOTORCYCLE" && order.deliveryFee != null && Number(order.deliveryFee) > 0 ? (
            <p className="text-xs text-gray-400">
              ค่าส่งโดยประมาณ: ฿{Number(order.deliveryFee).toLocaleString("th-TH")} (ชำระให้คนขับโดยตรง ไม่รวมในยอดนี้)
            </p>
          ) : (
            <p className="text-xs text-gray-400">{SHIPPING_NOTE[order.shippingMethod]}</p>
          )}
          {order.customerLat != null && order.customerLng != null && (
            <a
              href={`https://www.google.com/maps?q=${order.customerLat},${order.customerLng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-1 text-green-700 underline text-xs font-semibold"
            >
              📍 ดูตำแหน่งที่แชร์ไว้
            </a>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-sm text-gray-600 space-y-1">
          <p className="font-semibold text-gray-800 mb-2">ข้อมูลผู้สั่งซื้อ</p>
          <p>ชื่อ: {order.customer.name}</p>
          <p>เบอร์โทร: {order.customer.phone}</p>
          {order.shippingAddress && <p>ที่อยู่: {order.shippingAddress}</p>}
          {order.note && <p>หมายเหตุ: {order.note}</p>}
        </div>

        {order.status === "SHIPPED" && order.rider && order.riderRating == null && (
          <RateRiderForm orderNo={order.orderNo} riderName={order.rider.name} />
        )}
        {order.riderRating != null && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center text-sm text-gray-500">
            คุณให้คะแนนคนขับไปแล้ว {"⭐".repeat(order.riderRating)}
          </div>
        )}

        <Link
          href="/"
          className="block text-center bg-green-700 text-white font-bold py-3 rounded-full hover:bg-green-800 transition-colors"
        >
          กลับไปเลือกซื้อสินค้าต่อ
        </Link>
      </main>
    </div>
  );
}
