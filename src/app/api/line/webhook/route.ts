import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getLineConfig } from "@/lib/line";

interface LineEvent {
  type: string;
  source?: { userId?: string };
  message?: {
    type: string;
    text?: string;
    title?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
}

// POST /api/line/webhook — public, LINE Platform เรียกเข้ามาเมื่อมีข้อความ/event จากลูกค้า
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");
  const { channelSecret } = await getLineConfig();

  // ยังไม่ได้ตั้งค่า channel secret — ตอบ 200 เฉยๆ ไม่ประมวลผล (กัน LINE retry รัว ๆ)
  if (!channelSecret || !signature) {
    return NextResponse.json({ ok: true });
  }

  const expected = crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64");
  if (expected !== signature) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const body = JSON.parse(rawBody) as { events?: LineEvent[] };
  const events = body.events ?? [];

  for (const event of events) {
    const lineUserId = event.source?.userId ?? "unknown";
    try {
      if (event.type === "follow") {
        await prisma.lineMessageLog.create({
          data: { lineUserId, direction: "IN", message: "[เริ่มติดตามบัญชี LINE OA]" },
        });
      } else if (event.type === "message" && event.message?.type === "text") {
        await prisma.lineMessageLog.create({
          data: { lineUserId, direction: "IN", message: event.message.text ?? "" },
        });
      } else if (event.type === "message" && event.message?.type === "location") {
        const { title, address, latitude, longitude } = event.message;
        const mapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
        await prisma.lineMessageLog.create({
          data: {
            lineUserId,
            direction: "IN",
            message: `[ตำแหน่ง] ${title ?? ""} ${address ?? ""} ${mapsUrl}`.trim(),
          },
        });
      }
    } catch (e) {
      console.error("[line webhook] event handling failed:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
