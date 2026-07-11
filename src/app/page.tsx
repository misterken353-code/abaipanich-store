import { prisma } from "@/lib/prisma";
import StorefrontClient from "./StorefrontClient";
import LineChatButton from "@/components/LineChatButton";

export const revalidate = 60;

export default async function HomePage() {
  const products = await prisma.syncedProduct.findMany({
    orderBy: { code: "asc" },
  });

  const items = products.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    categoryName: p.categoryName,
    unitName: p.unitName,
    salePrice: Number(p.salePrice),
    image1Url: p.image1Url,
    image2Url: p.image2Url,
    availableQty: p.availableQty,
    isPreOrder: p.isPreOrder,
  }));

  return (
    <>
      <StorefrontClient items={items} />
      <LineChatButton />
    </>
  );
}
