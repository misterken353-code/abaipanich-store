import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "รอชำระเงิน",
  PAID: "ชำระเงินแล้ว",
  SHIPPED: "จัดส่งแล้ว",
  CANCELLED: "ยกเลิก",
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;

  const order = await prisma.order.findUnique({
    where: { orderNo },
    include: { items: true, customer: true },
  });

  if (!order) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-emerald-700 text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <h1 className="text-xl font-extrabold">สั่งซื้อสำเร็จ</h1>
          <p className="text-emerald-200 text-sm mt-1">เลขที่ออเดอร์ {order.orderNo}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
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
                <p className="text-sm font-bold text-emerald-700 shrink-0">
                  ฿{(item.quantity * Number(item.priceSnapshot)).toLocaleString("th-TH")}
                </p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t">
            <span className="text-gray-500 font-semibold">ยอดรวม</span>
            <span className="text-2xl font-extrabold text-emerald-700">
              ฿{Number(order.totalAmount).toLocaleString("th-TH")}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center">
          {order.promptPayQr ? (
            <>
              <p className="font-bold text-gray-700 mb-3">สแกน QR เพื่อชำระเงินผ่าน PromptPay</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={order.promptPayQr} alt="PromptPay QR" className="mx-auto w-64 h-64" />
              <p className="text-xs text-gray-400 mt-2">
                ยอดชำระ ฿{Number(order.totalAmount).toLocaleString("th-TH")}
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
          <p className="font-semibold text-gray-800 mb-2">ข้อมูลผู้สั่งซื้อ</p>
          <p>ชื่อ: {order.customer.name}</p>
          <p>เบอร์โทร: {order.customer.phone}</p>
          {order.customer.address && <p>ที่อยู่: {order.customer.address}</p>}
          {order.note && <p>หมายเหตุ: {order.note}</p>}
        </div>

        <Link
          href="/"
          className="block text-center bg-emerald-700 text-white font-bold py-3 rounded-full hover:bg-emerald-800 transition-colors"
        >
          กลับไปเลือกซื้อสินค้าต่อ
        </Link>
      </main>
    </div>
  );
}
