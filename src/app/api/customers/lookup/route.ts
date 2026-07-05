import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/customers/lookup?phone=xxx — public, ใช้ prefill ฟอร์ม checkout ให้ลูกค้าเก่า
export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone")?.trim();
  if (!phone || phone.length < 9) {
    return NextResponse.json({ customer: null });
  }

  const customer = await prisma.customer.findFirst({
    where: { phone },
    orderBy: { createdAt: "desc" },
    select: { name: true, address: true, lineUserId: true },
  });

  return NextResponse.json({ customer: customer ?? null });
}
