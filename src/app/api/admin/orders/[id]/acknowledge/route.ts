import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { pushLineMessage } from "@/lib/line";
import { haversineKm } from "@/lib/geo";

const NEARBY_RIDER_COUNT = 3;
const LOCATION_FRESHNESS_MS = 30 * 60 * 1000; // 30 นาที

// POST /api/admin/orders/:id/acknowledge — แอดมินกด "รับออเดอร์" แจ้งลูกค้าผ่าน LINE + แจ้งคนขับใกล้เคียง
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const order = await prisma.order.findUnique({ where: { id }, include: { customer: true } });
  if (!order) return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });

  if (order.acknowledgedAt) {
    return NextResponse.json({ ok: true, notified: false, alreadyAcknowledged: true });
  }

  // กด "รับออเดอร์" = เข้าขั้นแรกของการติดตามจัดส่งอัตโนมัติ (ลูกค้าเห็นในหน้า /order)
  await prisma.order.update({
    where: { id },
    data: { acknowledgedAt: new Date(), deliveryStage: "RECEIVED" },
  });

  let notified = false;
  if (order.customer.lineUserId) {
    const result = await pushLineMessage(
      order.customer.lineUserId,
      `🙏 ร้านสบายพาณิชย์ได้รับออเดอร์ ${order.orderNo} ของคุณแล้ว กำลังจัดเตรียมสินค้าให้นะคะ ขอบคุณที่อุดหนุนค่ะ`
    );
    notified = !result.skipped && !!result.ok;
  }

  // แจ้งคนขับที่ใกล้ลูกค้าที่สุด ให้รู้ว่ามีงานใหม่เข้าคิว (ยังต้องเข้าไปกด "รับงานนี้" เองในหน้าคนขับ)
  if (
    order.shippingMethod === "MOTORCYCLE" &&
    order.customerLat != null &&
    order.customerLng != null
  ) {
    const staleBefore = new Date(Date.now() - LOCATION_FRESHNESS_MS);
    const riders = await prisma.rider.findMany({
      where: { isActive: true, lineUserId: { not: null }, lastLocationAt: { gte: staleBefore } },
    });

    const nearby = riders
      .map((r) => ({
        rider: r,
        km: haversineKm(order.customerLat!, order.customerLng!, r.lastLat!, r.lastLng!),
      }))
      .sort((a, b) => a.km - b.km)
      .slice(0, NEARBY_RIDER_COUNT);

    for (const { rider, km } of nearby) {
      await pushLineMessage(
        rider.lineUserId!,
        `🔔 มีงานใหม่ใกล้คุณ! ออเดอร์ ${order.orderNo} ห่างจากคุณประมาณ ${km.toFixed(1)} กม.\nเข้าไปกดรับงานได้ที่ลิงก์ของคุณเลย`
      );
    }
  }

  return NextResponse.json({ ok: true, notified, alreadyAcknowledged: false });
}
