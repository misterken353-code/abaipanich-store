import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SalePageEditor from "./SalePageEditor";

export default async function EditSalePagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [salePage, products, facebookPosts, settings] = await Promise.all([
    prisma.salePage.findUnique({
      where: { id },
      include: { items: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
    }),
    prisma.syncedProduct.findMany({ orderBy: { name: "asc" } }),
    prisma.facebookPost.findMany({ where: { salePageId: id }, orderBy: { createdAt: "desc" } }),
    prisma.appSettings.findUnique({ where: { id: "singleton" } }),
  ]);

  if (!salePage) notFound();

  return (
    <SalePageEditor
      salePage={{
        id: salePage.id,
        title: salePage.title,
        slug: salePage.slug,
        description: salePage.description,
        coverUrl: salePage.coverUrl,
        isActive: salePage.isActive,
      }}
      initialItems={salePage.items.map((it) => ({
        productId: it.productId,
        sortOrder: it.sortOrder,
        priceOverride: it.priceOverride ? Number(it.priceOverride) : null,
        caption: it.caption,
        product: {
          id: it.product.id,
          code: it.product.code,
          name: it.product.name,
          salePrice: Number(it.product.salePrice),
          image1Url: it.product.image1Url,
          availableQty: it.product.availableQty,
          isPreOrder: it.product.isPreOrder,
        },
      }))}
      allProducts={products.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        salePrice: Number(p.salePrice),
        image1Url: p.image1Url,
        availableQty: p.availableQty,
        isPreOrder: p.isPreOrder,
      }))}
      facebookPosts={facebookPosts.map((p) => ({
        id: p.id,
        status: p.status,
        permalink: p.permalink,
        error: p.error,
        createdAt: p.createdAt.toISOString(),
      }))}
      facebookPageId={settings?.facebookPageId ?? null}
      storeUrl={process.env.NEXT_PUBLIC_APP_URL || ""}
    />
  );
}
