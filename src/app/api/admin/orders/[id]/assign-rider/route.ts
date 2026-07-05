import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pushLineMessage } from "@/lib/line";

const SHIPPING_LABEL: Record<string, string> = {
  PICKUP: "รับเองหน้าร้าน",
  MOTORCYCLE: "เรียกม้าเร็วจัดส่ง",
  FREIGHT: "จัดส่งทางขนส่ง",
};

// POST /api/admin/orders/:id/assign-rider — มอบหมายออเดอร์ให้คนขับ แจ้งงานผ่าน LINE
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const { riderId } = body as { riderId?: string | null };

  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true, items: true } });
  if (!order) return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });

  if (!riderId) {
    await prisma.order.update({ where: { id }, data: { riderId: null, assignedAt: null } });
    return NextResponse.json({ ok: true, notified: false });
  }

  const rider = await prisma.rider.findUnique({ where: { id: riderId } });
  if (!rider) return NextResponse.json({ error: "ไม่พบคนขับ" }, { status: 404 });

  await prisma.order.update({ where: { id }, data: { riderId, assignedAt: new Date() } });

  let notified = false;
  if (rider.lineUserId) {
    const itemLines = order.items.map((it) => `- ${it.nameSnapshot} x${it.quantity}`).join("\n");
    const mapsLine =
      order.customerLat != null && order.customerLng != null
        ? `\n📍 https://www.google.com/maps?q=${order.customerLat},${order.customerLng}`
        : "";
    const codLine = order.paymentMethod === "COD" ? `\n💵 เก็บเงินปลายทาง: ${Number(order.totalAmount).toLocaleString("th-TH")} บาท` : "";

    const result = await pushLineMessage(
      rider.lineUserId,
      `🛵 งานส่งใหม่ ออเดอร์ ${order.orderNo}\n` +
        `ลูกค้า: ${order.customer.name} (${order.customer.phone})\n` +
        `${itemLines}\n` +
        `จัดส่ง: ${SHIPPING_LABEL[order.shippingMethod] ?? order.shippingMethod}\n` +
        `${order.shippingAddress ?? ""}${mapsLine}${codLine}`
    );
    notified = !result.skipped && !!result.ok;
  }

  return NextResponse.json({ ok: true, notified });
}
