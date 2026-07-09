# SabaiPanich-Store — แผนโปรเจกต์ฉบับเต็ม (สำหรับ AI ที่มาทำงานต่อ)

> ไฟล์นี้คือ single source of truth ของโปรเจกต์นี้ อ่านทั้งหมดก่อนเริ่มเขียนโค้ดต่อ
> อัปเดตล่าสุด: 2026-07-05 (หลัง Phase 4-5 เสร็จ + แก้บั๊ก proxy.ts + sync ข้อมูลจริงแล้ว)

## เป้าหมายโปรเจกต์

ร้าน **สบายพาณิชย์** มีสต็อกสินค้า + รูปภาพอยู่แล้วในระบบ ERP เดิม ([GearGao-SaaS](../GearGao-SaaS)) เจ้าของร้านต้องการ **ระบบขายแยกต่างหาก** ที่เบาและเร็วสำหรับลูกค้าปลายทาง โดย flow ที่ต้องการคือ:

1. แอดมินเลือกสินค้าจากสต็อกจริง มาจัดเป็น "เพจขาย" (Sale Page)
2. กดโพสต์ขึ้น Facebook เพจ/ส่วนตัว **อัตโนมัติ** ผ่าน Graph API
3. ลูกค้าเข้าดูเพจขาย เลือกสินค้า กดสั่งซื้อผ่านหน้าเว็บ
4. ลูกค้าคุยกับร้านผ่าน **LINE OA** (Messaging API เต็มรูปแบบ ไม่ใช่แค่ลิงก์แชท)
5. ระบบสร้าง **PromptPay QR อัตโนมัติต่อออเดอร์** ให้ลูกค้าโอนเงิน

**นี่ไม่ใช่การต่อยอด ERP เดิม** — เป็นโปรเจกต์ Next.js ใหม่ทั้งหมด แยก database, แยก deploy, แยก auth คนละระบบกับ GearGao-SaaS โดยสิ้นเชิง

## ความสัมพันธ์กับ GearGao-SaaS (สำคัญ — อ่านให้เข้าใจ boundary)

โปรเจกต์นี้อยู่ที่ `E:\project\SabaiPanich-Store` เป็น **sibling folder** ของ `E:\project\GearGao-SaaS` (ERP เดิม, multi-tenant SaaS)

**กฎ boundary ที่ต้องรักษาไว้เสมอ:**
- ดึงข้อมูลจาก GearGao-SaaS **เฉพาะสต็อก + รูปภาพสินค้า** ผ่าน public API ที่มีอยู่แล้วเท่านั้น (ดูหัวข้อ "การ sync ข้อมูล" ด้านล่าง) — **ห้าม** query database ของ GearGao โดยตรง, ห้ามเพิ่ม dependency เชื่อม DB สองฝั่งเข้าด้วยกัน
- ข้อมูลลูกค้า/ออเดอร์/การชำระเงิน/Facebook/LINE เป็นของระบบนี้เองทั้งหมด ไม่ยุ่งกับ GearGao
- ถ้าจำเป็นต้องแก้โค้ดฝั่ง GearGao-SaaS (เช่นเคยแก้ `src/app/api/public/products/route.ts` เพิ่ม `image3Url`/`image4Url`) ให้แก้แบบ minimal ที่สุด แล้วบันทึกไว้ในไฟล์นี้ว่าแก้อะไรไปบ้าง

### org slug ของสบายพาณิชย์
```
GEARGAO_ORG_SLUG=สบายพาณิชย์
```
เป็นข้อความไทยล้วน (ชื่อ = slug ใน GearGao DB) — **ต้อง `encodeURIComponent()` เสมอ** ตอนต่อ query string

### การ sync ข้อมูลสต็อก/รูป (Phase 2 — เสร็จแล้ว)
- เรียก `GET {GEARGAO_PUBLIC_API_URL}?slug={encodeURIComponent(GEARGAO_ORG_SLUG)}`
- Endpoint จริง: [E:\project\GearGao-SaaS\src\app\api\public\products\route.ts](../GearGao-SaaS/src/app/api/public/products/route.ts) — public, ไม่ต้อง login, เปิด CORS แล้ว
- คืนค่า `{ store, products (พร้อมส่ง), preOrderProducts (สั่งจอง), total, totalPreOrder }` แต่ละตัวมี `id, code, name, description, categoryName, unitName, salePrice, image1Url..image4Url, availableQty`
- ฝั่งนี้ upsert เข้า `SyncedProduct` โดย match ด้วย `sourceId` (= product.id ฝั่ง GearGao) — ดู [src/app/api/sync/route.ts](src/app/api/sync/route.ts)
- Trigger: ปุ่ม "Sync สต็อก/รูปตอนนี้" ที่ `/admin/products` (manual). **ยังไม่มี** cron อัตโนมัติ — ถ้าจะเพิ่ม ใช้ Vercel Cron เรียก endpoint เดียวกันนี้เป็นราย ชม.

## Tech Stack (mirror จาก GearGao-SaaS เพื่อความคุ้นเคย)

- Next.js **16.2.7** (App Router, Turbopack) — ⚠️ **นี่ไม่ใช่ Next.js เวอร์ชันที่ training data รู้จัก** มี breaking changes เยอะ (async `params`/`searchParams`/`cookies`/`headers`, `middleware.ts` → `proxy.ts` + export ชื่อ `proxy`, `images.remotePatterns` แทน `domains`, top-level `turbopack` config ใน next.config.ts) **ก่อนเขียนโค้ด Next.js ใหม่ ให้เช็ค `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` ก่อนเสมอ**
- TypeScript, Prisma **7.8** (ใช้ `prisma.config.ts` สำหรับ datasource url — **ไม่ใช่** `url = env(...)` ใน schema.prisma แบบเก่า), Postgres
- Tailwind CSS v4 (import แบบ `@import "tailwindcss";` ใน globals.css)
- NextAuth v5 beta — **single-admin** เท่านั้น (ไม่ multi-tenant, ไม่มี role, ไม่มี organizationId แบบ GearGao)
- `promptpay-qr` + `qrcode` — ใช้สร้าง QR (pattern เดียวกับ GearGao's POS)
- `@vercel/blob` — สำหรับอัปโหลดสลิปโอนเงิน (Phase 4)

## โครงสร้างไฟล์ปัจจุบัน

| ไฟล์ | หน้าที่ |
|------|---------|
| `prisma/schema.prisma` | Schema เต็มทุก model (รวม Phase 3-7 ที่ยังไม่ implement UI) |
| `prisma.config.ts` | Datasource URL config (Prisma 7 pattern) |
| `src/lib/prisma.ts` | Prisma client singleton (adapter-pg, mirror GearGao) |
| `src/lib/auth.ts` | NextAuth config — single AdminUser, credentials (email+password) |
| `src/proxy.ts` | ป้องกันเฉพาะ `/admin/*` (เช็ค next-auth session cookie) |
| `src/types/next-auth.d.ts` | Type augmentation สำหรับ session.user.id |
| `src/app/layout.tsx`, `globals.css` | Root layout, ฟอนต์ Sarabun, Tailwind |
| `src/app/page.tsx` | หน้าแรก — **catalog หลัก** ดึงสินค้าทั้งหมดจาก `SyncedProduct` (server component) ส่งให้ `StorefrontClient` |
| `src/app/StorefrontClient.tsx` | Client component ของหน้าแรก — แท็บพร้อมส่ง/Pre-order, ค้นหา, filter หมวดหมู่ (แบบเดียวกับ [GearGao-SaaS/src/app/store/[slug]/page.tsx](../GearGao-SaaS/src/app/store/%5Bslug%5D/page.tsx)) |
| `src/app/login/page.tsx` | หน้า login แอดมิน (client component, เรียก `signIn` จาก next-auth/react) |
| `src/app/admin/layout.tsx` | Layout แอดมิน (เช็ค session, sidebar nav, sign out) |
| `src/app/admin/page.tsx` | Dashboard ภาพรวม (จำนวนสินค้า, sync ล่าสุด) |
| `src/app/admin/products/page.tsx` + `SyncButton.tsx` | ตารางสินค้าที่ sync มาแล้ว + ปุ่ม sync |
| `src/app/admin/sale-pages/page.tsx` + `NewSalePageButton.tsx` | list เพจขายทั้งหมด + ปุ่มสร้างเพจใหม่ |
| `src/app/admin/sale-pages/[id]/page.tsx` + `SalePageEditor.tsx` | แก้ไขเพจ: ชื่อ/slug/cover/description/isActive, ค้นหา+เพิ่ม/ลบ/เรียงลำดับสินค้าจาก `SyncedProduct`, ตั้ง priceOverride/caption ต่อรายการ |
| `src/app/p/[slug]/page.tsx` | **public**, storefront แสดงสินค้าใน `SalePage` ที่ `isActive` (ราคาใช้ priceOverride ถ้ามี, badge พร้อมส่ง/สั่งจอง) |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth handler |
| `src/app/api/sync/route.ts` | POST — ดึงสต็อก/รูปจาก GearGao มา upsert `SyncedProduct` |
| `src/app/api/admin/sale-pages/route.ts` | GET (list) / POST (สร้างเพจใหม่ ว่างเปล่า, slug auto-gen) |
| `src/app/api/admin/sale-pages/[id]/route.ts` | GET (รายละเอียด+items) / PATCH (อัปเดต meta + แทนที่ items ทั้งหมด, validate slug ซ้ำ) / DELETE |
| `scripts/seed-admin.ts` | `npx tsx scripts/seed-admin.ts <email> <password> [name]` สร้าง/อัปเดตแอดมิน |
| `.env.example` | รายการ env var ทั้งหมดที่ต้องตั้งค่า (คัดลอกเป็น `.env`) |

## Environment Variables

ดู [.env.example](.env.example) ทั้งหมด — สรุปที่สำคัญ:

| ตัวแปร | ใช้ทำอะไร | ตั้งไว้หรือยัง |
|--------|-----------|---------------|
| `DATABASE_URL`, `DIRECT_URL` | Postgres (Supabase ใหม่ แยกจาก GearGao) | ❌ ยังเป็น placeholder — **ต้องสร้าง Supabase project ใหม่** |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | NextAuth | ❌ placeholder |
| `GEARGAO_PUBLIC_API_URL` | URL ของ GearGao ที่ deploy จริง + `/api/public/products` | ❌ ต้องใส่ (เช่น `https://geargao-saas.vercel.app/api/public/products`) |
| `GEARGAO_ORG_SLUG` | `สบายพาณิชย์` | ✅ รู้ค่าแล้ว |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (สลิปโอนเงิน) | ❌ Phase 4 |
| `PROMPTPAY_ID` | เลข PromptPay รับเงิน | ✅ ตั้งแล้ว (0807673617) ทั้ง local .env และ Vercel production, ทดสอบ generate QR จริงสำเร็จ |
| `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN` | Graph API auto-post | ❌ Phase 6 — ต้องสร้าง FB App เอง |
| `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN` | LINE OA Messaging API | 🔄 โค้ดพร้อมแล้ว, ตั้งค่าได้ที่ `/admin/settings` แทน env var — รอ user สร้าง LINE Channel (ดู Phase 7) |

## Data Model (Prisma) — schema เขียนไว้ครบแล้ว รอ implement UI/logic

ดู [prisma/schema.prisma](prisma/schema.prisma) ทั้งไฟล์ ตารางย่อสรุปตามการใช้งาน:

| Model | Phase ที่ใช้ | หมายเหตุ |
|-------|-------------|----------|
| `AdminUser` | 1 (เสร็จ) | single-admin, ไม่มี role |
| `SyncedProduct` | 2 (เสร็จ) | cache จาก GearGao, match ด้วย `sourceId` |
| `SalePage` / `SalePageItem` | 3 | แอดมินคัดสินค้าจาก `SyncedProduct` มาจัดเพจ, `SalePageItem.priceOverride`/`caption` ให้ปรับราคา/ข้อความเฉพาะเพจได้ |
| `Customer` | 4 | ลูกค้าปลายทาง — ไม่มี login, กรอกตอน checkout |
| `Order` / `OrderItem` | 4 | `OrderItem` เก็บ **snapshot** ชื่อ/ราคา ณ ตอนสั่งซื้อ (ไม่อ้างอิงราคาปัจจุบันของ `SyncedProduct` เพราะราคาอาจเปลี่ยนภายหลัง) |
| `FacebookPost` | 6 | log การโพสต์ต่อ `SalePage` |
| `LineMessageLog` | 7 | log ข้อความเข้า/ออก ผูกกับ `orderId`/`lineUserId` |
| `AppSettings` | 4, 6, 7 | singleton row (`id: "singleton"`) เก็บ PromptPay ID, FB/LINE credentials ที่ตั้งในหน้า admin (ทางเลือกแทน env var — ยังไม่ได้ implement หน้า settings) |

## สถานะปัจจุบัน

### ✅ Phase 1 — Scaffold (เสร็จ)
- โปรเจกต์ Next.js + Prisma + Tailwind + NextAuth ตั้งค่าเสร็จ, `npx next build` และ `npx tsc --noEmit` ผ่านสะอาด
- Single-admin login ที่ `/login`, ป้องกัน `/admin/*` ผ่าน `src/proxy.ts`

### ✅ Phase 2 — Stock/Image Sync (เสร็จ)
- `/api/sync` (POST, ต้อง login) ดึงจาก GearGao public API มา upsert `SyncedProduct`
- `/admin/products` แสดงตารางสินค้า + ปุ่ม sync

### ✅ Phase 3 — Sale Page Builder + Public Storefront (เสร็จ)
**เป้าหมาย:** แอดมินเลือกสินค้าจาก `SyncedProduct` มาจัดเป็น `SalePage` แล้วลูกค้าเข้าดูได้ที่ `/p/[slug]` (สั่งซื้อได้แล้วตั้งแต่ต่อเข้ากับ cart ใน Phase 4 — ดู `SalePageClient.tsx`)

- `/admin/sale-pages` — list + สร้างเพจใหม่ (slug auto-gen แบบ `page-<timestamp36>`, แก้เป็นชื่ออ่านง่ายทีหลังได้)
- `/admin/sale-pages/[id]` (`SalePageEditor.tsx`, client component) — แก้ title/slug/description/coverUrl/isActive, ค้นหาสินค้าจาก `SyncedProduct` แล้วเพิ่มเข้าเพจ, เรียงลำดับด้วยปุ่มขึ้น/ลง (เก็บเป็น `sortOrder`), ตั้ง `priceOverride`/`caption` ต่อรายการ, ปุ่มบันทึก (PATCH) และลบเพจ (DELETE)
- API `/api/admin/sale-pages` (GET/POST) และ `/api/admin/sale-pages/[id]` (GET/PATCH/DELETE) — ทุก endpoint เช็ค `auth()`. PATCH validate slug (`a-z0-9-` เท่านั้น + ไม่ซ้ำ) และแทนที่ `SalePageItem` ทั้งหมดในทรานแซกชันเดียว (`prisma.$transaction`: deleteMany แล้ว createMany ใหม่ตาม items ที่ส่งมา)
- `/p/[slug]` — **public**, ไม่ผ่าน `auth()`, `notFound()` ถ้าไม่เจอเพจหรือ `isActive` เป็น false, แสดงรูป/ชื่อ/ราคา (ใช้ `priceOverride` ถ้ามี) และ badge พร้อมส่ง/สั่งจองจาก `isPreOrder`
- ยืนยันแล้วว่า `src/proxy.ts` matcher จำกัดแค่ `/admin/:path*` จริง จึงไม่ต้องแก้อะไรเพื่อเปิด `/p` เป็น public
- ใช้ `<img>` ธรรมดา (ไม่ใช่ `next/image`) ทั้งใน editor และ storefront ให้ตรง convention เดิมที่ `/admin/products` ใช้อยู่แล้ว — เพราะไม่ทราบแน่ชัดว่า `SyncedProduct.image*Url` มาจาก host ไหนบ้าง (next/image จะ error ถ้า host ไม่อยู่ใน `remotePatterns`)
- ยังไม่ได้ implement: อัปโหลดรูป cover เอง (ตอนนี้กรอก URL ตรงๆ), drag-and-drop reorder (ใช้ปุ่มขึ้น/ลงแทน)
- ตรวจแล้วด้วย `npx tsc --noEmit` และ `npx next build` ผ่านสะอาดทั้งคู่

### ✅ หน้าแรก (`/`) — Catalog หลักพร้อมหมวดหมู่ (เสร็จ, นอกเหนือ phase plan เดิม)
**เป้าหมาย:** ลูกค้าเข้าเว็บแล้วเห็นสินค้าทั้งหมดทันที ไม่ต้องรอแอดมินสร้าง Sale Page ก่อน — เดิมหน้าแรกเป็น placeholder เฉยๆ

- `src/app/page.tsx` (server component) ดึง `SyncedProduct` ทั้งหมด, `Number()` ทุก Decimal ก่อนส่งให้ client
- `src/app/StorefrontClient.tsx` (client component) — แท็บ "สินค้าพร้อมส่ง" / "สั่งจอง (Pre-order)" (แยกจาก `isPreOrder`), ค้นหาชื่อ/รหัส, filter หมวดหมู่แบบ pill (ทำเฉพาะหมวดที่มีในแท็บนั้น), การ์ดสินค้าแสดงรูป/ราคา/badge คงเหลือ — โครงสร้าง UI copy มาจาก GearGao's `/store/[slug]` ที่พิสูจน์แล้วว่าใช้งานได้ดี
- **✅ แก้แล้ว (2026-07-05):** GearGao-SaaS's public API + `/store/[slug]` ถูก commit/push/deploy แล้ว, sync สำเร็จ **239 รายการ** เข้า `SyncedProduct`
- **⚠️ คุณภาพข้อมูลจากต้นทาง (GearGao-SaaS) ยังมีปัญหา ณ ตอน sync:** จาก 239 รายการ — **171 รายการ (72%) salePrice = 0**, **194 รายการ (81%) ถูกจัดหมวดเป็น "เครื่องดื่ม" ทั้งหมดอย่างผิดๆ** (กะปิ/ปลากระป๋อง/เทียนไข ก็โดนจัดเป็นเครื่องดื่ม — เข้าใจว่ามาจาก script `scripts/import-invoice-yongsanguan.ts` ฝั่ง GearGao ที่ import ไม่ได้ตั้งหมวดจริง), มีรูปแค่ 69/239 (29%) **ต้องไปแก้ราคา/หมวดหมู่ที่ฝั่ง GearGao-SaaS ก่อนถือว่า "พร้อมขายจริง"** แล้ว sync ใหม่ (ปุ่ม sync ที่ `/admin/products` เป็น upsert อยู่แล้ว รันซ้ำได้ปลอดภัย)

### ✅ Phase 4 — Cart + Checkout + Order + PromptPay QR (เสร็จ, 2026-07-05)
- `src/lib/cart.ts` — cart แบบ client-side ล้วน (`localStorage` key `sabaipanich-cart`, ไม่ใช้ React Context เพราะแต่ละหน้าโหลด cart เองตอน mount) มี `getCart/saveCart/cartCount/cartTotal`
- `StorefrontClient.tsx` — ปุ่ม "+ ใส่ตะกร้า" ต่อการ์ดสินค้า + floating cart bar (fixed bottom) แสดงจำนวน/ยอดรวม ลิงก์ไป `/cart`
- `src/app/cart/page.tsx` — client component, ปรับจำนวน/ลบสินค้า, ไปต่อที่ `/checkout`
- `src/app/checkout/page.tsx` — ฟอร์ม ชื่อ/เบอร์/ที่อยู่/LINE ID/หมายเหตุ → POST `/api/orders`
- `src/app/api/orders/route.ts` (POST, public) — validate สินค้า+จำนวนคงเหลือ (soft check `availableQty >= qty`, ไม่ตัดสต็อกจริงเพราะสต็อกอยู่ฝั่ง GearGao), find-or-create `Customer` ด้วยเบอร์โทร, orderNo = `SP{YYYYMMDD}{running 4 หลัก}` (นับจาก `Order.count` วันนั้นในทรานแซกชันเดียวกับการสร้าง order — มี race window เล็กน้อยถ้าออเดอร์พร้อมกันมากๆ ยอมรับความเสี่ยงนี้เพราะร้านเล็ก), สร้าง `Order`+`OrderItem` (snapshot name/price), ถ้ามี `PROMPTPAY_ID` (env หรือ `AppSettings.promptPayId`) จะ generate QR ด้วย `promptpay-qr`+`qrcode` ทันที — **ถ้ายังไม่ตั้ง PROMPTPAY_ID ออเดอร์ก็ยังสร้างได้ปกติ แค่ไม่มี QR** (ดูด้านล่าง)
- `src/app/order/[orderNo]/page.tsx` — public, แสดงสรุปออเดอร์+สถานะ, ถ้ามี `promptPayQr` โชว์ QR ให้สแกน ถ้าไม่มีโชว์ข้อความ "ทางร้านจะติดต่อกลับเพื่อแจ้งช่องทางชำระเงิน" แทน (fallback ที่ตั้งใจไว้ เพราะ `PROMPTPAY_ID` ยังว่างอยู่ตอนเขียนฟีเจอร์นี้)
- ✅ `PROMPTPAY_ID` = 0807673617 ตั้งค่าแล้วทั้ง local .env และ Vercel production env var (redeploy แล้ว), ทดสอบยิง POST /api/orders จริงบน production ยืนยันว่า generate QR สำเร็จ (ลบ order ทดสอบออกจาก DB แล้ว)
- **ยังไม่ได้ทำ:** อัปโหลดสลิปโอนเงิน (`@vercel/blob`) เพราะ `BLOB_READ_WRITE_TOKEN` ยังว่างอยู่ — รอ user เตรียม
- ทดสอบ flow เต็ม (เพิ่มของ→ตะกร้า→checkout→สร้างออเดอร์→ดูใน admin) ผ่าน dev server แล้ว, ลบ order/customer ทดสอบออกจาก DB จริงหลังตรวจสอบเสร็จ
- **2026-07-08:** `/p/[slug]` เดิมเป็นแค่แคตตาล็อกอย่างเดียว ไม่มีปุ่มใส่ตะกร้า (ตกหล่นตอนต่อ Phase 4 เข้ากับหน้าแรก ไม่ได้ต่อเข้า sale page ด้วย) — เพิ่ม `src/app/p/[slug]/SalePageClient.tsx` (client component reuse `src/lib/cart.ts` เดียวกับ `StorefrontClient.tsx` — ปุ่ม "+ ใส่ตะกร้า" + floating cart bar ลิงก์ `/cart`) ทดสอบผ่าน dev server ด้วย sale page จริง (`page-mrarahq0`) ยืนยันว่าเพิ่มสินค้าแล้วไปโผล่ที่ `/cart` ถูกต้อง ก่อนแก้เคยมี AI เซสชันอื่น (ไม่มี filesystem access, ใช้ GitHub API ดูโค้ดแทน) เข้าใจผิดว่าทั้งเว็บไม่มีระบบสั่งซื้อเลยและเสนอให้สร้าง checkout modal ซ้ำซ้อนอันใหม่ทั้งหมด — **ไม่ได้ใช้แนวทางนั้น** เพราะจะทำให้มี 2 ระบบ checkout ไม่ตรงกัน

### ✅ วิธีชำระเงิน 2 แบบ (เสร็จ, 2026-07-05)
**เป้าหมาย:** ให้ลูกค้าเลือกจ่ายตอนรับของ (COD) หรือโอนผ่าน PromptPay ตอน checkout แทนที่จะ generate QR ให้ทุกออเดอร์เสมอ

- Schema: เพิ่ม `enum PaymentMethod { COD TRANSFER }` และ `Order.paymentMethod` (default `TRANSFER` — คงพฤติกรรมเดิมไว้เป็นค่าเริ่มต้น)
- `src/app/checkout/page.tsx` — เพิ่ม radio วิธีชำระเงิน 2 ตัวเลือกต่อจากวิธีจัดส่ง: **โอนเงินผ่าน PromptPay** (ค่าเริ่มต้น) กับ **จ่ายตอนรับของ**
- `src/app/api/orders/route.ts` — validate `paymentMethod`, ถ้าเป็น `COD` จะ**ไม่ generate QR เลย**แม้จะตั้ง `PROMPTPAY_ID` ไว้แล้วก็ตาม (เงื่อนไข `paymentMethod === "TRANSFER" && promptPayId`), ข้อความแจ้ง LINE ร้าน (`notifyShop`) จะระบุวิธีชำระเงินด้วยทุกครั้ง ("รอลูกค้าโอน (รอสลิป)" หรือ "จ่ายปลายทาง (เงินสด)")
- `src/app/order/[orderNo]/page.tsx` — ถ้า `paymentMethod === "COD"` โชว์การ์ด "ชำระเงินปลายทางเมื่อได้รับสินค้า" แทน QR เสมอ (ไม่สนใจว่ามี `promptPayQr` หรือไม่ เพราะ backend ไม่ generate ให้ COD อยู่แล้ว), ถ้าเป็น `TRANSFER` และมี QR จะโชว์ QR พร้อมข้อความเพิ่ม "📎 โอนเสร็จแล้ว กรุณาส่งสลิปยืนยันการชำระเงินให้ทางร้านทาง LINE" (ยังไม่มีปุ่มอัปโหลดสลิปในระบบ — ให้ส่งทางแชท LINE แทนตอนนี้ รอ Phase อัปโหลดสลิปจริง)
- อัปเดต `admin/orders` (list + detail) ให้แสดงคอลัมน์/บรรทัดวิธีชำระเงินด้วย
- ทดสอบทั้ง 2 flow จริงบน dev server (สร้างออเดอร์ COD และ TRANSFER แยกกัน เช็คหน้ายืนยันออเดอร์ถูกต้องทั้งคู่), ลบ order/customer ทดสอบออกจาก DB แล้ว

### ✅ ตัดช่อง LINE ID + จำข้อมูลลูกค้าเก่าอัตโนมัติ (เสร็จ, 2026-07-05)
**เป้าหมาย:** ลดขั้นตอนกรอกฟอร์ม checkout — ไม่ต้องพิมพ์ LINE ID เอง และถ้าเคยสั่งซื้อแล้วไม่ต้องพิมพ์ชื่อ/ที่อยู่ซ้ำ

- ตัดช่อง "LINE ID (ถ้ามี)" ออกจาก `checkout/page.tsx` ทั้งหมด — ไม่มีการกรอก lineUserId เองแล้ว (ดูหัวข้อ LIFF ด้านล่างว่าทำไมถึงยังดึงจาก LINE โดยตรงไม่ได้ตอนนี้)
- เพิ่ม `GET /api/customers/lookup?phone=` (public) คืนค่า `{ name, address, lineUserId }` ถ้าเจอ `Customer` ที่ตรงเบอร์ (ไม่คืนข้อมูลอ่อนไหวอื่น เช่น id หรือประวัติออเดอร์)
- `checkout/page.tsx` เรียง field ใหม่ให้ **เบอร์โทรศัพท์อยู่บนสุด** — พอ blur ช่องเบอร์ (`onBlur`) จะเรียก lookup API ทันที ถ้าเจอลูกค้าเดิม: prefill ชื่อ/ที่อยู่/lineUserId ให้ + โชว์ banner "✓ พบข้อมูลลูกค้าเดิม" **ช่องยังคงพิมพ์แก้ไขได้ตลอดแบบฟอร์มปกติ** (ลองทำ lock/gray + ปุ่ม "แก้ไขข้อมูล" แบบเดียวกับ `/admin/settings` ไปก่อน แต่ user ขอให้เอาออก เพราะไม่จำเป็นสำหรับฟอร์มสั้นๆ แบบนี้ — เก็บไว้เป็น reference ว่า pattern นี้เหมาะกับฟอร์ม settings ที่มีข้อมูลอ่อนไหว ไม่เหมาะกับฟอร์ม checkout ทั่วไป)
- ถ้าไม่เจอเบอร์ที่ตรง ฟอร์มทำงานแบบเดิมทุกอย่าง (กรอกชื่อ/ที่อยู่เองตามปกติ)
- ทดสอบจริงด้วยการ seed ลูกค้าเก่าเข้า DB แล้วพิมพ์เบอร์เดียวกันในฟอร์ม — prefill + lock ทำงานถูกต้อง, กด "แก้ไขข้อมูล" ปลดล็อกได้จริง, ลบข้อมูลทดสอบออกจาก DB แล้ว

**⚠️ สิ่งที่ยังทำไม่ได้ — ดึงชื่อจากโปรไฟล์ LINE โดยตรง (LIFF):**
User อยากให้ระบบดึงชื่อจากบัญชี LINE อัตโนมัติเมื่อเปิดเว็บผ่าน LINE (ไม่ต้องพิมพ์ชื่อเลย) — ลองสร้าง LIFF app ผ่าน Messaging API (`POST https://api.line.me/liff/v1/apps`) ด้วย Channel Access Token ที่มีอยู่แล้ว แต่ได้ error:
```
400 {"message":"Channel must have any of following Application Types: WEB, NATIVE_APP, LIFF, MINI_FIRST_PARTY_SAAS"}
```
แปลว่า Channel ปัจจุบัน (ที่สร้างไว้เป็น Messaging API channel ธรรมดา) ยังไม่ได้เปิดใช้ "Application Type" ที่รองรับ LIFF — จากการตรวจสอบ น่าจะต้องเพิ่มผ่านแท็บ **LIFF** ในหน้า Console ของ Channel (developers.line.biz → channel → แท็บ LIFF → กด Add) เป็นครั้งแรกด้วยตัวเอง (คล้ายกับปัญหาสวิตช์ "Use webhook" ที่เจอก่อนหน้านี้ — Console ทำ setup เบื้องหลังที่ API เรียกตรงๆ ไม่ได้) หลังจากมี LIFF app แรกแล้วน่าจะจัดการต่อผ่าน API ได้
**ถ้า user อยากทำต่อ:** เข้า Console → หา LIFF tab → เพิ่ม LIFF app เอง (หรือบอกผมว่าเจอ tab แล้ว ผมจะรอ liffId มาต่อโค้ด `@line/liff` SDK ให้), จากนั้นต้องเปลี่ยนลิงก์ rich menu ปุ่ม "เลือกซื้อสินค้า" เป็น `https://liff.line.me/{liffId}` แทน URL ตรงๆ ด้วย เพื่อให้ LINE เปิดผ่าน LIFF context จริง (ถึงจะดึง `liff.getProfile()` ได้)

### ✅ วิธีจัดส่ง 3 แบบ (เสร็จ, 2026-07-05)
**เป้าหมาย:** ให้ลูกค้าเลือกวิธีรับสินค้าตอน checkout แทนที่จะกรอกที่อยู่อย่างเดียว

- Schema: เพิ่ม `enum ShippingMethod { PICKUP MOTORCYCLE FREIGHT }` และฟิลด์ `Order.shippingMethod` (default `PICKUP`), `Order.shippingAddress` (String?, เก็บที่อยู่ต่อออเดอร์แทนที่จะพึ่ง `Customer.address` อย่างเดียว — แก้ latent bug เดิมที่ที่อยู่จาก checkout form ไม่ถูกบันทึกถ้าเบอร์โทรตรงกับลูกค้าเก่า), `Order.customerLat`/`Order.customerLng` (Float?)
- **⚠️ สำคัญ — `prisma db push` ค้างถ้าใช้ `DATABASE_URL` (pooled port 6543):** ต้องสั่งผ่าน direct connection แทน เช่น `npx prisma db push --accept-data-loss --url "<DIRECT_URL ค่าจริงจาก .env>"` (ใช้ `--url` flag override, ห้ามลืม `--accept-data-loss` ถ้ามีคำเตือน) — เจอปัญหานี้ระหว่างเซสชันนี้ ค้างไป 2 รอบก่อนจะลองสลับไปใช้ DIRECT_URL แล้วผ่านใน 2.3s พอดี
- `src/app/checkout/page.tsx` — radio 3 ตัวเลือก: **รับเองหน้าร้าน** (ไม่มีค่าส่ง), **เรียกม้าเร็วจัดส่ง** (โชว์ข้อความอัตราค่าส่ง "เริ่มต้น 15 บาท กม.แรก กม.ที่ 2 ขึ้นไป กม.ละ 5 บาท" + คำเตือนว่าค่าส่งไม่รวมยอดชำระ ชำระแยกให้คนขับ + ปุ่ม "แชร์โลเคชั่น" เรียก `navigator.geolocation.getCurrentPosition` เก็บ lat/lng), **จัดส่งทางขนส่ง** (ชำระค่าส่งปลายทาง) — ที่อยู่จัดส่งเป็น required เฉพาะ MOTORCYCLE/FREIGHT (ซ่อนไว้ถ้าเลือก PICKUP), บังคับต้องกดแชร์โลเคชั่นก่อน submit ถ้าเลือก MOTORCYCLE
- `src/app/api/orders/route.ts` — validate `shippingMethod` ต้องอยู่ใน enum, บันทึก `shippingAddress`/`customerLat`/`customerLng` ลง Order เสมอ (ไม่ใช่แค่ตอนสร้าง customer ใหม่)
- `src/app/order/[orderNo]/page.tsx` และ `src/app/admin/orders/[id]/page.tsx` — แสดงวิธีจัดส่ง + ข้อความอัตราค่าส่ง + ลิงก์ `https://www.google.com/maps?q=lat,lng` ถ้ามีพิกัด (เปิด Google Maps ให้เจ้าของร้าน/คนขับดูตำแหน่งได้ทันที)
- **ตั้งใจไม่รวมค่าส่งม้าเร็ว/ขนส่งเข้า `totalAmount` หรือ QR PromptPay** เพราะเป็นค่าใช้จ่ายที่ชำระแยกนอกระบบ (ให้คนขับ/บริษัทขนส่งโดยตรง) ไม่ใช่ยอดที่ร้านเก็บเอง — ถ้าในอนาคตต้องการให้ระบบคำนวณค่าส่งจริงตามระยะทาง จะต้องมีพิกัดร้าน + Google Maps Distance Matrix API (ยังไม่ได้ทำ)
- ทดสอบผ่าน dev server (mock geolocation + submit จริง) และ tsc/build ผ่านสะอาด

### ✅ หน้าแรกแบบเลือกหมวดหมู่ + Branding เรียบหรู (เสร็จ, 2026-07-05)
**เป้าหมาย:** หน้าแรกเดิมโชว์สินค้าทั้งหมด 239 รายการรวดเดียว (มีแค่ปุ่ม filter "ทั้งหมด") — user อยากให้ลูกค้าเลือกหมวดหมู่ก่อนถึงเห็นสินค้า และอยากได้ภาพลักษณ์ร้านที่ดูพรีเมียมขึ้น

- `StorefrontClient.tsx` เปลี่ยน state `selectedCategory` จาก default `"ทั้งหมด"` เป็น `null` — ตัดปุ่ม "ทั้งหมด" ออกจากกลุ่ม pill เดิมทั้งหมด (ไม่มี browse-all อีกต่อไป)
  - `selectedCategory === null && search ว่าง` → แสดง **grid การ์ดหมวดหมู่** (คำนวณจาก `categoryName` ของสินค้าจริงใน tab ปัจจุบัน ผ่าน `useMemo` — ถ้ามีหมวดใหม่เพิ่มเข้ามาจากการ sync ครั้งต่อไปจะโชว์อัตโนมัติทันทีไม่ต้องแก้โค้ด) แต่ละการ์ดโชว์รูปสินค้าตัวแรกที่เจอในหมวดนั้น + จำนวนรายการ, กดแล้วเข้าไปดูสินค้าของหมวดนั้น
  - เลือกหมวดแล้ว → โชว์ปุ่ม "← กลับไปหมวดหมู่" + grid สินค้าเดิม (component `ProductCard` ไม่เปลี่ยน)
  - ค้นหา (`search` ไม่ว่าง) → **ข้ามเรื่องหมวดหมู่ทั้งหมด** ค้นหาข้ามทุกหมวดใน tab ปัจจุบันเสมอ (มี "✕ ล้างการค้นหา" แทนปุ่มกลับ)
  - เปลี่ยน tab (พร้อมส่ง/Pre-order) จะ reset ทั้ง `search` และ `selectedCategory` กลับเป็นค่าเริ่มต้นเสมอ (แสดงหมวดหมู่ใหม่ของ tab นั้น)
- **Branding:** สร้าง `public/logo.png` (512x512, วงกลมพื้นเขียวเข้ม-ทอง ตัวอักษร "ส" ฟอนต์ Angsana New) และ `public/banner.png` (1600x500, กรอบเส้นทองมุม+เส้นคู่ กรอบชื่อร้าน "สบายพาณิชย์" + tagline) ด้วย `scripts/gen-brand.ts` (SVG → PNG ผ่าน `sharp`, ทดสอบแล้วว่า Angsana New render ภาษาไทยสวยและถูกต้อง)
  - `src/app/icon.png` (256x256, ใช้ logo เดียวกัน) — Next.js App Router **auto-detect ไฟล์ชื่อนี้เป็น favicon เอง** ไม่ต้องแก้ `metadata` ใน `layout.tsx`
  - `StorefrontClient.tsx` เปลี่ยน header จากแท่งสีเขียวเรียบเป็น `<img src="/banner.png">` เต็มความกว้าง (h-28 มือถือ / h-36 จอใหญ่, object-cover)
  - ยืนยันแล้วว่า asset ทั้งหมด deploy ขึ้น production จริง (`banner.png`/`logo.png`/`icon.png` ตอบ 200)
- **⚠️ โลโก้ LINE OA ยังไม่ได้ใส่ให้ — ไม่มี public API:** ตรวจสอบแล้วไม่พบ endpoint ใน LINE Messaging API สำหรับตั้งรูปโปรไฟล์ของ Official Account (ต่างจาก rich menu ที่มี endpoint อัปโหลดตรงๆ) — ต้องอัปโหลดเองผ่าน **LINE Official Account Manager → ตั้งค่า (Settings) → ตั้งค่าบัญชี (Account settings) → รูปโปรไฟล์** โดยดาวน์โหลดโลโก้จาก `https://abaipanich-store.vercel.app/logo.png` แล้วอัปโหลดเอง
- ทดสอบ flow เลือกหมวดหมู่/ย้อนกลับ/ค้นหา ผ่าน dev server ครบ (คลิกเข้าหมวด "เครื่องดื่ม" เห็น 194 รายการ, กดย้อนกลับเห็น grid หมวดหมู่ปกติ, ค้นหา "ปลากระป๋อง" ข้ามหมวดได้ผลลัพธ์ถูกต้อง), tsc/build ผ่านสะอาด
- **ขยาย container + footer (2026-07-05 รอบถัดมา):** container จาก `max-w-5xl` (1024px) เป็น `max-w-[1600px]` ทั้งหน้า, grid สูงสุด `lg:grid-cols-5 xl:grid-cols-6`, การ์ดสินค้า/หมวดหมู่ hover เงาเข้ม+ขอบทองบางๆ ให้เข้าธีม
- **Footer ปรับใหม่ทั้งหมด:** ใส่ที่อยู่จริง ("63 หมู่ 3 บ้านสบาย ต.รุ่งระวี อ.น้ำเกลี้ยง จ.ศรีสะเกษ 33130"), เบอร์โทร "095-612-3937" (เป็น `<a href="tel:...">` กดโทรได้จริงบนมือถือ), คำโปรย "🛵 สินค้าพร้อมส่งทุกรายการ รับเองที่หน้าร้าน หรือให้ม้าเร็ววิ่งส่งถึงมือคุณ" ในกรอบ pill สีทองโปร่งแสง, พื้นหลัง gradient เขียวเข้มเหมือน banner + กรอบมุมทองบางๆ 4 มุม, ชื่อร้านใช้ฟอนต์ **Noto Serif Thai** (Google Font, import เพิ่มใน `globals.css` เป็น class `.font-serif-th`) — **เลือกใช้ Noto Serif Thai แทน Angsana New ที่ใช้ใน logo/banner เพราะ Angsana New เป็นฟอนต์ระบบ Windows ไม่มีในมือถือ/เครื่องอื่น จะ fallback เป็นฟอนต์ default ถ้าใช้ตรงๆ ใน CSS เว็บ (ใช้ได้แค่ตอน render เป็นรูปภาพ server-side ด้วย sharp เท่านั้น)**

### ✅ Phase 5 — Admin Order Dashboard (เสร็จแบบย่อ, 2026-07-05)
- `src/app/admin/orders/page.tsx` — list ทุกออเดอร์ (ล่าสุดก่อน), แสดงลูกค้า/จำนวนรายการ/ยอดรวม/สถานะ
- `src/app/admin/orders/[id]/page.tsx` + `StatusButtons.tsx` (client) — รายละเอียดออเดอร์เต็ม + ปุ่มเปลี่ยนสถานะ (`PENDING_PAYMENT`/`PAID`/`SHIPPED`/`CANCELLED`)
- `src/app/api/admin/orders/[id]/route.ts` (PATCH) — อัปเดต status, เช็ค `auth()`
- เพิ่มลิงก์ "ออเดอร์ลูกค้า" ใน sidebar (`src/app/admin/layout.tsx`)
- **ยังไม่ได้ทำ:** filter by status ในหน้า list (ทำ list ธรรมดาไปก่อนเพราะยังมีออเดอร์น้อย)

### ✅ ปุ่ม "รับออเดอร์" + workflow เร็วขึ้นสำหรับแอดมิน (เสร็จ, 2026-07-05)
**เป้าหมาย:** แอดมินอยากมีปุ่มกด "รับออเดอร์" ที่แจ้งลูกค้าอัตโนมัติผ่าน LINE ว่าร้านรับออเดอร์แล้ว และอยากมีปุ่ม "บันทึก" ที่เด้งกลับไปหน้า list ให้จัดการออเดอร์ถัดไปเร็วขึ้น (ไม่ต้องกดลิงก์ sidebar เอง)

- Schema: เพิ่ม `Order.acknowledgedAt DateTime?` — ใช้เป็นทั้ง flag กันกดซ้ำ (idempotent) และ timestamp
- `src/app/api/admin/orders/[id]/acknowledge/route.ts` (POST, ต้อง `auth()`) — ถ้า `acknowledgedAt` มีค่าอยู่แล้วคืน `{alreadyAcknowledged:true}` ทันทีไม่ทำอะไรซ้ำ, ถ้ายัง set `acknowledgedAt = now()` แล้วถ้า `customer.lineUserId` มีค่า จะ `pushLineMessage(...)` ข้อความ "🙏 ร้านสบายพาณิชย์ได้รับออเดอร์ {orderNo} ของคุณแล้ว กำลังจัดเตรียมสินค้าให้นะคะ" — ถ้าลูกค้าไม่มี LINE ผูกไว้ก็ยัง mark ว่ารับแล้วได้ปกติ แค่ไม่ส่งข้อความ (คืนค่า `notified:false`)
- `AcknowledgeButton.tsx` (client) — ปุ่ม "📦 รับออเดอร์" → หลังกดสำเร็จเปลี่ยนเป็น "✓ รับออเดอร์แล้ว" (disabled ถาวร กันกดซ้ำฝั่ง UI ด้วย) พร้อมข้อความบอกว่าแจ้งลูกค้าสำเร็จหรือไม่ได้แจ้งเพราะไม่มี LINE
- `DoneButton.tsx` (client) — ปุ่ม "✓ บันทึกและไปดูออเดอร์ถัดไป" ท้ายหน้า **ไม่ได้เรียก API ใดๆ เพิ่ม** (สถานะ/รับออเดอร์ save ทันทีตั้งแต่กดปุ่มของมันเองอยู่แล้ว) แค่ `router.push("/admin/orders")` ให้ไหลลื่นไปทำรายการถัดไป
- `src/app/admin/orders/page.tsx` เพิ่มคอลัมน์ "รับแล้ว" แสดง ✓ (เขียว, hover ดู timestamp) หรือ — ให้แอดมินกวาดตาดูได้เร็วว่าออเดอร์ไหนยังไม่ได้กดรับ
- ทดสอบ flow เต็มบน dev server: สร้างออเดอร์ทดสอบ (ลูกค้าไม่มี LINE) → กด "รับออเดอร์" → เห็นข้อความ "ไม่ได้แจ้งเตือน" ถูกต้อง → กด "บันทึกและไปดูออเดอร์ถัดไป" → เด้งกลับ list เห็น ✓ ในคอลัมน์ "รับแล้ว" ตรงแถว, ลบ order/customer ทดสอบออกจาก DB แล้ว (ระวัง: ใน DB มีออเดอร์จริงของเจ้าของร้านปนอยู่ SP202607050001-004 ไม่ได้แตะต้อง)

### ✅ ทำเนียบคนขับ (ม้าเร็ว) + มอบหมายงานส่งผ่าน LINE (เสร็จแบบเบา, 2026-07-05)
**เป้าหมาย:** user อยากได้ระบบรับสมัครคนขับส่งของหลายคนแบบ Lalamove/Grab — เริ่มจากทำแบบเบาก่อน (แอดมินมอบหมายเอง) แล้ว upgrade เป็นแบบเต็มในรอบถัดมา (ดูหัวข้อถัดไป)

- Schema: model ใหม่ `Rider { id, name, phone, lineUserId?, isActive, createdAt }`, เพิ่ม `Order.riderId`/`Order.rider`/`Order.assignedAt`
- `/admin/riders` — หน้าจัดการคนขับ: ฟอร์มเพิ่มคนขับ (ชื่อ/เบอร์/LINE User ID ถ้ามี) + ตาราง list เปิด/ปิดใช้งาน/ลบ + **reuse pattern เดียวกับ `/admin/settings`**: โชว์ตาราง "ข้อความล่าสุดที่มีคนทักบอท LINE" (20 รายการจาก `LineMessageLog` direction IN) ให้แอดมินหา User ID ของคนขับได้ง่ายๆ (ให้คนขับทักบอท 1 ครั้ง แล้ว copy userId มาใส่)
- `src/app/api/admin/riders/route.ts` (GET/POST) และ `[id]/route.ts` (PATCH/DELETE) — ทุก endpoint เช็ค `auth()`
- หน้า `admin/orders/[id]` เพิ่มส่วน "คนขับ" (เดิมชื่อ "มอบหมายคนขับ" — **ยังเก็บไว้เป็นทางเลือก override/มอบหมายเองกรณีจำเป็น** หลังจากมีระบบกดรับงานเองแล้ว) — dropdown เลือกคนขับที่ `isActive`, กด "มอบหมายงาน" → `POST /api/admin/orders/[id]/assign-rider` ตั้ง `riderId`+`assignedAt` แล้ว push LINE ให้คนขับถ้ามี `lineUserId`
- เลือก "— ไม่ได้มอบหมาย —" ใน dropdown แล้วกดมอบหมาย = ยกเลิกการมอบหมาย (`riderId: null`)
- `admin/orders/page.tsx` (list) และ `admin/orders/[id]/page.tsx` (detail) แสดงชื่อคนขับที่มอบหมายแล้ว

### ✅ อัปเกรดเป็นระบบคนขับกดรับงานเอง แบบ Lalamove/Grab จริง (เสร็จ, 2026-07-05 รอบถัดมา)
**เป้าหมาย:** user ยืนยันอยากได้แบบเต็ม — คนขับเห็นงานว่างแล้ว "กดรับเอง" ไม่ใช่แอดมินมอบหมายอย่างเดียว

- Schema: เพิ่ม `Rider.accessToken String @unique @default(cuid())` — ใช้เป็น "รหัสผ่าน" ของคนขับในตัว ไม่ต้องมีระบบ login แยก (ลิงก์ `/rider/{accessToken}` เข้าได้เลย เหมาะกับกลุ่มคนขับที่ไว้ใจกันแบบร้านเล็ก ไม่ใช่ public marketplace)
- `src/app/rider/[token]/page.tsx` + `RiderDashboard.tsx` (client, public ไม่ผ่าน `auth()`) — หน้าคนขับ mobile-first: โหลด/poll ทุก 15 วิ ผ่าน `GET /api/rider/[token]/orders`, แบ่ง 2 ส่วน "งานของฉัน" (มีปุ่ม "✅ จัดส่งสำเร็จแล้ว") กับ "งานที่ว่าง" (มีปุ่ม "📦 รับงานนี้")
- **เกณฑ์ "งานที่ว่าง":** `shippingMethod === MOTORCYCLE && riderId === null && status !== CANCELLED && acknowledgedAt !== null` — ต้องเป็นงานที่แอดมิน "รับออเดอร์" ยืนยันแล้วเท่านั้นถึงจะเข้าคิวให้คนขับเห็น (กันงานสแปม/ทดสอบหลุดไปให้คนขับ)
- `POST /api/rider/[token]/claim` — **กันชนกันด้วย atomic `updateMany({ where: { id: orderId, riderId: null }, ... })`** เช็ค `result.count === 0` แปลว่ามีคนรับไปแล้ว (409 "งานนี้มีคนรับไปแล้ว กรุณารีเฟรชหน้าเว็บ") — สำคัญมากเพราะคนขับหลายคนอาจกดพร้อมกัน, รับสำเร็จแล้ว push LINE แจ้งร้านว่าใครรับ
- `POST /api/rider/[token]/deliver` — เปลี่ยน `Order.status` เป็น `SHIPPED` (เช็คว่า `riderId` ตรงกับคนขับคนนี้ก่อน), push LINE แจ้งทั้งร้านและลูกค้า (ถ้ามี `customer.lineUserId`) ว่าจัดส่งสำเร็จแล้ว
- `/admin/riders` เพิ่มปุ่ม "คัดลอกลิงก์" ต่อคนขับแต่ละคน (คัดลอก `{origin}/rider/{accessToken}`) พร้อมคำอธิบายวิธีใช้ (ส่งลิงก์ให้คนขับทาง LINE ครั้งเดียว ใช้ได้ตลอด)
- ทดสอบเต็ม flow บน dev server: สร้างคนขับ+ออเดอร์ทดสอบ (MOTORCYCLE + acknowledge แล้ว) → เปิดลิงก์คนขับ เห็นงานว่างจริง (ปนกับออเดอร์จริงของร้านที่ acknowledge ไว้แล้วด้วย — **ระวังมาก ไม่ไปกดรับ/แก้ไขออเดอร์จริงระหว่างทดสอบ**) → กด "รับงานนี้" ย้ายไปงานของฉันถูกต้อง → กด "จัดส่งสำเร็จแล้ว" → เช็ค DB ยืนยัน `status: SHIPPED, riderId` ถูกต้อง → ลบ order/customer/rider ทดสอบออกหมดแล้ว
### ✅ 4 ฟีเจอร์ต่อยอด: ประวัติงาน + คะแนน + ค่าคอมมิชชั่น + แจ้งงานตามระยะทาง (เสร็จ, 2026-07-05 รอบสุดท้าย)
**เป้าหมาย:** user ขอให้ทำทุกอย่างที่ยังไม่มีจากรอบก่อน (ระบบให้คะแนนคนขับ, ค่าคอมมิชชั่น/payout, จับคู่ตามระยะทางอัตโนมัติ, หน้าประวัติงาน) — **ข้อควรระวัง: ไม่รู้อัตราค่าคอมมิชชั่นจริงที่ user จะให้คนขับ จึงสร้างเป็นระบบที่ยืดหยุ่น default 0 ให้ user ไปตั้งค่าจริงเองที่ `/admin/riders`**

- Schema เพิ่ม: `Order.riderRating` (Int? 1-5), `Order.riderRatingComment`, `Order.riderCommission` (Decimal? snapshot ตอนจัดส่งสำเร็จ), `Order.commissionSettled`/`settledAt`; `Rider.commissionPerDelivery` (Decimal default 0, แอดมินตั้งเองต่อคนขับ), `Rider.lastLat`/`lastLng`/`lastLocationAt`
- **ประวัติงาน:** `GET /api/rider/[token]/orders` เพิ่ม `history` (20 ออเดอร์ SHIPPED ล่าสุดของคนขับคนนั้น) + สรุป `avgRating`/`ratedCount`/`unsettledCommission` — โชว์ในหน้าคนขับ ส่วน "ประวัติงานที่ส่งสำเร็จ" ต่อจาก "งานที่ว่าง"
- **ให้คะแนนคนขับ:** `POST /api/orders/[orderNo]/rate-rider` (public, validate: ต้องมี rider, status ต้อง `SHIPPED`, ให้คะแนนซ้ำไม่ได้) — `RateRiderForm.tsx` (client, ดาว 1-5 กดเลือก + comment) แสดงในหน้า `/order/[orderNo]` เฉพาะตอน `status === SHIPPED && rider && riderRating == null`
- **ค่าคอมมิชชั่น:** `POST /api/rider/[token]/deliver` snapshot `riderCommission = rider.commissionPerDelivery` ตอนกดจัดส่งสำเร็จ (ราคาคงที่ ณ ตอนนั้น ไม่ผูกกับอัตราที่อาจเปลี่ยนทีหลัง) — `/admin/riders` มีช่องแก้ "ค่าคอมฯ/งาน" ต่อคนขับ (inline edit + ปุ่มบันทึก) และคอลัมน์ "ค้างจ่าย" พร้อมปุ่ม "จ่ายแล้ว" → `POST /api/admin/riders/[id]/settle-commission` เคลียร์ `commissionSettled=true` ทุกออเดอร์ที่ค้างของคนขับคนนั้นพร้อมกัน
- **แจ้งงานตามระยะทาง:** `src/lib/geo.ts` (`haversineKm` — ระยะทางเส้นตรง ไม่ใช่ระยะทางถนนจริง, ไม่ได้ใช้ Google Maps Distance Matrix API เพราะไม่จำเป็นแค่จัดอันดับคร่าวๆ), `RiderDashboard.tsx` เรียก `navigator.geolocation.watchPosition` ส่งพิกัดไป `POST /api/rider/[token]/location` ทุกๆ อย่างน้อย 60 วิ (throttle ด้วย `useRef` timestamp), `POST /api/admin/orders/[id]/acknowledge` หลัง acknowledge ออเดอร์ม้าเร็วที่มีพิกัดลูกค้าแล้ว จะหาคนขับ `isActive` + มี `lineUserId` + `lastLocationAt` ไม่เกิน 30 นาที คำนวณระยะทางเรียงจากใกล้สุด เอา 3 คนแรก push LINE "🔔 มีงานใหม่ใกล้คุณ! ห่างประมาณ X กม." (ยังต้องเข้าไปกด "รับงานนี้" เองในหน้าคนขับ ไม่ได้ auto-assign ให้)
- ทดสอบครบทั้ง 4 ฟีเจอร์บน dev server จริง: ตั้งค่าคอมฯ 25 บาท → รับงาน+จัดส่งสำเร็จ → เห็น commission snapshot 25 ถูกต้องทั้งในประวัติคนขับและหน้า admin → ให้คะแนน 5 ดาวที่หน้า order → เห็น "⭐ 5.0 (1)" ในหน้า admin/riders ถูกต้อง → กด "จ่ายแล้ว" ยอดค้างเป็น 0 ถูกต้อง → ลบข้อมูลทดสอบออกจาก DB หมดแล้ว
- **จุดที่ยังไม่ได้ทำ (นอกเหนือจากนี้จะเป็นงานคนละสเกล):** ยังไม่มี auto-assign ให้คนขับที่ใกล้ที่สุดโดยอัตโนมัติ (แค่แจ้งเตือน ยังต้องกดรับเอง — ป้องกันปัญหาคนขับถูก assign แต่ไม่สะดวกรับจริง), ยังไม่มีหน้าสรุปรายงานคอมมิชชั่นรวมทุกคนขับ/export, ยังไม่มีการแจ้งเตือนถ้าคนขับไม่เปิด location sharing (permission denied เงียบๆ แค่ badge บอกสถานะ)

### 🐛 บั๊กที่พบและแก้แล้ว: `src/proxy.ts` เช็คชื่อ cookie ผิด (2026-07-05)
`src/proxy.ts` เช็ค cookie ชื่อ `next-auth.session-token` / `__Secure-next-auth.session-token` (ชื่อของ **NextAuth v4**) แต่โปรเจกต์นี้ใช้ **NextAuth v5 (Auth.js)** ซึ่ง set cookie ชื่อ `authjs.session-token` / `__Secure-authjs.session-token` แทน (ยืนยันจาก `node_modules/@auth/core/lib/utils/cookie.js`)

**ผลกระทบ:** ทุกครั้งที่ login สำเร็จแล้วพยายามเข้า `/admin/*` — `proxy.ts` มองไม่เห็น session cookie (เช็คชื่อผิด) เลย redirect กลับ `/login` เสมอ **ทั้งที่ login จริงสำเร็จ** (ยืนยันด้วย `fetch('/api/auth/session')` คืนค่า user ปกติ) แปลว่าโดยพฤตินัยแล้ว **เข้าหน้า admin ผ่าน browser ไม่ได้เลยตั้งแต่มีฟีเจอร์นี้** จนกว่าจะแก้
**แก้แล้ว:** เปลี่ยนเป็นเช็ค `authjs.session-token` / `__Secure-authjs.session-token` ที่บรรทัด 10-12 ของ `src/proxy.ts` — ทดสอบแล้วว่า login → เข้า `/admin/orders` ได้ปกติหลังแก้
**Note:** รหัสผ่าน admin เดิม (`admin@sabaipanich.com`) ไม่มีใครทราบ ระหว่างทดสอบได้รีเซ็ตด้วย `scripts/seed-admin.ts` เป็นรหัสผ่านชั่วคราว — **ต้องแจ้ง/เปลี่ยนรหัสผ่านจริงกับเจ้าของร้านอีกที**

### ✅ Phase 6 — Facebook Graph API Auto-post (โค้ดเสร็จ 2026-07-07, รอ user สร้าง FB App จริง)
**ต้องรอ user เตรียม:** Facebook App (Business type) + Page Access Token ที่มี permission `pages_manage_posts`, `pages_read_engagement` (สร้างเองผ่าน Facebook Developers, ไม่ต้อง App Review ถ้า user เป็น admin ของเพจตัวเองและ app อยู่ใน Development mode) — token ชั่วคราวจาก Graph API Explorer หมดอายุเร็ว ต้องแปลงเป็น long-lived ก่อนใช้จริง

**สิ่งที่ทำแล้ว:**
- `src/lib/facebook.ts` — `getFacebookConfig()` (อ่านจาก `AppSettings` singleton เหมือน LINE, fallback env var), `postSalePageToFacebook(salePageId)` (Graph API v21.0 — มีรูปโพสต์ที่ `/{page-id}/photos` ด้วย `url`+`message`, ไม่มีรูปโพสต์ที่ `/{page-id}/feed` ด้วย `link`+`message`, ดึง permalink ตามด้วย GET แยก, บันทึกผลลง `FacebookPost` เสมอทั้งสำเร็จ/ล้มเหลว)
- ฟอร์มตั้งค่า Facebook Page ID / Page Access Token เพิ่มใน `/admin/settings` (`SettingsForm.tsx`) ใช้ pattern เดียวกับ LINE
- ปุ่ม "โพสต์ไปยัง Facebook" ในหน้า `admin/sale-pages/[id]` (`SalePageEditor.tsx`) → `POST /api/admin/sale-pages/[id]/facebook-post` พร้อมประวัติการโพสต์ก่อนหน้า (สถานะ/permalink/error)
- แคปชั่นตอนนี้ใช้แค่ `title`+`description`+ลิงก์เพจ ยังไม่ได้ดึงรายการสินค้าแต่ละชิ้นมาใส่ (ทำเพิ่มได้ทีหลังถ้าต้องการ), ยังไม่รองรับหลายภาพ (multi-photo `attached_media`) — ใช้แค่ `coverUrl` เดียว

**ยังไม่ได้ทดสอบ end-to-end กับ Facebook Page จริง** เพราะยังไม่มี Page Access Token — ทดสอบแค่ `tsc --noEmit` + `next build` ผ่าน ต้องรอ user เตรียม token แล้วลองกดปุ่มจริงอีกที

### 🔄 Phase 7 — LINE OA Messaging API (เริ่มแล้ว 2026-07-05 — รอ user สร้าง LINE Channel เพื่อใช้งานจริง)

**สิ่งที่เสร็จแล้ว (โค้ดพร้อมใช้ทันทีที่มี credentials):**
- `src/lib/line.ts` — `getLineConfig()` อ่าน channel secret/access token/shop user id จาก `AppSettings` (DB) ก่อน แล้ว fallback ไป env var (`LINE_CHANNEL_SECRET`/`LINE_CHANNEL_ACCESS_TOKEN`) ถ้า DB ไม่มี, `pushLineMessage(to, text)` ส่งข้อความ + log ลง `LineMessageLog` (direction `OUT`), `notifyShop(text)` ส่งไปยัง `lineShopUserId` ที่ตั้งไว้
- `src/app/api/line/webhook/route.ts` (POST, public) — verify `x-line-signature` ด้วย HMAC-SHA256(channel secret, raw body) เทียบ base64, ถ้ายังไม่ตั้ง secret จะตอบ `{ok:true}` เฉย ๆ (no-op กัน error), handle `follow`/`message text`/`message location` (แปลง location เป็นลิงก์ Google Maps) → log ทุกอย่างลง `LineMessageLog` (direction `IN`)
- `src/app/api/orders/route.ts` — หลังสร้างออเดอร์สำเร็จ เรียก `notifyShop(...)` ส่งสรุปออเดอร์ (ลูกค้า/รายการ/ยอด/วิธีจัดส่ง/ลิงก์ Google Maps ถ้ามี/ลิงก์ admin) เข้า LINE ของร้านทันที — **ถ้ายังไม่ตั้งค่า `lineShopUserId` จะ skip เงียบ ๆ ไม่ error**
- `src/app/admin/settings/page.tsx` + `SettingsForm.tsx` + `src/app/api/admin/settings/route.ts` (GET/PATCH, ต้อง `auth()`) — ฟอร์มกรอก Channel Secret/Access Token/Shop User ID/PromptPay ID, พร้อมตาราง "ข้อความล่าสุดที่ทักบอท" (20 รายการล่าสุดจาก `LineMessageLog` direction IN) ให้เจ้าของร้านหา User ID ของตัวเองได้ง่าย (ทักบอท 1 ข้อความ → เห็น userId ในตารางนี้ → copy ไปใส่ช่อง Shop User ID)
- Schema: เพิ่ม `AppSettings.lineShopUserId`
- ทดสอบแล้วด้วย mock signature (`crypto.subtle` ใน browser) ยิงเข้า webhook จริงบน dev server, ยืนยันว่า log เข้า DB และแสดงในหน้า settings ถูกต้อง, ลบข้อมูลทดสอบออกแล้ว

**สิ่งที่ยังไม่ได้ทำ (ตั้งใจไว้ ยังไม่จำเป็นตอนนี้):**
- Push แจ้งลูกค้าโดยตรง (ต้องมี `lineUserId` ของลูกค้าจาก checkout form ก่อน — ฟิลด์มีอยู่แล้วใน `Customer.lineUserId` แต่ยังไม่ได้ auto-push อะไรกลับหาลูกค้า)
- Auto-reply ข้อความเข้า (ตอนนี้ webhook แค่ log ไม่ได้ตอบกลับอัตโนมัติ)
- จับคู่ `lineUserId` จาก webhook เข้ากับ `Customer` ที่มีอยู่แล้วอัตโนมัติ (ตอนนี้ต้องจับคู่เอง)

**ขั้นตอนที่ user ต้องทำเอง (ผมทำแทนไม่ได้ ต้อง login LINE account ของร้านเอง):**
1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/) → login ด้วยบัญชี LINE เดียวกับที่ผูกกับ LINE OA ของร้าน
2. สร้าง Provider (ถ้ายังไม่มี) → สร้าง Channel ใหม่ ประเภท **Messaging API** → ผูกกับ LINE Official Account ที่มีอยู่แล้ว (หรือสร้างใหม่ถ้ายังไม่มี)
3. ในหน้า Channel → แท็บ **Basic settings** → copy **Channel secret**
4. แท็บ **Messaging API** → กด **Issue** ที่ **Channel access token (long-lived)** → copy token
5. เอา 2 ค่านี้ไปกรอกที่ `/admin/settings` ของเว็บ (Channel Secret, Channel Access Token) แล้วกดบันทึก
6. ในหน้า Channel → แท็บ **Messaging API** → ใส่ Webhook URL เป็น `https://abaipanich-store.vercel.app/api/line/webhook` แล้วเปิด **Use webhook**
7. ปิด auto-reply message เริ่มต้นของ LINE (แท็บ **Messaging API** → **LINE Official Account features** → ปิด "Greeting messages"/"Auto-reply messages" ถ้าไม่ต้องการให้ชนกับระบบ)
8. เพิ่มบัญชี LINE OA เป็นเพื่อนด้วยมือถือของเจ้าของร้าน แล้วทักข้อความอะไรก็ได้ 1 ครั้ง
9. กลับไปที่ `/admin/settings` รีเฟรชหน้า → จะเห็น userId ของเจ้าของร้านในตาราง "ข้อความล่าสุด" → copy ไปใส่ช่อง "LINE User ID ของร้าน" แล้วบันทึก
10. ทดสอบสั่งซื้อ 1 ออเดอร์จากหน้าเว็บ → ควรมีข้อความแจ้งเตือนเข้า LINE ของเจ้าของร้านทันที

**✅ อัปเดต (2026-07-05 เย็น):** user กรอก Channel Secret/Access Token ใน `/admin/settings` แล้วจริง (ยืนยันด้วยการยิง HMAC signature จริงเข้า webhook production — ผ่าน, log เข้า DB ถูกต้อง) — เหลือแค่ตั้ง Webhook URL ในหน้า LINE Console (ข้อ 6) และหา/บันทึก Shop User ID (ข้อ 8-9)

**✅ อัปเดต (2026-07-05 ค่ำ) — ตั้ง Webhook URL ผ่าน API สำเร็จแล้ว แต่เปิด "Use webhook" ผ่าน API ไม่ได้:**
- `scripts/set-webhook.ts` — เรียก `PUT https://api.line.me/v2/bot/channel/webhook/endpoint` ตั้ง endpoint เป็น `https://abaipanich-store.vercel.app/api/line/webhook` สำเร็จ (200), และเรียก `POST .../webhook/test` ยืนยันว่า LINE ยิงเข้ามาที่ endpoint นี้ได้จริง (`success:true, statusCode:200`) — ครั้งแรก timeout เพราะ Vercel serverless function cold start (2s+), ยิงซ้ำรอบสองผ่านปกติ
- **⚠️ ข้อจำกัดที่เจอ:** `GET .../webhook/endpoint` คืนค่า `active:false` ตลอด แม้ test จะผ่านแล้วก็ตาม — นี่คือค่าที่ตรงกับสวิตช์ **"Use webhook"** ในหน้า Console **ซึ่ง LINE ไม่มี public API ให้ set ค่านี้** (เท่าที่ตรวจสอบตอน 2026-07-05 ไม่พบ endpoint สำหรับ toggle นี้โดยตรง) **user ต้องเข้าไปกดเปิดสวิตช์เองในหน้า Console** (แท็บ Messaging API → หัวข้อ Webhook settings → เปิด "Use webhook") เป็นขั้นตอนเดียวที่เหลือทำแทนไม่ได้จริงๆ
- ขั้นตอนที่เหลือทำแทนไม่ได้เช่นกัน: "ทักบอทเอง 1 ข้อความ" เพื่อเอา userId เพราะต้องใช้บัญชี LINE จริงของเจ้าของร้านที่มีอยู่ในมือถือ ไม่มีทางจำลองจากฝั่ง server ได้

### Rich Menu (สร้างแล้ว 2026-07-05)
สร้างและ publish rich menu จริงบน LINE OA ของร้านแล้ว ผ่าน Messaging API โดยตรง (ไม่ผ่านหน้าเว็บ, รันครั้งเดียวจาก script):
- `scripts/gen-richmenu.ts` — generate ภาพเมนู 2500x843px ด้วย `sharp` (SVG → PNG), ออกแบบ 3 คอลัมน์เท่ากัน: "เลือกซื้อสินค้า" (ไอคอนถุง) / "ตะกร้าของฉัน" (ไอคอนรถเข็น) / "ติดต่อร้าน" (ไอคอนแชท) บนพื้นเขียว emerald ให้ตรงธีมเว็บ — รันด้วย `npx tsx scripts/gen-richmenu.ts` จะได้ `scripts/richmenu.png` (คอมมิตไว้ในโปรเจกต์เป็นตัวอย่าง/แก้ไขต่อได้)
- `scripts/create-richmenu.ts` — เรียก LINE Messaging API 3 ขั้นตอน (ต้องมี `AppSettings.lineChannelAccessToken` ตั้งไว้แล้ว): (1) `POST /v2/bot/richmenu` สร้าง object + areas action (คอลัมน์ 1-2 เป็น `uri` ไปหน้าแรก/`/cart`, คอลัมน์ 3 เป็น `message` ส่งข้อความ "สนใจสอบถามสินค้าค่ะ" แทนลูกค้า), (2) `POST api-data.line.me/.../content` อัปโหลดภาพ, (3) `POST /v2/bot/user/all/richmenu/{id}` ตั้งเป็น default ให้ทุกคน — รันด้วย `npx tsx -r dotenv/config scripts/create-richmenu.ts`
- เพิ่ม `sharp` เป็น devDependency (ไม่ได้อยู่ในนี้มาก่อน แต่มี transitively จาก dependency อื่นอยู่แล้ว — ใส่ตรงๆ กัน version เปลี่ยนแล้ว script พัง)
- **ยืนยันแล้วว่า publish สำเร็จจริง** — เรียก `GET /v2/bot/user/all/richmenu` คืนค่า richMenuId ตรงกับที่สร้างไว้
- ถ้าต้องการแก้ไขดีไซน์ภายหลัง: แก้ SVG ใน `gen-richmenu.ts` → รันสร้างภาพใหม่ → รัน `create-richmenu.ts` อีกรอบ (จะสร้าง rich menu ใหม่และตั้งเป็น default แทนอันเก่า — อันเก่าไม่ถูกลบอัตโนมัติ ถ้าต้องการลบให้เรียก `DELETE /v2/bot/richmenu/{richMenuId}` เพิ่มเอง)

## Pattern ที่ reuse จาก GearGao-SaaS (มีโค้ดตัวอย่างพร้อมใช้)

| ต้องการทำอะไร | ดูตัวอย่างที่ |
|---------------|--------------|
| Public API ดึงสต็อก/รูป | [GearGao-SaaS/src/app/api/public/products/route.ts](../GearGao-SaaS/src/app/api/public/products/route.ts) |
| สร้าง PromptPay QR | [GearGao-SaaS/src/app/api/pos/qr/route.ts](../GearGao-SaaS/src/app/api/pos/qr/route.ts) |
| Prisma client + adapter-pg singleton | [GearGao-SaaS/src/lib/prisma.ts](../GearGao-SaaS/src/lib/prisma.ts) (คัดลอกมาแล้วใน [src/lib/prisma.ts](src/lib/prisma.ts)) |
| NextAuth v5 credentials provider | [GearGao-SaaS/src/lib/auth.ts](../GearGao-SaaS/src/lib/auth.ts) (ตัดส่วน role/organizationId ออกแล้วใน [src/lib/auth.ts](src/lib/auth.ts)) |
| Prisma 7 `prisma.config.ts` | [GearGao-SaaS/prisma.config.ts](../GearGao-SaaS/prisma.config.ts) |

## กฎสำคัญในการเขียนโค้ดต่อ

- **⚠️ Next.js 16 breaking changes** — เช็ค `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` ก่อนเขียน route/page ใหม่เสมอ (โดยเฉพาะ async `params`/`searchParams`)
- โปรเจกต์นี้ **single-tenant** — ห้ามเผลอเพิ่ม `organizationId` หรือ multi-tenant logic แบบ GearGao มาโดยไม่จำเป็น
- `OrderItem` ต้อง snapshot ชื่อ/ราคาเสมอ ห้ามอ้างอิง `SyncedProduct` แบบ live (ราคาสินค้าอาจถูก sync ทับภายหลัง)
- Endpoint สาธารณะ (`/p/[slug]`, `/api/orders`, `/order/[orderNo]`, `/api/line/webhook`) **ต้องไม่ต้อง login** — อย่าไปห่อด้วย `auth()` เช็ค session โดยไม่ตั้งใจ
- Endpoint ฝั่งแอดมิน (`/api/admin/*`, `/api/sync`, `/api/facebook/*`) ต้องเช็ค `auth()` ทุกจุด (ดู pattern ใน [src/app/api/sync/route.ts](src/app/api/sync/route.ts))
- เก็บ credentials ที่ sensitive (`FACEBOOK_PAGE_ACCESS_TOKEN`, `LINE_CHANNEL_ACCESS_TOKEN`) เป็น server-only เสมอ ห้ามหลุดไป client component
- รองรับ Thai locale ตัวเลข/วันที่ (`toLocaleString("th-TH")`) ตาม convention เดียวกับ GearGao
- Decimal จาก Prisma ต้อง `Number()` ก่อนส่งให้ client component (เหมือน GearGao)

## คำสั่งที่ใช้บ่อย

```bash
npm run dev              # dev server
npm run build             # prisma generate + next build
npx prisma db push         # sync schema ไปฐานข้อมูลจริง (หลังตั้ง DATABASE_URL แล้ว)
npx prisma studio          # เปิดดู/แก้ข้อมูลใน DB
npx tsx scripts/seed-admin.ts <email> <password> [name]   # สร้าง/รีเซ็ตบัญชีแอดมิน
npx tsc --noEmit            # type-check (next build ตั้ง ignoreBuildErrors ไว้ ไม่เจอ error อัตโนมัติ)
```

## Checklist สิ่งที่เจ้าของร้านต้องเตรียม (ภายนอกโค้ด)

- [ ] Supabase (หรือ Postgres อื่น) project ใหม่ — ใส่ `DATABASE_URL`/`DIRECT_URL`
- [ ] URL ที่ GearGao-SaaS deploy จริง — ใส่ `GEARGAO_PUBLIC_API_URL`
- [x] เลข PromptPay ที่ใช้รับเงิน — ใส่ `PROMPTPAY_ID` = 0807673617 แล้ว (2026-07-05)
- [ ] Facebook App + Page Access Token — Phase 6
- [ ] LINE Developers Messaging API Channel (Secret + Access Token) — Phase 7 (ดูขั้นตอน 10 ข้อในหัวข้อ Phase 7 ด้านบน)
- [ ] ตัดสินใจว่าจะ deploy โปรเจกต์นี้ที่ไหน (Vercel แนะนำ เพื่อความสอดคล้องกับ GearGao)
- [ ] `git init` ในโฟลเดอร์นี้ — ยังไม่ได้ทำ ณ ตอนเขียนไฟล์นี้
