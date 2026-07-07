import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pushLineMessage } from "@/lib/line";

// POST /api/admin/orders/:id/stock-arrived — แอดมินกด "สินค้ามาถึงร้านแล้ว" สำหรับออเดอร์ที่มีของ Pre-order
// ต้องกดปุ่มนี้ก่อน ออเดอร์ Pre-order ที่เลือกม้าเร็วถึงจะเข้าคิวให้คนขับกดรับงานได้ (กันของยังไม่ถึงร้านแล้วถูกส่งไปก่อน)
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { customer: true, items: true },
  });
  if (!order) return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });

  if (!order.hasPreOrder) {
    return NextResponse.json({ error: "ออเดอร์นี้ไม่มีสินค้า Pre-order" }, { status: 400 });
  }
  if (order.stockArrivedAt) {
    return NextResponse.json({ ok: true, notified: false, alreadyArrived: true });
  }

  await prisma.$transaction([
    prisma.order.update({ where: { id }, data: { stockArrivedAt: new Date() } }),
    // ของที่สั่งมาเข้าร้านแล้ว = รับสต็อกจริง — เพิ่มจำนวนคงเหลือให้ลูกค้าคนอื่นสั่งซื้อได้ต่อ
    // (เป็นแค่ cache ฝั่งนี้ ถ้า Sync สต็อกรอบถัดไปจะถูกเขียนทับด้วยตัวเลขจริงจาก GearGao อยู่ดี)
    ...order.items
      .filter((item) => item.isPreOrder)
      .map((item) =>
        prisma.syncedProduct.update({
          where: { id: item.productId },
          data: { availableQty: { increment: item.quantity }, isPreOrder: false },
        })
      ),
  ]);

  let notified = false;
  if (order.customer.lineUserId) {
    const text =
      order.shippingMethod === "PICKUP"
        ? `📦 สินค้า Pre-order ของออเดอร์ ${order.orderNo} มาถึงร้านแล้วค่ะ เชิญมารับสินค้าได้เลยนะคะ`
        : `📦 สินค้า Pre-order ของออเดอร์ ${order.orderNo} มาถึงร้านแล้วค่ะ ทางร้านกำลังจัดเตรียมจัดส่งให้นะคะ`;
    const result = await pushLineMessage(order.customer.lineUserId, text);
    notified = !result.skipped && !!result.ok;
  }

  return NextResponse.json({ ok: true, notified, alreadyArrived: false });
}
