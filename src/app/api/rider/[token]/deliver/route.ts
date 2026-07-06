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

  const result = await prisma.order.updateMany({
    where: { id: orderId, riderId: rider.id },
    data: { status: "SHIPPED" },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "ไม่พบงานนี้ในรายการของคุณ" }, { status: 404 });
  }

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
