import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
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

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {salePage.items.map((item) => {
          const price = item.priceOverride != null ? Number(item.priceOverride) : Number(item.product.salePrice);
          return (
            <div
              key={item.id}
              className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white"
            >
              <div className="relative aspect-square bg-gray-100">
                {item.product.image1Url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.product.image1Url}
                    alt={item.product.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-300">
                    ไม่มีรูป
                  </div>
                )}
                <span
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.product.isPreOrder
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {item.product.isPreOrder ? "สั่งจอง" : "พร้อมส่ง"}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="line-clamp-2 text-sm font-medium text-gray-900">{item.product.name}</p>
                {item.caption && <p className="text-xs text-gray-500">{item.caption}</p>}
                <div className="mt-auto flex items-baseline gap-2 pt-1">
                  <span className="text-lg font-semibold text-green-700">
                    {price.toLocaleString("th-TH")}
                  </span>
                  <span className="text-xs text-gray-400">บาท</span>
                </div>
              </div>
            </div>
          );
        })}

        {salePage.items.length === 0 && (
          <p className="col-span-full py-12 text-center text-gray-400">ยังไม่มีสินค้าในเพจนี้</p>
        )}
      </div>
    </main>
  );
}
