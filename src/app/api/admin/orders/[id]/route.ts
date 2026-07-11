import { NextRequest, NextResponse } from "next/server";
import { OrderStatus, DeliveryStage } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pushLineMessage } from "@/lib/line";

const VALID_STATUSES: string[] = Object.values(OrderStatus);
const VALID_STAGES: string[] = Object.values(DeliveryStage);

// ข้อความแจ้งลูกค้าทาง LINE ตามขั้นการจัดส่ง (ส่งเฉพาะเมื่อรู้ lineUserId ของลูกค้า)
const STAGE_CUSTOMER_MSG: Record<string, (orderNo: string) => string> = {
  RECEIVED: (o) => `🙏 ร้านสบายพาณิชย์รับออเดอร์ ${o} ของคุณแล้ว กำลังดำเนินการให้นะคะ`,
  PREPARING: (o) => `📦 ออเดอร์ ${o} กำลังจัดเตรียมสินค้าอยู่ค่ะ`,
  DELIVERING: (o) => `🛵 ออเดอร์ ${o} กำลังจัดส่งไปหาคุณแล้วค่ะ`,
  DELIVERED: (o) => `✅ ออเดอร์ ${o} จัดส่งสำเร็จแล้ว ขอบคุณที่อุดหนุนสบายพาณิชย์ค่ะ`,
};

// PATCH /api/admin/orders/:id — อัปเดตสถานะการชำระเงิน (status) และ/หรือ ขั้นการจัดส่ง (deliveryStage)
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const { status, deliveryStage } = body as { status?: string; deliveryStage?: string };

  if (status === undefined && deliveryStage === undefined) {
    return NextResponse.json({ error: "ไม่มีข้อมูลที่จะอัปเดต" }, { status: 400 });
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
  }
  if (deliveryStage !== undefined && !VALID_STAGES.includes(deliveryStage)) {
    return NextResponse.json({ error: "ขั้นการจัดส่งไม่ถูกต้อง" }, { status: 400 });
  }

  const data: { status?: OrderStatus; deliveryStage?: DeliveryStage } = {};
  if (status !== undefined) data.status = status as OrderStatus;
  if (deliveryStage !== undefined) data.deliveryStage = deliveryStage as DeliveryStage;

  const order = await prisma.order
    .update({ where: { id }, data, include: { customer: true } })
    .catch(() => null);
  if (!order) return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });

  // แจ้งลูกค้าทาง LINE เมื่อเปลี่ยนขั้นการจัดส่ง (ถ้ามี lineUserId ของลูกค้า)
  if (deliveryStage !== undefined && order.customer.lineUserId) {
    const msg = STAGE_CUSTOMER_MSG[deliveryStage];
    if (msg) await pushLineMessage(order.customer.lineUserId, msg(order.orderNo));
  }

  return NextResponse.json({ order: { id: order.id } });
}
