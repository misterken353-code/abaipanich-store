import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/rider/:token/orders — public (auth ผ่าน token), คืนงานที่ว่าง/งานของตัวเอง/ประวัติ/สรุปคะแนน-ค่าคอมมิชชั่น
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  const rider = await prisma.rider.findUnique({ where: { accessToken: token } });
  if (!rider || !rider.isActive) {
    return NextResponse.json({ error: "ไม่พบบัญชีคนขับ หรือถูกปิดใช้งาน" }, { status: 404 });
  }

  const [available, mine, history] = await Promise.all([
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
  ]);

  const rated = history.filter((o) => o.riderRating != null);
  const avgRating = rated.length > 0 ? rated.reduce((s, o) => s + (o.riderRating ?? 0), 0) / rated.length : null;
  const unsettledCommission = history
    .filter((o) => !o.commissionSettled)
    .reduce((s, o) => s + Number(o.riderCommission ?? 0), 0);

  return NextResponse.json({
    rider: { name: rider.name, avgRating, ratedCount: rated.length, unsettledCommission },
    available,
    mine,
    history,
  });
}
