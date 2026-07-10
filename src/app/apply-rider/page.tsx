import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import ApplyRiderForm from "./ApplyRiderForm";

export const metadata: Metadata = {
  title: "สมัครม้าเร็ว (คนขับส่งของ) — สบายพาณิชย์",
  description: "สมัครเป็นคนขับม้าเร็วส่งของกับร้านสบายพาณิชย์ รับงานผ่านมือถือ กดรับงานเองได้",
};

export const dynamic = "force-dynamic";

export default async function ApplyRiderPage() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <h1 className="mb-1 text-2xl font-semibold text-green-800">สมัครม้าเร็ว 🏍️</h1>
      <p className="mb-6 text-sm text-gray-500">
        สมัครเป็นคนขับส่งของกับร้านสบายพาณิชย์ — กรอกข้อมูล แนบรูปบัตรประชาชน
        แล้วเพิ่มเพื่อน LINE ของร้านเพื่อคุยรายละเอียดงานต่อได้เลย
      </p>
      <ApplyRiderForm lineOaUrl={settings?.lineOaUrl ?? null} />
    </div>
  );
}
