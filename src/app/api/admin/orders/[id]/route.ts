import { NextRequest, NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES: string[] = Object.values(OrderStatus);

// PATCH /api/admin/orders/:id — อัปเดตสถานะออเดอร์
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const { status } = body as { status?: string };

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "สถานะไม่ถูกต้อง" }, { status: 400 });
  }

  const order = await prisma.order
    .update({ where: { id }, data: { status: status as OrderStatus } })
    .catch(() => null);
  if (!order) return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });

  return NextResponse.json({ order });
}
