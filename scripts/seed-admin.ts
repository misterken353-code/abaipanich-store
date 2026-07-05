/**
 * seed-admin.ts — สร้างบัญชีผู้ดูแลระบบตัวแรก
 * รัน: npx tsx scripts/seed-admin.ts <email> <password> <name>
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const [email, password, name] = process.argv.slice(2);
  if (!email || !password) {
    console.error("ใช้งาน: npx tsx scripts/seed-admin.ts <email> <password> [name]");
    process.exit(1);
  }

  const hashed = await bcrypt.hash(password, 10);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    create: { email, password: hashed, name: name ?? "Admin" },
    update: { password: hashed, name: name ?? "Admin" },
  });

  console.log(`✅ สร้าง/อัปเดต admin: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error("❌", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
