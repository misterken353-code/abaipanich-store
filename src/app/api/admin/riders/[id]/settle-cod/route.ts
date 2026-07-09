import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/admin/riders/:id/settle-cod — ยืนยันว่าคนขับนำเงินสด (COD) ที่เก็บจากลูกค้ามาคืนร้านแล้วทั้งหมด
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const result = await prisma.order.updateMany({
    where: { riderId: id, paymentMethod: "COD", status: "SHIPPED", codRemitted: false },
    data: { codRemitted: true, codRemittedAt: new Date() },
  });

  return NextResponse.json({ ok: true, settledCount: result.count });
}
