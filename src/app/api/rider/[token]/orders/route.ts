import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/rider/:token/orders — public (auth ผ่าน token), คืนงานที่ว่าง/งานของตัวเอง/ประวัติ/สรุปคะแนน-ค่าคอมมิชชั่น
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  const rider = await prisma.rider.findUnique({ where: { accessToken: token } });
  if (!rider || !rider.isActive) {
    return NextResponse.json({ error: "ไม่พบบัญชีคนขับ หรือถูกปิดใช้งาน" }, { status: 404 });
  }

  // heartbeat: ถ้าคนขับสแตนบายอยู่ อัปเดตเวลาล่าสุดที่เห็น (poll ทุก ~15 วิ) เพื่อคงสถานะ "พร้อมรับงาน"
  if (rider.isOnline) {
    await prisma.rider.update({ where: { id: rider.id }, data: { lastSeenAt: new Date() } });
  }

  const [available, mine, history, unsettled] = await Promise.all([
    prisma.order.findMany({
      where: {
        shippingMethod: "MOTORCYCLE",
        riderId: null,
        status: { not: "CANCELLED" },
        acknowledgedAt: { not: null },
        // ออเดอร์ที่มีของ Pre-order ต้องรอแอดมินกด "สินค้ามาถึงร้านแล้ว" ก่อน ถึงจะเข้าคิวให้คนขับกดรับงานได้
        OR: [{ hasPreOrder: false }, { stockArrivedAt: { not: null } }],
      },
      include: { customer: true, items: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.findMany({
      where: { riderId: rider.id, status: { notIn: ["SHIPPED", "CANCELLED"] } },
      include: { customer: true, items: true },
      orderBy: { assignedAt: "asc" },
    }),
    prisma.order.findMany({
      where: { riderId: rider.id, status: "SHIPPED" },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    // ยอดค้าง (ค่าคอมมิชชั่น/เงินสด COD) ต้องคำนวณจากทุกงาน ไม่ใช่แค่ 20 รายการล่าสุดใน history — ไม่งั้นยอดจะตกหล่นถ้าค้างเกิน 20 งาน
    prisma.order.findMany({
      where: { riderId: rider.id, status: "SHIPPED" },
      select: { riderCommission: true, commissionSettled: true, paymentMethod: true, totalAmount: true, codRemitted: true },
    }),
  ]);

  const rated = history.filter((o) => o.riderRating != null);
  const avgRating = rated.length > 0 ? rated.reduce((s, o) => s + (o.riderRating ?? 0), 0) / rated.length : null;
  const unsettledCommission = unsettled
    .filter((o) => !o.commissionSettled)
    .reduce((s, o) => s + Number(o.riderCommission ?? 0), 0);
  const unsettledCod = unsettled
    .filter((o) => o.paymentMethod === "COD" && !o.codRemitted)
    .reduce((s, o) => s + Number(o.totalAmount), 0);

  return NextResponse.json({
    rider: { name: rider.name, isOnline: rider.isOnline, avgRating, ratedCount: rated.length, unsettledCommission, unsettledCod },
    available,
    mine,
    history,
  });
}
