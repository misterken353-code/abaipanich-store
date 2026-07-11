import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/rider/:token/standby — คนขับกด "สแตนบายรับงาน" (online) / "พักรับงาน" (offline)
export async function POST(req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const rider = await prisma.rider.findUnique({ where: { accessToken: token } });
  if (!rider || !rider.isActive) {
    return NextResponse.json({ error: "ไม่พบบัญชีคนขับ หรือถูกปิดใช้งาน" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const { online } = body as { online?: boolean };
  if (typeof online !== "boolean") {
    return NextResponse.json({ error: "ค่าสถานะไม่ถูกต้อง" }, { status: 400 });
  }

  await prisma.rider.update({
    where: { id: rider.id },
    data: { isOnline: online, lastSeenAt: new Date() },
  });

  return NextResponse.json({ ok: true, isOnline: online });
}
