import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/riders/:id — แก้ไขข้อมูล/เปิดปิดสถานะคนขับ
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const { name, phone, lineUserId, isActive } = body as {
    name?: string;
    phone?: string;
    lineUserId?: string | null;
    isActive?: boolean;
  };

  const rider = await prisma.rider
    .update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(phone !== undefined ? { phone: phone.trim() } : {}),
        ...(lineUserId !== undefined ? { lineUserId: lineUserId?.trim() || null } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    })
    .catch(() => null);

  if (!rider) return NextResponse.json({ error: "ไม่พบคนขับ" }, { status: 404 });
  return NextResponse.json({ rider });
}

// DELETE /api/admin/riders/:id
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await prisma.rider.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
