import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/orders/:orderNo/rate-rider — public, ลูกค้าให้คะแนนคนขับหลังจัดส่งสำเร็จ
export async function POST(req: NextRequest, ctx: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const { rating, comment } = body as { rating?: number; comment?: string | null };

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "กรุณาให้คะแนน 1-5 ดาว" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { orderNo } });
  if (!order) return NextResponse.json({ error: "ไม่พบออเดอร์" }, { status: 404 });
  if (!order.riderId) return NextResponse.json({ error: "ออเดอร์นี้ไม่มีคนขับ" }, { status: 400 });
  if (order.status !== "SHIPPED") {
    return NextResponse.json({ error: "ให้คะแนนได้หลังจัดส่งสำเร็จเท่านั้น" }, { status: 400 });
  }
  if (order.riderRating != null) {
    return NextResponse.json({ error: "ให้คะแนนไปแล้ว" }, { status: 400 });
  }

  await prisma.order.update({
    where: { orderNo },
    data: { riderRating: Math.round(rating), riderRatingComment: comment?.trim() || null },
  });

  return NextResponse.json({ ok: true });
}
