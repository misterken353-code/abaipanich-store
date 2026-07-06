import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyShop } from "@/lib/line";

// POST /api/rider/:token/claim — คนขับกดรับงานเอง (กันชนกันด้วย where riderId: null)
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
    where: { id: orderId, riderId: null },
    data: { riderId: rider.id, assignedAt: new Date() },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "งานนี้มีคนรับไปแล้ว กรุณารีเฟรชหน้าเว็บ" }, { status: 409 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (order) {
    await notifyShop(`🛵 ${rider.name} รับงานส่งออเดอร์ ${order.orderNo} แล้ว`);
  }

  return NextResponse.json({ ok: true });
}
