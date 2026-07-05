import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

interface OrderItemInput {
  productId: string;
  qty: number;
}

interface CustomerInput {
  name: string;
  phone: string;
  address: string | null;
  lineUserId: string | null;
}

// POST /api/orders — public, สร้างออเดอร์จากตะกร้าลูกค้า
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { customer, items, note } = body as {
    customer?: CustomerInput;
    items?: OrderItemInput[];
    note?: string | null;
  };

  if (!customer?.name?.trim() || !customer?.phone?.trim()) {
    return NextResponse.json({ error: "กรุณากรอกชื่อและเบอร์โทรศัพท์" }, { status: 400 });
  }
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "ตะกร้าว่างเปล่า" }, { status: 400 });
  }

  const products = await prisma.syncedProduct.findMany({
    where: { id: { in: items.map((i) => i.productId) } },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) {
      return NextResponse.json({ error: "พบสินค้าที่ไม่มีในระบบ กรุณารีเฟรชหน้าและลองใหม่" }, { status: 400 });
    }
    if (item.qty <= 0) {
      return NextResponse.json({ error: `จำนวนสินค้า "${product.name}" ไม่ถูกต้อง` }, { status: 400 });
    }
    if (!product.isPreOrder && product.availableQty < item.qty) {
      return NextResponse.json(
        { error: `สินค้า "${product.name}" คงเหลือไม่พอ (คงเหลือ ${product.availableQty})` },
        { status: 400 }
      );
    }
  }

  const totalAmount = items.reduce((sum, item) => {
    const product = productMap.get(item.productId)!;
    return sum + Number(product.salePrice) * item.qty;
  }, 0);

  try {
    const order = await prisma.$transaction(async (tx) => {
      let customerRecord = await tx.customer.findFirst({ where: { phone: customer.phone.trim() } });
      if (!customerRecord) {
        customerRecord = await tx.customer.create({
          data: {
            name: customer.name.trim(),
            phone: customer.phone.trim(),
            address: customer.address,
            lineUserId: customer.lineUserId,
          },
        });
      }

      const todayPrefix = `SP${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
      const todayCount = await tx.order.count({ where: { orderNo: { startsWith: todayPrefix } } });
      const orderNo = `${todayPrefix}${String(todayCount + 1).padStart(4, "0")}`;

      return tx.order.create({
        data: {
          orderNo,
          customerId: customerRecord.id,
          totalAmount,
          note: note ?? null,
          items: {
            create: items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: product.id,
                nameSnapshot: product.name,
                priceSnapshot: product.salePrice,
                quantity: item.qty,
              };
            }),
          },
        },
      });
    });

    const promptPayId = process.env.PROMPTPAY_ID || (await prisma.appSettings.findUnique({ where: { id: "singleton" } }))?.promptPayId;
    if (promptPayId) {
      try {
        const payload = generatePayload(promptPayId, { amount: totalAmount });
        const qrDataUrl = await QRCode.toDataURL(payload, { width: 300, margin: 1 });
        await prisma.order.update({ where: { id: order.id }, data: { promptPayQr: qrDataUrl } });
      } catch (e) {
        console.error("[orders] QR generation failed:", e);
      }
    }

    return NextResponse.json({ orderNo: order.orderNo });
  } catch (e) {
    console.error("[orders] create failed:", e);
    return NextResponse.json({ error: "สั่งซื้อไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}
