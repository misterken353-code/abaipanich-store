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
  const {
    lineChannelSecret,
    lineChannelAccessToken,
    lineShopUserId,
    promptPayId,
    facebookPageId,
    facebookPageAccessToken,
    storeLat,
    storeLng,
  } = body as {
    lineChannelSecret?: string | null;
    lineChannelAccessToken?: string | null;
    lineShopUserId?: string | null;
    promptPayId?: string | null;
    facebookPageId?: string | null;
    facebookPageAccessToken?: string | null;
    storeLat?: number | null;
    storeLng?: number | null;
  };

  const settings = await prisma.appSettings.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      lineChannelSecret: lineChannelSecret || null,
      lineChannelAccessToken: lineChannelAccessToken || null,
      lineShopUserId: lineShopUserId || null,
      promptPayId: promptPayId || null,
      facebookPageId: facebookPageId || null,
      facebookPageAccessToken: facebookPageAccessToken || null,
      storeLat: storeLat ?? null,
      storeLng: storeLng ?? null,
    },
    update: {
      ...(lineChannelSecret !== undefined ? { lineChannelSecret: lineChannelSecret || null } : {}),
      ...(lineChannelAccessToken !== undefined ? { lineChannelAccessToken: lineChannelAccessToken || null } : {}),
      ...(lineShopUserId !== undefined ? { lineShopUserId: lineShopUserId || null } : {}),
      ...(promptPayId !== undefined ? { promptPayId: promptPayId || null } : {}),
      ...(facebookPageId !== undefined ? { facebookPageId: facebookPageId || null } : {}),
      ...(facebookPageAccessToken !== undefined
        ? { facebookPageAccessToken: facebookPageAccessToken || null }
        : {}),
      ...(storeLat !== undefined ? { storeLat: storeLat ?? null } : {}),
      ...(storeLng !== undefined ? { storeLng: storeLng ?? null } : {}),
    },
  });

  return NextResponse.json({ settings });
}
