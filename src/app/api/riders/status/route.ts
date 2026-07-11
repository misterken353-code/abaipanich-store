import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isRiderOnline } from "@/lib/riderStatus";

// GET /api/riders/status — public: เช็คว่ามีม้าเร็ว "พร้อมรับงาน" อยู่ไหม (ใช้ตอน checkout เลือกม้าเร็ว)
// available = มีคนขับที่ออนไลน์และยังว่าง (ไม่ติดงานที่ยังส่งไม่เสร็จ) อย่างน้อย 1 คน
export async function GET() {
  const riders = await prisma.rider.findMany({
    where: { isActive: true },
    select: {
      id: true,
      isOnline: true,
      lastSeenAt: true,
      orders: {
        where: { status: { notIn: ["SHIPPED", "CANCELLED"] } },
        select: { id: true },
      },
    },
  });

  const online = riders.filter(isRiderOnline);
  const free = online.filter((r) => r.orders.length === 0);

  return NextResponse.json(
    {
      onlineCount: online.length,
      freeCount: free.length,
      available: free.length > 0,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
