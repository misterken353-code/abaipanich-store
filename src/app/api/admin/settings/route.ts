import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/settings — อ่านค่าตั้งค่าปัจจุบัน
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  return NextResponse.json({ settings });
}

// PATCH /api/admin/settings — บันทึกค่าตั้งค่า (upsert singleton row)
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { lineChannelSecret, lineChannelAccessToken, lineShopUserId, promptPayId } = body as {
    lineChannelSecret?: string | null;
    lineChannelAccessToken?: string | null;
    lineShopUserId?: string | null;
    promptPayId?: string | null;
  };

  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      lineChannelSecret: lineChannelSecret || null,
      lineChannelAccessToken: lineChannelAccessToken || null,
      lineShopUserId: lineShopUserId || null,
      promptPayId: promptPayId || null,
    },
    update: {
      ...(lineChannelSecret !== undefined ? { lineChannelSecret: lineChannelSecret || null } : {}),
      ...(lineChannelAccessToken !== undefined ? { lineChannelAccessToken: lineChannelAccessToken || null } : {}),
      ...(lineShopUserId !== undefined ? { lineShopUserId: lineShopUserId || null } : {}),
      ...(promptPayId !== undefined ? { promptPayId: promptPayId || null } : {}),
    },
  });

  return NextResponse.json({ settings });
}
