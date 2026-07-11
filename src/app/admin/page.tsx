import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isRiderOnline } from "@/lib/riderStatus";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "รอชำระเงิน",
  PAID: "ชำระเงินแล้ว",
  SHIPPED: "จัดส่งแล้ว",
  CANCELLED: "ยกเลิก",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700",
  SHIPPED: "bg-blue-100 text-blue-700",
  CANCELLED: "bg-gray-200 text-gray-500",
};

const baht = (n: number) => n.toLocaleString("th-TH");

// เที่ยงคืนวันนี้ตามเวลาไทย (UTC+7 คงที่ ไม่มี DST) แปลงกลับเป็น UTC สำหรับ query
function startOfTodayBangkokUtc(): Date {
  const now = new Date();
  const bangkokNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const y = bangkokNow.getUTCFullYear();
  const m = bangkokNow.getUTCMonth();
  const d = bangkokNow.getUTCDate();
  return new Date(Date.UTC(y, m, d, 0, 0, 0) - 7 * 60 * 60 * 1000);
}

function startOfThisMonthBangkokUtc(): Date {
  const now = new Date();
  const bangkokNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const y = bangkokNow.getUTCFullYear();
  const m = bangkokNow.getUTCMonth();
  return new Date(Date.UTC(y, m, 1, 0, 0, 0) - 7 * 60 * 60 * 1000);
}

export default async function AdminDashboardPage() {
  const todayStart = startOfTodayBangkokUtc();
  const monthStart = startOfThisMonthBangkokUtc();

  const [
    productCount,
    lastSynced,
    todayOrders,
    monthOrders,
    statusCounts,
    recentOrders,
    ridersRaw,
    pendingApplicationCount,
  ] = await Promise.all([
    prisma.syncedProduct.count(),
    prisma.syncedProduct.findFirst({ orderBy: { lastSyncedAt: "desc" }, select: { lastSyncedAt: true } }),
    prisma.order.findMany({
      where: { createdAt: { gte: todayStart }, status: { not: "CANCELLED" } },
      select: { totalAmount: true, deliveryFee: true },
    }),
    prisma.order.findMany({
      where: { createdAt: { gte: monthStart }, status: { not: "CANCELLED" } },
      select: { totalAmount: true, deliveryFee: true },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: true },
    }),
    prisma.rider.findMany({
      where: { isActive: true },
      include: {
        orders: {
          where: { status: "SHIPPED" },
          select: {
            riderCommission: true,
            commissionSettled: true,
            paymentMethod: true,
            totalAmount: true,
            deliveryFee: true,
            codRemitted: true,
          },
        },
      },
    }),
    prisma.riderApplication.count({ where: { status: "PENDING" } }),
  ]);

  const todayRevenue = todayOrders.reduce((s, o) => s + Number(o.totalAmount) + Number(o.deliveryFee ?? 0), 0);
  const monthRevenue = monthOrders.reduce((s, o) => s + Number(o.totalAmount) + Number(o.deliveryFee ?? 0), 0);

  const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all]));

  const onlineRiderCount = ridersRaw.filter(isRiderOnline).length;
  let totalUnsettledCommission = 0;
  let totalUnsettledCod = 0;
  let ridersMissingBank = 0;
  const riderSummaries = ridersRaw.map((r) => {
    const unsettledCommission = r.orders
      .filter((o) => !o.commissionSettled)
      .reduce((s, o) => s + Number(o.riderCommission ?? 0), 0);
    const unsettledCod = r.orders
      .filter((o) => o.paymentMethod === "COD" && !o.codRemitted)
      .reduce((s, o) => s + Number(o.totalAmount) + Number(o.deliveryFee ?? 0), 0);
    totalUnsettledCommission += unsettledCommission;
    totalUnsettledCod += unsettledCod;
    if (!r.bankAccountNumber) ridersMissingBank += 1;
    return {
      id: r.id,
      name: r.name,
      online: isRiderOnline(r),
      unsettledCommission,
      unsettledCod,
      bankName: r.bankName,
      bankAccountNumber: r.bankAccountNumber,
      bankAccountName: r.bankAccountName,
    };
  });
  const ridersWithPayout = riderSummaries
    .filter((r) => r.unsettledCommission > 0 || r.unsettledCod > 0)
    .sort((a, b) => b.unsettledCommission + b.unsettledCod - (a.unsettledCommission + a.unsettledCod));

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">ภาพรวม</h1>
      <p className="mb-4 text-sm text-gray-500">สรุปยอดขาย ออเดอร์ และม้าเร็วทั้งหมดในหน้าเดียว</p>

      {/* แถวยอดขาย */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">ยอดขายวันนี้</p>
          <p className="text-2xl font-bold text-green-700">฿{baht(todayRevenue)}</p>
          <p className="text-xs text-gray-400">{todayOrders.length} ออเดอร์</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">ยอดขายเดือนนี้</p>
          <p className="text-2xl font-bold text-green-700">฿{baht(monthRevenue)}</p>
          <p className="text-xs text-gray-400">{monthOrders.length} ออเดอร์</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">รอชำระ/รอดำเนินการ</p>
          <p className="text-2xl font-bold text-amber-600">{statusMap.PENDING_PAYMENT ?? 0}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">กำลังจัดส่ง/เสร็จแล้ว</p>
          <p className="text-2xl font-bold text-blue-600">
            {(statusMap.PAID ?? 0) + (statusMap.SHIPPED ?? 0)}
          </p>
        </div>
      </div>

      {/* แถวม้าเร็ว */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">ม้าเร็วสแตนบายตอนนี้</p>
          <p className="text-2xl font-bold text-green-700">
            {onlineRiderCount} <span className="text-sm font-normal text-gray-400">/ {ridersRaw.length} คน</span>
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">ค่าวิ่งงานค้างจ่าย</p>
          <p className="text-2xl font-bold text-amber-600">฿{baht(totalUnsettledCommission)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">เงินสด COD ค้างนำส่ง</p>
          <p className="text-2xl font-bold text-amber-600">฿{baht(totalUnsettledCod)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">ใบสมัครม้าเร็วรอตรวจ</p>
          <p className="text-2xl font-bold text-gray-800">{pendingApplicationCount}</p>
        </div>
      </div>

      {/* ค้างจ่ายม้าเร็ว — พร้อมบัญชีธนาคารสำหรับโอน */}
      {ridersWithPayout.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-white p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">ม้าเร็วที่ต้องจ่ายเงิน</h2>
            <Link href="/admin/riders" className="text-xs font-semibold text-green-700 hover:underline">
              ไปหน้าจัดการคนขับ →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-1.5 pr-3">ชื่อ</th>
                  <th className="py-1.5 pr-3">ค่าวิ่งงานค้างจ่าย</th>
                  <th className="py-1.5 pr-3">เงินสด COD ค้างนำส่ง</th>
                  <th className="py-1.5">บัญชีโอน</th>
                </tr>
              </thead>
              <tbody>
                {ridersWithPayout.map((r) => (
                  <tr key={r.id} className="border-t border-gray-100">
                    <td className="py-1.5 pr-3 font-medium">{r.name}</td>
                    <td className="py-1.5 pr-3 text-amber-600 font-semibold">
                      {r.unsettledCommission > 0 ? `฿${baht(r.unsettledCommission)}` : "—"}
                    </td>
                    <td className="py-1.5 pr-3 text-amber-600 font-semibold">
                      {r.unsettledCod > 0 ? `฿${baht(r.unsettledCod)}` : "—"}
                    </td>
                    <td className="py-1.5 text-gray-500">
                      {r.bankAccountNumber ? (
                        `🏦 ${r.bankName} · ${r.bankAccountNumber} · ${r.bankAccountName}`
                      ) : (
                        <span className="text-red-500">ยังไม่มีบัญชี — ต้องจ่ายเงินสดแทน</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {ridersMissingBank > 0 && (
            <p className="mt-2 text-xs text-red-500">
              ⚠️ มีม้าเร็ว {ridersMissingBank} คนยังไม่มีบัญชีธนาคารในระบบ — เพิ่มได้ที่หน้าจัดการคนขับ
            </p>
          )}
        </div>
      )}

      {/* ออเดอร์ล่าสุด */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-gray-700">ออเดอร์ล่าสุด</h2>
          <Link href="/admin/orders" className="text-xs font-semibold text-green-700 hover:underline">
            ดูทั้งหมด →
          </Link>
        </div>
        <div className="divide-y">
          {recentOrders.map((o) => (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-gray-50"
            >
              <div className="min-w-0">
                <p className="font-semibold text-gray-800">{o.orderNo}</p>
                <p className="truncate text-xs text-gray-400">
                  {o.customer.name} · {new Date(o.createdAt).toLocaleString("th-TH")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="font-semibold text-gray-700">
                  ฿{baht(Number(o.totalAmount) + Number(o.deliveryFee ?? 0))}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[o.status]}`}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </span>
              </div>
            </Link>
          ))}
          {recentOrders.length === 0 && (
            <p className="py-6 text-center text-gray-400">ยังไม่มีออเดอร์</p>
          )}
        </div>
      </div>

      {/* สินค้า */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">สินค้าที่ sync แล้ว</p>
          <p className="text-2xl font-semibold">{productCount}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">sync ล่าสุด</p>
          <p className="text-lg font-medium">
            {lastSynced?.lastSyncedAt
              ? new Date(lastSynced.lastSyncedAt).toLocaleString("th-TH")
              : "ยังไม่เคย sync"}
          </p>
        </div>
      </div>
    </div>
  );
}
