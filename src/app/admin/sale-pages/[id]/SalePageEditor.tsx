"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Product {
  id: string;
  code: string;
  name: string;
  salePrice: number;
  image1Url: string | null;
  availableQty: number;
  isPreOrder: boolean;
}

interface Item {
  productId: string;
  sortOrder: number;
  priceOverride: number | null;
  caption: string | null;
  product: Product;
}

interface SalePageMeta {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  isActive: boolean;
}

interface FacebookPostRecord {
  id: string;
  status: string;
  permalink: string | null;
  error: string | null;
  createdAt: string;
}

export default function SalePageEditor({
  salePage,
  initialItems,
  allProducts,
  facebookPosts,
  facebookPageId,
  storeUrl,
}: {
  salePage: SalePageMeta;
  initialItems: Item[];
  allProducts: Product[];
  facebookPosts: FacebookPostRecord[];
  facebookPageId: string | null;
  storeUrl: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(salePage.title);
  const [slug, setSlug] = useState(salePage.slug);
  const [description, setDescription] = useState(salePage.description ?? "");
  const [coverUrl, setCoverUrl] = useState(salePage.coverUrl ?? "");
  const [isActive, setIsActive] = useState(salePage.isActive);
  const [items, setItems] = useState<Item[]>(initialItems);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [posts] = useState<FacebookPostRecord[]>(facebookPosts);
  const [posting, setPosting] = useState(false);
  const [postMessage, setPostMessage] = useState<string | null>(null);
  const [preparedMessage, setPreparedMessage] = useState<string | null>(null);

  const selectedIds = useMemo(() => new Set(items.map((it) => it.productId)), [items]);

  const searchResults = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return allProducts
      .filter((p) => !selectedIds.has(p.id))
      .filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
      .slice(0, 15);
  }, [search, allProducts, selectedIds]);

  function addProduct(p: Product) {
    setItems((prev) => [
      ...prev,
      { productId: p.id, sortOrder: prev.length, priceOverride: null, caption: null, product: p },
    ]);
    setSearch("");
  }

  function removeProduct(productId: string) {
    setItems((prev) =>
      prev.filter((it) => it.productId !== productId).map((it, idx) => ({ ...it, sortOrder: idx }))
    );
  }

  function move(productId: string, dir: -1 | 1) {
    setItems((prev) => {
      const idx = prev.findIndex((it) => it.productId === productId);
      const swapIdx = idx + dir;
      if (idx < 0 || swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next.map((it, i) => ({ ...it, sortOrder: i }));
    });
  }

  function updateItem(productId: string, patch: Partial<Pick<Item, "priceOverride" | "caption">>) {
    setItems((prev) => prev.map((it) => (it.productId === productId ? { ...it, ...patch } : it)));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/sale-pages/${salePage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          description: description || null,
          coverUrl: coverUrl || null,
          isActive,
          items: items.map((it) => ({
            productId: it.productId,
            sortOrder: it.sortOrder,
            priceOverride: it.priceOverride,
            caption: it.caption,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "บันทึกไม่สำเร็จ");
      } else {
        setMessage("บันทึกแล้ว");
        router.refresh();
      }
    } catch {
      setMessage("เชื่อมต่อไม่ได้");
    } finally {
      setSaving(false);
    }
  }

  async function handlePostToFacebook() {
    if (!facebookPageId) {
      setPostMessage("ยังไม่ได้ตั้งค่า Facebook Page ID ที่หน้าตั้งค่า");
      return;
    }
    setPosting(true);
    setPostMessage(null);
    const pageUrl = `${storeUrl}/p/${slug}`;
    const message = [title, description, `ดูสินค้าทั้งหมด: ${pageUrl}`].filter(Boolean).join("\n\n");
    setPreparedMessage(message);
    let copied = false;
    try {
      await navigator.clipboard.writeText(message);
      copied = true;
    } catch {
      copied = false;
    }
    window.open(`https://www.facebook.com/${facebookPageId}`, "_blank", "noopener,noreferrer");
    setPostMessage(
      copied
        ? 'คัดลอกข้อความแล้ว! ในแท็บเพจที่เปิดขึ้น กด "เขียนโพสต์" แล้ววาง (Ctrl+V) แล้วกดโพสต์เองได้เลย'
        : "คัดลอกอัตโนมัติไม่สำเร็จ — คัดลอกข้อความจากกล่องด้านล่างเอง แล้ววางในเพจที่เปิดขึ้นมาได้เลย"
    );
    setPosting(false);
  }

  async function handleDelete() {
    if (!confirm(`ลบเพจ "${title}" ใช่ไหม?`)) return;
    const res = await fetch(`/api/admin/sale-pages/${salePage.id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/sale-pages");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/admin/sale-pages" className="text-sm text-gray-500 hover:underline">
          ← กลับไปรายการเพจขาย
        </Link>
        <div className="flex items-center gap-2">
          {message && <span className="text-sm text-gray-600">{message}</span>}
          <button
            onClick={handleDelete}
            className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            ลบเพจ
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </button>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">ชื่อเพจ</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-gray-600">slug (URL: /p/&lt;slug&gt;)</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">คำอธิบายเพจ</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-600">รูปปก (URL)</span>
          <input
            value={coverUrl}
            onChange={(e) => setCoverUrl(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span>เผยแพร่เพจนี้ (ลูกค้าเข้าดูได้ที่ /p/{slug})</span>
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-700">Facebook</h2>
          <div className="flex items-center gap-2">
            {postMessage && <span className="text-sm text-gray-600">{postMessage}</span>}
            <button
              onClick={handlePostToFacebook}
              disabled={posting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {posting ? "กำลังเตรียม..." : "เตรียมโพสต์ Facebook"}
            </button>
          </div>
        </div>
        {!isActive && (
          <p className="mt-2 text-xs text-amber-600">
            เพจนี้ยังไม่ได้เผยแพร่ — บันทึกลิงก์ /p/{slug} ไว้ก่อนโพสต์ ลูกค้าจะเข้าดูไม่ได้จนกว่าจะติ๊กเผยแพร่และกดบันทึก
          </p>
        )}
        {preparedMessage && (
          <div className="mt-3">
            <p className="mb-1 text-xs text-gray-500">ข้อความที่เตรียมไว้ (เลือกทั้งหมด + คัดลอกเองได้ถ้าจำเป็น):</p>
            <textarea
              readOnly
              value={preparedMessage}
              rows={4}
              onFocus={(e) => e.target.select()}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs"
            />
          </div>
        )}
        {posts.length > 0 && (
          <div className="mt-3 divide-y text-sm">
            {posts.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2">
                <div>
                  <span
                    className={
                      p.status === "POSTED"
                        ? "text-green-600"
                        : p.status === "FAILED"
                          ? "text-red-600"
                          : "text-gray-500"
                    }
                  >
                    {p.status === "POSTED" ? "โพสต์สำเร็จ" : p.status === "FAILED" ? "โพสต์ไม่สำเร็จ" : p.status}
                  </span>
                  {p.error && <span className="ml-2 text-xs text-gray-400">{p.error}</span>}
                  <span className="ml-2 text-xs text-gray-400">
                    {new Date(p.createdAt).toLocaleString("th-TH")}
                  </span>
                </div>
                {p.permalink && (
                  <a
                    href={p.permalink}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    ดูโพสต์ →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-gray-700">เพิ่มสินค้าเข้าเพจ</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ค้นหาชื่อหรือรหัสสินค้า..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        {searchResults.length > 0 && (
          <div className="mt-1 max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white">
            {searchResults.map((p) => (
              <button
                key={p.id}
                onClick={() => addProduct(p)}
                className="flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2 text-left text-sm last:border-0 hover:bg-gray-50"
              >
                {p.image1Url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image1Url} alt={p.name} className="h-8 w-8 rounded object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded bg-gray-100" />
                )}
                <span className="flex-1">
                  {p.name} <span className="text-gray-400">({p.code})</span>
                </span>
                <span className="text-gray-500">{p.salePrice.toLocaleString("th-TH")} บ.</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {items.map((it, idx) => (
          <div
            key={it.productId}
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
          >
            {it.product.image1Url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={it.product.image1Url}
                alt={it.product.name}
                className="h-12 w-12 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded bg-gray-100" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{it.product.name}</p>
              <p className="text-xs text-gray-400">
                {it.product.code} · ราคาปกติ {it.product.salePrice.toLocaleString("th-TH")} บ. ·
                คงเหลือ {it.product.availableQty}
              </p>
              <div className="mt-1 flex gap-2">
                <input
                  type="number"
                  placeholder="ราคาพิเศษ (ถ้ามี)"
                  value={it.priceOverride ?? ""}
                  onChange={(e) =>
                    updateItem(it.productId, {
                      priceOverride: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className="w-36 rounded-lg border border-gray-300 px-2 py-1 text-xs"
                />
                <input
                  type="text"
                  placeholder="แคปชั่นเฉพาะเพจ (ถ้ามี)"
                  value={it.caption ?? ""}
                  onChange={(e) => updateItem(it.productId, { caption: e.target.value || null })}
                  className="flex-1 rounded-lg border border-gray-300 px-2 py-1 text-xs"
                />
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <button
                onClick={() => move(it.productId, -1)}
                disabled={idx === 0}
                className="rounded border border-gray-300 px-2 py-0.5 text-xs disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={() => move(it.productId, 1)}
                disabled={idx === items.length - 1}
                className="rounded border border-gray-300 px-2 py-0.5 text-xs disabled:opacity-30"
              >
                ↓
              </button>
            </div>
            <button
              onClick={() => removeProduct(it.productId)}
              className="shrink-0 rounded-lg border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
            >
              ลบ
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-400">
            ยังไม่มีสินค้าในเพจนี้ — ค้นหาแล้วกดเพิ่มด้านบน
          </p>
        )}
      </div>
    </div>
  );
}
