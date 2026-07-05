import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/sale-pages — list ทุกเพจขาย
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const salePages = await prisma.salePage.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({ salePages });
}

// POST /api/admin/sale-pages — สร้างเพจขายใหม่ (ว่างเปล่า) แล้วให้แอดมินไปแก้ต่อที่หน้า [id]
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "เพจใหม่";

  // สร้าง slug แบบ ascii สั้นๆ ให้อัตโนมัติก่อน — แอดมินแก้เป็นชื่อที่อ่านง่ายทีหลังได้ที่หน้าแก้ไข
  let slug = `page-${Date.now().toString(36)}`;
  while (await prisma.salePage.findUnique({ where: { slug } })) {
    slug = `page-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
  }

  const salePage = await prisma.salePage.create({
    data: { title, slug, isActive: false },
  });

  return NextResponse.json({ salePage });
}
