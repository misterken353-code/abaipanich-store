import Link from "next/link";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import OrderDateFilter, { type MonthGroup, type DateOption } from "./OrderDateFilter";

const TZ = "Asia/Bangkok";
const FULL_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const SHORT_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

// แปลงเวลา UTC เป็น "YYYY-MM-DD" ตามเวลาไทย (Asia/Bangkok, +07:00 คงที่ ไม่มี DST)
function bangkokDateKey(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// "YYYY-MM-DD" → "7 กรกฎาคม 2569" (พ.ศ.)
function thaiFullDate(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return `${d} ${FULL_MONTHS[m - 1]} ${y + 543}`;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  SHIPPED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-200 text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "รอชำระเงิน",
  PAID: "ชำระเงินแล้ว",
  SHIPPED: "จัดส่งแล้ว",
  CANCELLED: "ยกเลิก",
};

const SHIPPING_LABEL: Record<string, string> = {
  PICKUP: "รับเองหน้าร้าน",
  MOTORCYCLE: "ม้าเร็ว",
  FREIGHT: "ขนส่ง",
};

const PAYMENT_LABEL: Record<string, string> = {
  COD: "จ่ายปลายทาง",
  TRANSFER: "โอนเงิน",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; date?: string }>;
}) {
  const { q, date } = await searchParams;
  const query = q?.trim();
  const today = bangkokDateKey(new Date());

  // ค่าวันที่ที่เลือก: "all" = ทุกวัน, รูปแบบ YYYY-MM-DD = วันนั้น, ไม่ระบุ = วันนี้
  const selectedDate =
    date === "all" ? "all" : date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : today;

  // where: ถ้ามีคำค้นหา → ค้นข้ามทุกวัน, ไม่งั้นกรองตามวันที่เลือก (เว้นแต่ "ทุกวัน")
  let where: Prisma.OrderWhereInput | undefined;
  if (query) {
    where = {
      OR: [
        { orderNo: { contains: query, mode: "insensitive" } },
        { customer: { name: { contains: query, mode: "insensitive" } } },
        { customer: { phone: { contains: query, mode: "insensitive" } } },
      ],
    };
  } else if (selectedDate !== "all") {
    const startUtc = new Date(`${selectedDate}T00:00:00+07:00`);
    const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000);
    where = { createdAt: { gte: startUtc, lt: endUtc } };
  }

  const [orders, allOrderDates] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { customer: true, items: true, rider: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    // ดึงเฉพาะวันที่ของทุกออเดอร์ ไว้สร้าง dropdown เลือกวัน (จัดกลุ่มตามเดือน)
    prisma.order.findMany({ select: { createdAt: true }, orderBy: { createdAt: "desc" } }),
  ]);

  // นับจำนวนออเดอร์ต่อวัน (ตามเวลาไทย) + ใส่ "วันนี้" ไว้เสมอแม้ยังไม่มีออเดอร์
  const counts = new Map<string, number>();
  for (const o of allOrderDates) {
    const key = bangkokDateKey(o.createdAt);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  if (!counts.has(today)) counts.set(today, 0);

  // จัดกลุ่มวันเป็นเดือน (เรียงใหม่→เก่า)
  const sortedKeys = [...counts.keys()].sort().reverse();
  const monthMap = new Map<string, DateOption[]>();
  for (const key of sortedKeys) {
    const [y, m, d] = key.split("-").map(Number);
    const monthKey = `${y}-${String(m).padStart(2, "0")}`;
    const count = counts.get(key) ?? 0;
    const isToday = key === today;
    const label = `${d} ${SHORT_MONTHS[m - 1]}${isToday ? " (วันนี้)" : ""} — ${
      count > 0 ? `${count} ออเดอร์` : "ไม่มีออเดอร์"
    }`;
    if (!monthMap.has(monthKey)) monthMap.set(monthKey, []);
    monthMap.get(monthKey)!.push({ value: key, label });
  }
  const months: MonthGroup[] = [...monthMap.entries()].map(([mk, options]) => {
    const [y, m] = mk.split("-").map(Number);
    return { label: `${FULL_MONTHS[m - 1]} ${y + 543}`, options };
  });

  const heading = query
    ? `ผลค้นหา "${query}"`
    : selectedDate === "all"
    ? "ออเดอร์ทั้งหมด"
    : `ออเดอร์วันที่ ${thaiFullDate(selectedDate)}${selectedDate === today ? " (วันนี้)" : ""}`;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">ออเดอร์ลูกค้า</h1>
      <p className="mb-4 text-sm text-gray-500">
        {heading} — {orders.length.toLocaleString("th-TH")} รายการ
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-gray-600">ดูออเดอร์ตามวัน:</span>
        <OrderDateFilter months={months} value={query ? today : selectedDate} />
        {selectedDate !== "all" && !query && (
          <a
            href="/admin/orders?date=all"
            className="text-sm font-semibold text-green-700 hover:underline"
          >
            ดูทั้งหมด
          </a>
        )}
      </div>

      <form className="mb-4 flex gap-2" action="/admin/orders" method="get">
        <input
          type="text"
          name="q"
          defaultValue={query ?? ""}
          placeholder="ค้นหาเลขที่ออเดอร์ (เช่น SP202607050004) ชื่อ หรือเบอร์โทรลูกค้า"
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
            href="/admin/orders"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            ล้างการค้นหา
          </a>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">เลขที่ออเดอร์</th>
              <th className="px-4 py-2">รับแล้ว</th>
              <th className="px-4 py-2">ลูกค้า</th>
              <th className="px-4 py-2">รายการ</th>
              <th className="px-4 py-2">จัดส่ง</th>
              <th className="px-4 py-2">คนขับ</th>
              <th className="px-4 py-2">ชำระเงิน</th>
              <th className="px-4 py-2">ยอดรวม</th>
              <th className="px-4 py-2">สถานะ</th>
              <th className="px-4 py-2">วันที่</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-green-700 hover:underline">
                    {o.orderNo}
                  </Link>
                  {o.hasPreOrder && (
                    <span
                      className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full text-amber-600 bg-amber-50"
                      title={o.stockArrivedAt ? `สินค้าถึงร้านแล้ว ${o.stockArrivedAt.toLocaleString("th-TH")}` : "รอสินค้า Pre-order เข้าร้าน"}
                    >
                      {o.stockArrivedAt ? "✓ ของถึงแล้ว" : "🕐 รอของ"}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {o.acknowledgedAt ? (
                    <span className="text-green-600 font-bold" title={o.acknowledgedAt.toLocaleString("th-TH")}>
                      ✓
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {o.customer.name}
                  <div className="text-xs text-gray-400">{o.customer.phone}</div>
                </td>
                <td className="px-4 py-2 text-gray-500">{o.items.length} รายการ</td>
                <td className="px-4 py-2 text-gray-500">{SHIPPING_LABEL[o.shippingMethod] ?? o.shippingMethod}</td>
                <td className="px-4 py-2 text-gray-500">{o.rider ? o.rider.name : <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-2 text-gray-500">{PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}</td>
                <td className="px-4 py-2 font-semibold">
                  {Number(o.totalAmount).toLocaleString("th-TH")}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[o.status]}`}>
                    {STATUS_LABEL[o.status]}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-400">
                  {o.createdAt.toLocaleString("th-TH")}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                  {query
                    ? `ไม่พบออเดอร์ที่ตรงกับ "${query}"`
                    : selectedDate === "all"
                    ? "ยังไม่มีออเดอร์"
                    : `ไม่มีออเดอร์ในวันที่ ${thaiFullDate(selectedDate)}`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
