import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { postSalePageToFacebook } from "@/lib/facebook";

// GET /api/admin/sale-pages/:id/facebook-post — ประวัติการโพสต์ของเพจนี้
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const posts = await prisma.facebookPost.findMany({
    where: { salePageId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ posts });
}

// POST /api/admin/sale-pages/:id/facebook-post — โพสต์เพจขายนี้ไปยัง Facebook Page ทันที
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const result = await postSalePageToFacebook(id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ post: result.post });
}
