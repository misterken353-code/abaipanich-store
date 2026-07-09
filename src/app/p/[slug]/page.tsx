import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SalePageClient, { type SalePageProduct } from "./SalePageClient";

export default async function SalePagePublicView({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const salePage = await prisma.salePage.findUnique({
    where: { slug },
    include: { items: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
  });

  if (!salePage || !salePage.isActive) notFound();

  const items: SalePageProduct[] = salePage.items.map((item) => ({
    productId: item.product.id,
    code: item.product.code,
    name: item.product.name,
    caption: item.caption,
    imageUrl: item.product.image1Url,
    isPreOrder: item.product.isPreOrder,
    availableQty: item.product.availableQty,
    price:
      item.priceOverride != null
        ? Number(item.priceOverride)
        : Number(item.product.salePrice),
  }));

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 pb-28">
      {salePage.coverUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={salePage.coverUrl}
          alt={salePage.title}
          className="mb-6 h-48 w-full rounded-2xl object-cover sm:h-64"
        />
      )}

      <h1 className="text-2xl font-semibold text-gray-900">{salePage.title}</h1>
      {salePage.description && (
        <p className="mt-2 whitespace-pre-line text-gray-600">{salePage.description}</p>
      )}

      <SalePageClient items={items} />
    </main>
  );
}
