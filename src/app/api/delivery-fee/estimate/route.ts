import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estimateDeliveryFee } from "@/lib/deliveryFee";

// GET /api/delivery-fee/estimate?lat=&lng= — public, ประเมินค่าส่งม้าเร็วตามระยะทางจริงจากร้าน
export async function GET(req: NextRequest) {
  const lat = Number(req.nextUrl.searchParams.get("lat"));
  const lng = Number(req.nextUrl.searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "พิกัดไม่ถูกต้อง" }, { status: 400 });
  }

  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (settings?.storeLat == null || settings?.storeLng == null) {
    return NextResponse.json({ error: "ร้านยังไม่ได้ตั้งพิกัด" }, { status: 404 });
  }

  const { distanceKm, fee } = estimateDeliveryFee(settings.storeLat, settings.storeLng, lat, lng);
  return NextResponse.json({ distanceKm, fee });
}
