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
| `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN` | LINE OA Messaging API | ❌ Phase 7 — ต้องสร้าง LINE Developers channel เอง |

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
**เป้าหมาย:** แอดมินเลือกสินค้าจาก `SyncedProduct` มาจัดเป็น `SalePage` แล้วลูกค้าเข้าดูได้ที่ `/p/[slug]` (ยังไม่มีการสั่งซื้อ — รอ Phase 4)

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

### ✅ วิธีจัดส่ง 3 แบบ (เสร็จ, 2026-07-05)
**เป้าหมาย:** ให้ลูกค้าเลือกวิธีรับสินค้าตอน checkout แทนที่จะกรอกที่อยู่อย่างเดียว

- Schema: เพิ่ม `enum ShippingMethod { PICKUP MOTORCYCLE FREIGHT }` และฟิลด์ `Order.shippingMethod` (default `PICKUP`), `Order.shippingAddress` (String?, เก็บที่อยู่ต่อออเดอร์แทนที่จะพึ่ง `Customer.address` อย่างเดียว — แก้ latent bug เดิมที่ที่อยู่จาก checkout form ไม่ถูกบันทึกถ้าเบอร์โทรตรงกับลูกค้าเก่า), `Order.customerLat`/`Order.customerLng` (Float?)
- **⚠️ สำคัญ — `prisma db push` ค้างถ้าใช้ `DATABASE_URL` (pooled port 6543):** ต้องสั่งผ่าน direct connection แทน เช่น `npx prisma db push --accept-data-loss --url "<DIRECT_URL ค่าจริงจาก .env>"` (ใช้ `--url` flag override, ห้ามลืม `--accept-data-loss` ถ้ามีคำเตือน) — เจอปัญหานี้ระหว่างเซสชันนี้ ค้างไป 2 รอบก่อนจะลองสลับไปใช้ DIRECT_URL แล้วผ่านใน 2.3s พอดี
- `src/app/checkout/page.tsx` — radio 3 ตัวเลือก: **รับเองหน้าร้าน** (ไม่มีค่าส่ง), **เรียกม้าเร็วจัดส่ง** (โชว์ข้อความอัตราค่าส่ง "เริ่มต้น 15 บาท กม.แรก กม.ที่ 2 ขึ้นไป กม.ละ 5 บาท" + คำเตือนว่าค่าส่งไม่รวมยอดชำระ ชำระแยกให้คนขับ + ปุ่ม "แชร์โลเคชั่น" เรียก `navigator.geolocation.getCurrentPosition` เก็บ lat/lng), **จัดส่งทางขนส่ง** (ชำระค่าส่งปลายทาง) — ที่อยู่จัดส่งเป็น required เฉพาะ MOTORCYCLE/FREIGHT (ซ่อนไว้ถ้าเลือก PICKUP), บังคับต้องกดแชร์โลเคชั่นก่อน submit ถ้าเลือก MOTORCYCLE
- `src/app/api/orders/route.ts` — validate `shippingMethod` ต้องอยู่ใน enum, บันทึก `shippingAddress`/`customerLat`/`customerLng` ลง Order เสมอ (ไม่ใช่แค่ตอนสร้าง customer ใหม่)
- `src/app/order/[orderNo]/page.tsx` และ `src/app/admin/orders/[id]/page.tsx` — แสดงวิธีจัดส่ง + ข้อความอัตราค่าส่ง + ลิงก์ `https://www.google.com/maps?q=lat,lng` ถ้ามีพิกัด (เปิด Google Maps ให้เจ้าของร้าน/คนขับดูตำแหน่งได้ทันที)
- **ตั้งใจไม่รวมค่าส่งม้าเร็ว/ขนส่งเข้า `totalAmount` หรือ QR PromptPay** เพราะเป็นค่าใช้จ่ายที่ชำระแยกนอกระบบ (ให้คนขับ/บริษัทขนส่งโดยตรง) ไม่ใช่ยอดที่ร้านเก็บเอง — ถ้าในอนาคตต้องการให้ระบบคำนวณค่าส่งจริงตามระยะทาง จะต้องมีพิกัดร้าน + Google Maps Distance Matrix API (ยังไม่ได้ทำ)
- ทดสอบผ่าน dev server (mock geolocation + submit จริง) และ tsc/build ผ่านสะอาด

### ✅ Phase 5 — Admin Order Dashboard (เสร็จแบบย่อ, 2026-07-05)
- `src/app/admin/orders/page.tsx` — list ทุกออเดอร์ (ล่าสุดก่อน), แสดงลูกค้า/จำนวนรายการ/ยอดรวม/สถานะ
- `src/app/admin/orders/[id]/page.tsx` + `StatusButtons.tsx` (client) — รายละเอียดออเดอร์เต็ม + ปุ่มเปลี่ยนสถานะ (`PENDING_PAYMENT`/`PAID`/`SHIPPED`/`CANCELLED`)
- `src/app/api/admin/orders/[id]/route.ts` (PATCH) — อัปเดต status, เช็ค `auth()`
- เพิ่มลิงก์ "ออเดอร์ลูกค้า" ใน sidebar (`src/app/admin/layout.tsx`)
- **ยังไม่ได้ทำ:** filter by status ในหน้า list (ทำ list ธรรมดาไปก่อนเพราะยังมีออเดอร์น้อย)

### 🐛 บั๊กที่พบและแก้แล้ว: `src/proxy.ts` เช็คชื่อ cookie ผิด (2026-07-05)
`src/proxy.ts` เช็ค cookie ชื่อ `next-auth.session-token` / `__Secure-next-auth.session-token` (ชื่อของ **NextAuth v4**) แต่โปรเจกต์นี้ใช้ **NextAuth v5 (Auth.js)** ซึ่ง set cookie ชื่อ `authjs.session-token` / `__Secure-authjs.session-token` แทน (ยืนยันจาก `node_modules/@auth/core/lib/utils/cookie.js`)

**ผลกระทบ:** ทุกครั้งที่ login สำเร็จแล้วพยายามเข้า `/admin/*` — `proxy.ts` มองไม่เห็น session cookie (เช็คชื่อผิด) เลย redirect กลับ `/login` เสมอ **ทั้งที่ login จริงสำเร็จ** (ยืนยันด้วย `fetch('/api/auth/session')` คืนค่า user ปกติ) แปลว่าโดยพฤตินัยแล้ว **เข้าหน้า admin ผ่าน browser ไม่ได้เลยตั้งแต่มีฟีเจอร์นี้** จนกว่าจะแก้
**แก้แล้ว:** เปลี่ยนเป็นเช็ค `authjs.session-token` / `__Secure-authjs.session-token` ที่บรรทัด 10-12 ของ `src/proxy.ts` — ทดสอบแล้วว่า login → เข้า `/admin/orders` ได้ปกติหลังแก้
**Note:** รหัสผ่าน admin เดิม (`admin@sabaipanich.com`) ไม่มีใครทราบ ระหว่างทดสอบได้รีเซ็ตด้วย `scripts/seed-admin.ts` เป็นรหัสผ่านชั่วคราว — **ต้องแจ้ง/เปลี่ยนรหัสผ่านจริงกับเจ้าของร้านอีกที**

### ⬜ Phase 6 — Facebook Graph API Auto-post
**ต้องรอ user เตรียม:** Facebook App (Business type) + Page Access Token ที่มี permission `pages_manage_posts`, `pages_read_engagement` (สร้างเองผ่าน Facebook Developers, ไม่ต้อง App Review ถ้า user เป็น admin ของเพจตัวเองและ app อยู่ใน Development mode)

ต้องสร้าง:
- `src/app/admin/settings/page.tsx` (หรือรวมกับหน้าอื่น) — ฟอร์มตั้งค่า `AppSettings.facebookPageId`/`facebookPageAccessToken`
- ปุ่ม "โพสต์ Facebook" ในหน้า `admin/sale-pages/[id]` → `src/app/api/facebook/post/route.ts` (POST) รับ `salePageId`, ดึงรูป+ชื่อ+ราคาสินค้าใน `SalePageItem` มาประกอบแคปชั่น พร้อมลิงก์ `{NEXT_PUBLIC_APP_URL}/p/{slug}`
  - ภาพเดียว: `POST https://graph.facebook.com/v21.0/{page-id}/photos` (multipart หรือ `url` param + `message`)
  - หลายภาพ: อัปโหลดแต่ละรูปด้วย `published=false` ไปที่ `/photos` ก่อน เก็บ `id` แต่ละอันมาเป็น `attached_media` แล้วโพสต์รวมที่ `/feed`
  - บันทึกผลลง `FacebookPost` (postId, permalink, status, error)

### ⬜ Phase 7 — LINE OA Messaging API เต็มรูปแบบ
**ต้องรอ user เตรียม:** LINE Developers Console → สร้าง Provider + Messaging API Channel → เอา Channel Secret + (issue) Channel Access Token (long-lived)

ต้องสร้าง:
- `src/app/api/line/webhook/route.ts` (POST) — verify `x-line-signature` header ด้วย HMAC-SHA256(channel secret, raw body) แล้วเทียบ base64 (pattern HMAC เดียวกับที่ GearGao ใช้ verify webhook ของ MoneySpace — ดูไฟล์ webhook MoneySpace ใน GearGao ถ้าต้องการอ้างอิง วิธี verify HMAC ใน Node)
  - ตัวอย่างวิธี verify HMAC webhook แบบเดียวกัน (คนละ provider แต่ pattern เหมือนกัน) ดูที่ [GearGao-SaaS/src/app/api/payment/webhook/route.ts](../GearGao-SaaS/src/app/api/payment/webhook/route.ts)
  - handle event `follow` → บันทึก `lineUserId` (ถ้าจับคู่กับ `Customer` ได้จากบทสนทนา ก็ update `Customer.lineUserId`)
  - handle event `message` (type text) → log ลง `LineMessageLog` (direction `IN`), ตอบกลับอัตโนมัติเบื้องต้นหรือปล่อยให้แอดมินตอบเองผ่าน push message
- เมื่อสร้าง `Order` ใหม่ (Phase 4) → เรียก LINE push message API (`POST https://api.line.me/v2/bot/message/push`) แจ้งร้าน (เก็บ `lineUserId` ของแอดมิน/กลุ่มไว้ใน `AppSettings` หรือ env) ว่ามีออเดอร์ใหม่ พร้อมสรุปรายการ+ยอด
- ถ้าลูกค้ามี `lineUserId` (กรอกตอน checkout หรือมาจาก webhook) → push แจ้งยืนยันออเดอร์ + รูป QR PromptPay ให้ลูกค้าโดยตรงผ่าน LINE ด้วย
- บันทึกทุกข้อความ (ทั้ง IN/OUT) ลง `LineMessageLog`

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
- [ ] LINE Developers Messaging API Channel (Secret + Access Token) — Phase 7
- [ ] ตัดสินใจว่าจะ deploy โปรเจกต์นี้ที่ไหน (Vercel แนะนำ เพื่อความสอดคล้องกับ GearGao)
- [ ] `git init` ในโฟลเดอร์นี้ — ยังไม่ได้ทำ ณ ตอนเขียนไฟล์นี้
