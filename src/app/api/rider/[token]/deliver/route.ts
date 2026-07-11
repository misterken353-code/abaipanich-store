import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyShop, pushLineMessage } from "@/lib/line";

// POST /api/rider/:token/deliver — คนขับกดแจ้งจัดส่งสำเร็จ
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const rider = await prisma.rider.findUnique({ where: { accessToken: token } });
  if (!rider || !rider.isActive) {
    return NextResponse.json({ error: "ไม่พบบัญชีคนขับ หรือถูกปิดใช้งาน" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { orderId } = body as { orderId?: string };
  if (!orderId) return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 400 });

  // เช็คว่างานนี้เป็นของคนขับคนนี้จริง ก่อนคิดค่าตอบแทน
  const target = await prisma.order.findFirst({ where: { id: orderId, riderId: rider.id } });
  if (!target) {
    return NextResponse.json({ error: "ไม่พบงานนี้ในรายการของคุณ" }, { status: 404 });
  }

  // รายรับม้าเร็ว = ค่าวิ่งงาน (deliveryFee) + ค่าคอมมิชชั่นต่องาน (ถ้าตั้งไว้) — ร้านเก็บเงินรวมแล้วจ่ายคืนม้าเร็วทีหลัง
  const riderPayout = Number(target.deliveryFee ?? 0) + Number(rider.commissionPerDelivery);

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "SHIPPED", deliveryStage: "DELIVERED", riderCommission: riderPayout },
  });

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { customer: true } });
  if (order) {
    await notifyShop(`✅ ${rider.name} จัดส่งออเดอร์ ${order.orderNo} สำเร็จแล้ว`);
    if (order.customer.lineUserId) {
      await pushLineMessage(
        order.customer.lineUserId,
        `📦 ออเดอร์ ${order.orderNo} ของคุณจัดส่งสำเร็จแล้ว ขอบคุณที่อุดหนุนสบายพาณิชย์ค่ะ`
      );
    }
  }

  return NextResponse.json({ ok: true });
}
