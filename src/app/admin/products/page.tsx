import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import SyncButton from "./SyncButton";

const PAGE_SIZE = 50;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;
  const query = q?.trim();
  const currentPage = Math.max(1, Number(page) || 1);

  const where: Prisma.SyncedProductWhereInput | undefined = query
    ? {
        OR: [
          { code: { contains: query, mode: "insensitive" } },
          { name: { contains: query, mode: "insensitive" } },
        ],
      }
    : undefined;

  const [total, products] = await Promise.all([
    prisma.syncedProduct.count({ where }),
    prisma.syncedProduct.findMany({
      where,
      orderBy: { code: "asc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const clampedPage = Math.min(currentPage, totalPages);
  const from = total === 0 ? 0 : (clampedPage - 1) * PAGE_SIZE + 1;
  const to = Math.min(clampedPage * PAGE_SIZE, total);

  // สร้าง querystring คงคำค้นหาไว้ตอนเปลี่ยนหน้า
  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(p));
    return `/admin/products?${params.toString()}`;
  };

  // เลขหน้าที่จะแสดง (หน้าปัจจุบัน ±2)
  const pageNumbers: number[] = [];
  for (let p = Math.max(1, clampedPage - 2); p <= Math.min(totalPages, clampedPage + 2); p++) {
    pageNumbers.push(p);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">สินค้า (sync จาก GearGao-SaaS)</h1>
        <SyncButton />
      </div>

      <form className="mb-4 flex gap-2" action="/admin/products" method="get">
        <input
          type="text"
          name="q"
          defaultValue={query ?? ""}
          placeholder="ค้นหารหัสหรือชื่อสินค้า"
          className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-400"
        />
        <button
          type="submit"
          className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          ค้นหา
        </button>
        {query && (
          <a
            href="/admin/products"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            ล้างการค้นหา
          </a>
        )}
      </form>

      <p className="mb-2 text-sm text-gray-500">
        {query ? (
          <>
            พบ <span className="font-semibold text-gray-700">{total.toLocaleString("th-TH")}</span> รายการที่ตรงกับ
            &quot;{query}&quot;
          </>
        ) : (
          <>
            ทั้งหมด <span className="font-semibold text-gray-700">{total.toLocaleString("th-TH")}</span> รายการ
          </>
        )}
        {total > 0 && (
          <> — กำลังแสดง {from.toLocaleString("th-TH")}–{to.toLocaleString("th-TH")}</>
        )}
      </p>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">รูป</th>
              <th className="px-4 py-2">รหัส</th>
              <th className="px-4 py-2">ชื่อสินค้า</th>
              <th className="px-4 py-2">ราคา</th>
              <th className="px-4 py-2">คงเหลือ</th>
              <th className="px-4 py-2">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t border-gray-100">
                <td className="px-4 py-2">
                  {p.image1Url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image1Url} alt={p.name} className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-gray-100" />
                  )}
                </td>
                <td className="px-4 py-2">{p.code}</td>
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2">{Number(p.salePrice).toLocaleString("th-TH")}</td>
                <td className="px-4 py-2">{p.availableQty}</td>
                <td className="px-4 py-2">
                  {p.isPreOrder ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                      สั่งจอง
                    </span>
                  ) : (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                      พร้อมส่ง
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  {query
                    ? `ไม่พบสินค้าที่ตรงกับ "${query}"`
                    : "ยังไม่มีสินค้า — กด “Sync สต็อก/รูปตอนนี้”"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-1">
          {clampedPage > 1 && (
            <Link
              href={pageHref(clampedPage - 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              ‹ ก่อนหน้า
            </Link>
          )}

          {pageNumbers[0] > 1 && (
            <>
              <Link
                href={pageHref(1)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                1
              </Link>
              {pageNumbers[0] > 2 && <span className="px-1 text-gray-400">…</span>}
            </>
          )}

          {pageNumbers.map((p) => (
            <Link
              key={p}
              href={pageHref(p)}
              aria-current={p === clampedPage ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                p === clampedPage
                  ? "bg-green-700 font-semibold text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p}
            </Link>
          ))}

          {pageNumbers[pageNumbers.length - 1] < totalPages && (
            <>
              {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                <span className="px-1 text-gray-400">…</span>
              )}
              <Link
                href={pageHref(totalPages)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
              >
                {totalPages}
              </Link>
            </>
          )}

          {clampedPage < totalPages && (
            <Link
              href={pageHref(clampedPage + 1)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              ถัดไป ›
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
