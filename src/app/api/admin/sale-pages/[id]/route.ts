import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/admin/sale-pages/:id — รายละเอียดเพจ + รายการสินค้าในเพจ
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const salePage = await prisma.salePage.findUnique({
    where: { id },
    include: { items: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
  });
  if (!salePage) return NextResponse.json({ error: "ไม่พบเพจขาย" }, { status: 404 });

  return NextResponse.json({ salePage });
}

interface ItemInput {
  productId: string;
  sortOrder: number;
  priceOverride: number | null;
  caption: string | null;
}

// PATCH /api/admin/sale-pages/:id — อัปเดตข้อมูลเพจ + แทนที่รายการสินค้าทั้งหมด
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await prisma.salePage.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "ไม่พบเพจขาย" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const { title, slug, description, coverUrl, isActive, items } = body as {
    title?: string;
    slug?: string;
    description?: string | null;
    coverUrl?: string | null;
    isActive?: boolean;
    items?: ItemInput[];
  };

  if (typeof slug === "string" && slug.trim() && slug.trim() !== existing.slug) {
    const cleanSlug = slug.trim();
    if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
      return NextResponse.json(
        { error: "slug ต้องเป็นตัวอักษร a-z, ตัวเลข, และ - เท่านั้น" },
        { status: 400 }
      );
    }
    const dup = await prisma.salePage.findUnique({ where: { slug: cleanSlug } });
    if (dup && dup.id !== id) {
      return NextResponse.json({ error: "slug นี้ถูกใช้แล้ว" }, { status: 400 });
    }
  }

  try {
    const salePage = await prisma.$transaction(async (tx) => {
      const updated = await tx.salePage.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(slug !== undefined && slug.trim() ? { slug: slug.trim() } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(coverUrl !== undefined ? { coverUrl } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });

      if (items) {
        await tx.salePageItem.deleteMany({ where: { salePageId: id } });
        if (items.length > 0) {
          await tx.salePageItem.createMany({
            data: items.map((it) => ({
              salePageId: id,
              productId: it.productId,
              sortOrder: it.sortOrder,
              priceOverride: it.priceOverride ?? null,
              caption: it.caption ?? null,
            })),
          });
        }
      }

      return updated;
    });

    return NextResponse.json({ salePage });
  } catch (e) {
    console.error("[sale-pages PATCH]", e);
    return NextResponse.json({ error: "บันทึกไม่สำเร็จ" }, { status: 500 });
  }
}

// DELETE /api/admin/sale-pages/:id
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  await prisma.salePage.delete({ where: { id } }).catch(() => null);

  return NextResponse.json({ ok: true });
}
