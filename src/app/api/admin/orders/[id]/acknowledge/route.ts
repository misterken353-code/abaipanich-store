import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pushLineMessage } from "@/lib/line";

// POST /api/admin/orders/:id/acknowledge — แอดมินกด "รับออเดอร์" แจ้งลูกค้าผ่าน LINE
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true } });
  if (!order) return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });

  if (order.acknowledgedAt) {
    return NextResponse.json({ ok: true, notified: false, alreadyAcknowledged: true });
  }

  await prisma.order.update({ where: { id }, data: { acknowledgedAt: new Date() } });

  let notified = false;
  if (order.customer.lineUserId) {
    const result = await pushLineMessage(
      order.customer.lineUserId,
      `🙏 ร้านสบายพาณิชย์ได้รับออเดอร์ ${order.orderNo} ของคุณแล้ว กำลังจัดเตรียมสินค้าให้นะคะ ขอบคุณที่อุดหนุนค่ะ`
    );
    notified = !result.skipped && !!result.ok;
  }

  return NextResponse.json({ ok: true, notified, alreadyAcknowledged: false });
}
