"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cartCount, cartTotal, getCart, saveCart, type CartItem } from "@/lib/cart";
import ImageLightbox from "@/components/ImageLightbox";

export interface SalePageProduct {
  productId: string;
  code: string;
  name: string;
  caption: string | null;
  imageUrl: string | null;
  isPreOrder: boolean;
  availableQty: number;
  price: number;
}

export default function SalePageClient({ items }: { items: SalePageProduct[] }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    setCart(getCart());
  }, []);

  function addToCart(product: SalePageProduct) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.productId);
      const next = existing
        ? prev.map((i) =>
            i.productId === product.productId ? { ...i, qty: i.qty + 1 } : i
          )
        : [
            ...prev,
            {
              productId: product.productId,
              code: product.code,
              name: product.name,
              price: product.price,
              imageUrl: product.imageUrl,
              qty: 1,
              isPreOrder: product.isPreOrder,
            },
          ];
      saveCart(next);
      return next;
    });
  }

  const sortedItems = [...items].sort((a, b) => {
    const aHasImage = Boolean(a.imageUrl);
    const bHasImage = Boolean(b.imageUrl);
    if (aHasImage === bHasImage) return 0;
    return aHasImage ? -1 : 1;
  });

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {sortedItems.map((item) => {
          const soldOut = !item.isPreOrder && item.availableQty <= 0;
          return (
            <div
              key={item.productId}
              className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white"
            >
              <div className="relative aspect-square bg-gray-100 p-2">
                {item.imageUrl ? (
                  <button
                    type="button"
                    onClick={() => setLightbox({ src: item.imageUrl!, alt: item.name })}
                    className="group/img relative block h-full w-full cursor-zoom-in overflow-hidden rounded-lg border border-gray-200 bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover/img:bg-black/20 group-hover/img:opacity-100">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sm shadow">
                        🔍
                      </span>
                    </span>
                  </button>
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-300">
                    ไม่มีรูป
                  </div>
                )}
                <span
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                    item.isPreOrder
                      ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {item.isPreOrder ? "สั่งจอง" : "พร้อมส่ง"}
                </span>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="line-clamp-2 text-sm font-medium text-gray-900">{item.name}</p>
                {item.caption && <p className="text-xs text-gray-500">{item.caption}</p>}
                <div className="mt-auto flex items-baseline gap-2 pt-1">
                  <span className="text-lg font-semibold text-green-700">
                    {item.price.toLocaleString("th-TH")}
                  </span>
                  <span className="text-xs text-gray-400">บาท</span>
                </div>

                {soldOut ? (
                  <div className="mt-2 rounded-lg bg-gray-100 py-2 text-center text-xs text-gray-400">
                    สินค้าหมด
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => addToCart(item)}
                    className="mt-2 rounded-lg bg-green-600 py-2 text-sm font-medium text-white active:bg-green-700"
                  >
                    + ใส่ตะกร้า
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {items.length === 0 && (
          <p className="col-span-full py-12 text-center text-gray-400">ยังไม่มีสินค้าในเพจนี้</p>
        )}
      </div>

      {cart.length > 0 && (
        <Link
          href="/cart"
          className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full bg-green-700 px-5 py-3 text-white shadow-xl transition-colors hover:bg-green-800"
        >
          <span className="text-xl">🛒</span>
          <span className="text-sm font-bold">{cartCount(cart)} รายการ</span>
          <span className="h-4 w-px bg-green-400" />
          <span className="text-sm font-extrabold">
            ฿{cartTotal(cart).toLocaleString("th-TH")}
          </span>
        </Link>
      )}

      {lightbox && (
        <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />
      )}
    </>
  );
}
