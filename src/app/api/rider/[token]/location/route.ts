import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/rider/:token/location — คนขับอัปเดตตำแหน่งล่าสุด (ใช้จับคู่งานตามระยะทาง)
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const rider = await prisma.rider.findUnique({ where: { accessToken: token } });
  if (!rider || !rider.isActive) {
    return NextResponse.json({ error: "ไม่พบบัญชีคนขับ หรือถูกปิดใช้งาน" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { lat, lng } = body as { lat?: number; lng?: number };
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "พิกัดไม่ถูกต้อง" }, { status: 400 });
  }

  await prisma.rider.update({
    where: { id: rider.id },
    data: { lastLat: lat, lastLng: lng, lastLocationAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
