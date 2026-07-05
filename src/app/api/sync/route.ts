import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/sync — ดึงสต็อก + รูปสินค้าล่าสุดจาก GearGao-SaaS (public API, read-only) มา cache ไว้
export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const baseUrl = process.env.GEARGAO_PUBLIC_API_URL;
  const orgSlug = process.env.GEARGAO_ORG_SLUG;
  if (!baseUrl || !orgSlug) {
    return NextResponse.json(
      { error: "ยังไม่ได้ตั้งค่า GEARGAO_PUBLIC_API_URL / GEARGAO_ORG_SLUG" },
      { status: 400 }
    );
  }

  const url = `${baseUrl}?slug=${encodeURIComponent(orgSlug)}`;

  let data: {
    products: RemoteProduct[];
    preOrderProducts: RemoteProduct[];
  };

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: body.error ?? `เรียก GearGao API ไม่สำเร็จ (${res.status})` },
        { status: 502 }
      );
    }
    data = await res.json();
  } catch (e) {
    console.error("[sync] fetch error:", e);
    return NextResponse.json({ error: "เชื่อมต่อ GearGao API ไม่ได้" }, { status: 502 });
  }

  const all = [
    ...data.products.map((p) => ({ ...p, isPreOrder: false })),
    ...data.preOrderProducts.map((p) => ({ ...p, isPreOrder: true })),
  ];

  let upserted = 0;
  for (const p of all) {
    await prisma.syncedProduct.upsert({
      where: { sourceId: p.id },
      create: {
        sourceId: p.id,
        code: p.code,
        name: p.name,
        description: p.description ?? null,
        categoryName: p.categoryName ?? null,
        unitName: p.unitName ?? null,
        salePrice: p.salePrice,
        image1Url: p.image1Url ?? null,
        image2Url: p.image2Url ?? null,
        image3Url: p.image3Url ?? null,
        image4Url: p.image4Url ?? null,
        availableQty: p.availableQty,
        isPreOrder: p.isPreOrder,
      },
      update: {
        code: p.code,
        name: p.name,
        description: p.description ?? null,
        categoryName: p.categoryName ?? null,
        unitName: p.unitName ?? null,
        salePrice: p.salePrice,
        image1Url: p.image1Url ?? null,
        image2Url: p.image2Url ?? null,
        image3Url: p.image3Url ?? null,
        image4Url: p.image4Url ?? null,
        availableQty: p.availableQty,
        isPreOrder: p.isPreOrder,
        lastSyncedAt: new Date(),
      },
    });
    upserted++;
  }

  return NextResponse.json({ upserted, total: all.length });
}

interface RemoteProduct {
  id: string;
  code: string;
  name: string;
  description: string | null;
  categoryName: string | null;
  unitName: string | null;
  salePrice: number;
  image1Url: string | null;
  image2Url: string | null;
  image3Url?: string | null;
  image4Url?: string | null;
  availableQty: number;
}
