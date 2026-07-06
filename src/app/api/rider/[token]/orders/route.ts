import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/rider/:token/orders — public (auth ผ่าน token), คืนงานที่ว่างและงานของตัวเอง
export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;

  const rider = await prisma.rider.findUnique({ where: { accessToken: token } });
  if (!rider || !rider.isActive) {
    return NextResponse.json({ error: "ไม่พบบัญชีคนขับ หรือถูกปิดใช้งาน" }, { status: 404 });
  }

  const [available, mine] = await Promise.all([
    prisma.order.findMany({
      where: { shippingMethod: "MOTORCYCLE", riderId: null, status: { not: "CANCELLED" }, acknowledgedAt: { not: null } },
      include: { customer: true, items: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.order.findMany({
      where: { riderId: rider.id, status: { notIn: ["SHIPPED", "CANCELLED"] } },
      include: { customer: true, items: true },
      orderBy: { assignedAt: "asc" },
    }),
  ]);

  return NextResponse.json({
    rider: { name: rider.name },
    available,
    mine,
  });
}
