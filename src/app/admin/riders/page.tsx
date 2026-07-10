import { prisma } from "@/lib/prisma";
import RidersManager from "./RidersManager";
import ApplicationsPanel from "./ApplicationsPanel";
import RecruitShareCard from "./RecruitShareCard";

export default async function AdminRidersPage() {
  const [ridersRaw, recentMessages, pendingApplications] = await Promise.all([
    prisma.rider.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        orders: {
          where: { status: "SHIPPED" },
          select: {
            riderRating: true,
            riderCommission: true,
            commissionSettled: true,
            paymentMethod: true,
            totalAmount: true,
            codRemitted: true,
          },
        },
      },
    }),
    prisma.lineMessageLog.findMany({
      where: { direction: "IN" },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.riderApplication.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const applications = pendingApplications.map((a) => ({
    id: a.id,
    name: a.name,
    phone: a.phone,
    idCardImage: a.idCardImage,
    note: a.note,
    createdAt: a.createdAt.toISOString(),
  }));

  const riders = ridersRaw.map((r) => {
    const rated = r.orders.filter((o) => o.riderRating != null);
    const avgRating = rated.length > 0 ? rated.reduce((s, o) => s + (o.riderRating ?? 0), 0) / rated.length : null;
    const unsettledCommission = r.orders
      .filter((o) => !o.commissionSettled)
      .reduce((s, o) => s + Number(o.riderCommission ?? 0), 0);
    const unsettledCod = r.orders
      .filter((o) => o.paymentMethod === "COD" && !o.codRemitted)
      .reduce((s, o) => s + Number(o.totalAmount), 0);
    return {
      id: r.id,
      name: r.name,
      phone: r.phone,
      lineUserId: r.lineUserId,
      accessToken: r.accessToken,
      isActive: r.isActive,
      commissionPerDelivery: Number(r.commissionPerDelivery),
      avgRating,
      ratedCount: rated.length,
      unsettledCommission,
      unsettledCod,
    };
  });

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold">คนขับ (ม้าเร็ว)</h1>
      <p className="mb-4 text-sm text-gray-500">
        เพิ่มคนขับแล้วกด &quot;คัดลอกลิงก์&quot; ส่งลิงก์ให้คนขับทาง LINE — คนขับเปิดลิงก์นั้นแล้วจะเห็นงานส่งที่ว่างอยู่
        กดรับงานเอง (แข่งกันแบบ Lalamove/Grab) และกดแจ้งจัดส่งสำเร็จได้เองโดยไม่ต้องล็อกอิน
      </p>
      <div className="space-y-6">
        <RecruitShareCard appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""} />
        <ApplicationsPanel applications={applications} />
        <RidersManager riders={riders} />
      </div>

      <div className="mt-6 max-w-xl rounded-xl border border-gray-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-gray-700">ข้อความล่าสุดที่มีคนทักบอท LINE</h2>
        <p className="mb-3 text-xs text-gray-400">
          ให้คนขับทักบอทของร้าน 1 ข้อความ แล้ว User ID จะปรากฏด้านล่างนี้ — คัดลอกไปใส่ตอนเพิ่มคนขับด้านบน
        </p>
        <div className="divide-y text-sm">
          {recentMessages.map((m) => (
            <div key={m.id} className="py-2">
              <p className="font-mono text-xs text-gray-500">{m.lineUserId}</p>
              <p className="text-gray-800">{m.message}</p>
              <p className="text-xs text-gray-400">{m.createdAt.toLocaleString("th-TH")}</p>
            </div>
          ))}
          {recentMessages.length === 0 && (
            <p className="py-6 text-center text-gray-400">ยังไม่มีข้อความเข้ามา</p>
          )}
        </div>
      </div>
    </div>
  );
}
