import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/admin/rider-applications/[id] — อนุมัติ (สร้าง Rider ให้อัตโนมัติ) หรือปฏิเสธ
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { action } = body as { action?: "approve" | "reject" };

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "action ต้องเป็น approve หรือ reject" }, { status: 400 });
  }

  const application = await prisma.riderApplication.findUnique({ where: { id } });
  if (!application) return NextResponse.json({ error: "ไม่พบใบสมัคร" }, { status: 404 });
  if (application.status !== "PENDING") {
    return NextResponse.json({ error: "ใบสมัครนี้ถูกตรวจสอบไปแล้ว" }, { status: 409 });
  }

  if (action === "reject") {
    const updated = await prisma.riderApplication.update({
      where: { id },
      data: { status: "REJECTED", reviewedAt: new Date() },
    });
    return NextResponse.json({ application: updated });
  }

  // approve — สร้างคนขับจากข้อมูลใบสมัคร (รวมบัญชีธนาคาร) ในทรานแซกชันเดียว
  const result = await prisma.$transaction(async (tx) => {
    const rider = await tx.rider.create({
      data: {
        name: application.name,
        phone: application.phone,
        bankName: application.bankName,
        bankAccountNumber: application.bankAccountNumber,
        bankAccountName: application.bankAccountName,
      },
    });
    const updated = await tx.riderApplication.update({
      where: { id },
      data: { status: "APPROVED", riderId: rider.id, reviewedAt: new Date() },
    });
    return { rider, application: updated };
  });

  return NextResponse.json(result);
}

// DELETE /api/admin/rider-applications/[id] — ลบใบสมัคร (ลบรูปบัตรประชาชนออกจากระบบ)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.riderApplication.delete({ where: { id } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
