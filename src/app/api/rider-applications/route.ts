import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyShop } from "@/lib/line";
import { namesMatch } from "@/lib/nameMatch";

// ~2MB base64 (รูปถูกบีบอัดฝั่ง client เหลือราว 100-400KB อยู่แล้ว — กันเฉพาะเคสยัดไฟล์ใหญ่ตรงๆ)
const MAX_IMAGE_LENGTH = 2_000_000;

// POST /api/rider-applications — สมัครม้าเร็ว (public ไม่ต้อง login)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, phone, idCardImage, bankName, bankAccountNumber, bankAccountName, note } = body as {
    name?: string;
    phone?: string;
    idCardImage?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    note?: string | null;
  };

  const cleanName = name?.trim();
  const cleanPhone = phone?.replace(/[^0-9]/g, "");
  const cleanBankName = bankName?.trim();
  const cleanBankAccountNumber = bankAccountNumber?.trim();
  const cleanBankAccountName = bankAccountName?.trim();

  if (!cleanName || !cleanPhone) {
    return NextResponse.json({ error: "กรุณากรอกชื่อและเบอร์โทรศัพท์" }, { status: 400 });
  }
  if (cleanPhone.length < 9 || cleanPhone.length > 10) {
    return NextResponse.json({ error: "เบอร์โทรศัพท์ไม่ถูกต้อง" }, { status: 400 });
  }
  if (!idCardImage?.startsWith("data:image/")) {
    return NextResponse.json({ error: "กรุณาแนบรูปบัตรประชาชน" }, { status: 400 });
  }
  if (idCardImage.length > MAX_IMAGE_LENGTH) {
    return NextResponse.json({ error: "รูปใหญ่เกินไป กรุณาลองใหม่อีกครั้ง" }, { status: 400 });
  }
  if (!cleanBankName || !cleanBankAccountNumber || !cleanBankAccountName) {
    return NextResponse.json({ error: "กรุณากรอกข้อมูลบัญชีธนาคารให้ครบ" }, { status: 400 });
  }
  // บัญชีต้องเป็นของผู้สมัครเองเท่านั้น — กันโอนค่าวิ่งงานผิดคน
  if (!namesMatch(cleanName, cleanBankAccountName)) {
    return NextResponse.json(
      { error: "ชื่อบัญชีธนาคารต้องตรงกับชื่อผู้สมัคร (ต้องเป็นบัญชีของคุณเองเท่านั้น)" },
      { status: 400 }
    );
  }

  // กันสมัครซ้ำ: มีใบสมัครรอตรวจอยู่แล้ว หรือเป็นคนขับในระบบอยู่แล้ว
  const [pending, existingRider] = await Promise.all([
    prisma.riderApplication.findFirst({ where: { phone: cleanPhone, status: "PENDING" } }),
    prisma.rider.findFirst({ where: { phone: cleanPhone } }),
  ]);
  if (pending) {
    return NextResponse.json(
      { error: "เบอร์นี้มีใบสมัครรอตรวจสอบอยู่แล้ว ทางร้านจะติดต่อกลับทาง LINE" },
      { status: 409 }
    );
  }
  if (existingRider) {
    return NextResponse.json(
      { error: "เบอร์นี้เป็นคนขับในระบบอยู่แล้ว หากลืมลิงก์รับงานให้ทักร้านทาง LINE" },
      { status: 409 }
    );
  }

  const application = await prisma.riderApplication.create({
    data: {
      name: cleanName,
      phone: cleanPhone,
      idCardImage,
      bankName: cleanBankName,
      bankAccountNumber: cleanBankAccountNumber,
      bankAccountName: cleanBankAccountName,
      note: note?.trim() || null,
    },
  });

  await notifyShop(
    `🏍️ มีผู้สมัครม้าเร็วใหม่\nชื่อ: ${cleanName}\nเบอร์: ${cleanPhone}${note?.trim() ? `\nหมายเหตุ: ${note.trim()}` : ""}\n\nตรวจสอบและอนุมัติได้ที่เมนู "คนขับ (ม้าเร็ว)" ในหน้าแอดมิน`
  ).catch(() => {});

  return NextResponse.json({ ok: true, applicationId: application.id });
}
