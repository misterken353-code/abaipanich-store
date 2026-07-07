import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pushLineMessage } from "@/lib/line";

// POST /api/admin/purchase-list/:productId/confirm
// แอดมินกด "ซื้อมาแล้ว รับเข้าสต็อก" จากหน้ารายการที่ต้องสั่งซื้อ — ยืนยันทีเดียวให้ทุกออเดอร์
// ที่รอสินค้าตัวนี้อยู่พร้อมกัน (ต่างจากปุ่มต่อออเดอร์ที่ /admin/orders/[id] ซึ่งยืนยันทีละออเดอร์)
export async function POST(_req: NextRequest, ctx: { params: Promise<{ productId: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { productId } = await ctx.params;

  const product = await prisma.syncedProduct.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "ไม่พบสินค้า" }, { status: 404 });

  const pendingItems = await prisma.orderItem.findMany({
    where: {
      productId,
      isPreOrder: true,
      arrivedAt: null,
      order: { status: { not: "CANCELLED" } },
    },
  });

  if (pendingItems.length === 0) {
    return NextResponse.json({ error: "ไม่มีออเดอร์ที่รอสินค้านี้อยู่" }, { status: 400 });
  }

  const totalQty = pendingItems.reduce((sum, i) => sum + i.quantity, 0);

  await prisma.$transaction([
    prisma.syncedProduct.update({
      where: { id: productId },
      data: { availableQty: { increment: totalQty }, isPreOrder: false },
    }),
    ...pendingItems.map((item) =>
      prisma.orderItem.update({ where: { id: item.id }, data: { arrivedAt: new Date() } })
    ),
  ]);

  // เช็คแต่ละออเดอร์ที่ได้รับผลกระทบ — ถ้ารายการ Pre-order ครบทุกชิ้นแล้ว ถึงจะปิดออเดอร์เป็น "ของถึงร้านแล้ว" + แจ้งลูกค้า
  const affectedOrderIds = [...new Set(pendingItems.map((i) => i.orderId))];
  let ordersReady = 0;
  let notified = 0;

  for (const orderId of affectedOrderIds) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, customer: true },
    });
    if (!order || order.stockArrivedAt) continue;

    const stillWaiting = order.items.some((i) => i.isPreOrder && !i.arrivedAt);
    if (stillWaiting) continue;

    await prisma.order.update({ where: { id: orderId }, data: { stockArrivedAt: new Date() } });
    ordersReady++;

    if (order.customer.lineUserId) {
      const text =
        order.shippingMethod === "PICKUP"
          ? `📦 สินค้า Pre-order ของออเดอร์ ${order.orderNo} มาถึงร้านแล้วค่ะ เชิญมารับสินค้าได้เลยนะคะ`
          : `📦 สินค้า Pre-order ของออเดอร์ ${order.orderNo} มาถึงร้านแล้วค่ะ ทางร้านกำลังจัดเตรียมจัดส่งให้นะคะ`;
      const result = await pushLineMessage(order.customer.lineUserId, text);
      if (!result.skipped && result.ok) notified++;
    }
  }

  return NextResponse.json({
    ok: true,
    totalQty,
    ordersAffected: affectedOrderIds.length,
    ordersReady,
    notified,
  });
}
