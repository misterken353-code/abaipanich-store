import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/riders — รายชื่อคนขับทั้งหมด
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const riders = await prisma.rider.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ riders });
}

// POST /api/admin/riders — เพิ่มคนขับใหม่
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, phone, lineUserId } = body as { name?: string; phone?: string; lineUserId?: string | null };

  if (!name?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "กรุณากรอกชื่อและเบอร์โทรศัพท์" }, { status: 400 });
  }

  const rider = await prisma.rider.create({
    data: { name: name.trim(), phone: phone.trim(), lineUserId: lineUserId?.trim() || null },
  });

  return NextResponse.json({ rider });
}
