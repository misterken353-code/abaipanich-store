import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/riders/:id/settle-commission — เคลียร์ยอดค่าคอมมิชชั่นค้างจ่ายทั้งหมดของคนขับคนนี้
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const result = await prisma.order.updateMany({
    where: { riderId: id, commissionSettled: false, riderCommission: { not: null } },
    data: { commissionSettled: true, settledAt: new Date() },
  });

  return NextResponse.json({ ok: true, settledCount: result.count });
}
