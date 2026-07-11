import { NextRequest, NextResponse } from "next/server";
import { ShippingMethod, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyShop } from "@/lib/line";
import { estimateDeliveryFee } from "@/lib/deliveryFee";
import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

const SHIPPING_LABEL: Record<string, string> = {
  PICKUP: "รับเองหน้าร้าน",
  MOTORCYCLE: "เรียกม้าเร็วจัดส่ง",
  FREIGHT: "จัดส่งทางขนส่ง",
};

const PAYMENT_LABEL: Record<string, string> = {
  COD: "จ่ายตอนรับของ",
  TRANSFER: "โอนเงินผ่าน PromptPay",
};

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

const VALID_SHIPPING_METHODS: string[] = Object.values(ShippingMethod);
const VALID_PAYMENT_METHODS: string[] = Object.values(PaymentMethod);

// POST /api/orders — public, สร้างออเดอร์จากตะกร้าลูกค้า
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { customer, items, note, shippingMethod, paymentMethod, customerLat, customerLng } = body as {
    customer?: CustomerInput;
    items?: OrderItemInput[];
    note?: string | null;
    shippingMethod?: string;
    paymentMethod?: string;
    customerLat?: number | null;
    customerLng?: number | null;
  };

  if (!customer?.name?.trim() || !customer?.phone?.trim()) {
    return NextResponse.json({ error: "กรุณากรอกชื่อและเบอร์โทรศัพท์" }, { status: 400 });
  }
  if (!items || items.length === 0) {
    return NextResponse.json({ error: "ตะกร้าว่างเปล่า" }, { status: 400 });
  }
  if (!shippingMethod || !VALID_SHIPPING_METHODS.includes(shippingMethod)) {
    return NextResponse.json({ error: "กรุณาเลือกวิธีจัดส่ง" }, { status: 400 });
  }
  if (!paymentMethod || !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    return NextResponse.json({ error: "กรุณาเลือกวิธีชำระเงิน" }, { status: 400 });
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

  // สินค้า Pre-order ต้องชำระเงินล่วงหน้าเท่านั้น (ร้านต้องมีเงินไปสั่งของก่อน) — เช็คฝั่ง server ตาม
  // isPreOrder ของ SyncedProduct จริง ไม่เชื่อ client เพราะ paymentMethod ส่งมาจาก checkout form
  const hasPreOrder = items.some((item) => productMap.get(item.productId)!.isPreOrder);
  if (hasPreOrder && paymentMethod !== "TRANSFER") {
    return NextResponse.json(
      { error: "ตะกร้ามีสินค้า Pre-order ต้องชำระเงินล่วงหน้าผ่าน PromptPay เท่านั้น" },
      { status: 400 }
    );
  }

  const totalAmount = items.reduce((sum, item) => {
    const product = productMap.get(item.productId)!;
    return sum + Number(product.salePrice) * item.qty;
  }, 0);

  const appSettings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });

  // ค่าส่งม้าเร็วคำนวณจากระยะทางจริงฝั่ง server เท่านั้น (ไม่เชื่อค่าจาก client) — ยังจ่ายแยกให้คนขับเหมือนเดิม
  // ไม่รวมใน totalAmount/QR ถ้าร้านยังไม่ตั้งพิกัด (storeLat/storeLng) จะเป็น null แล้ว fallback ไปโชว์สูตรข้อความแทน
  const deliveryFee =
    shippingMethod === "MOTORCYCLE" &&
    customerLat != null &&
    customerLng != null &&
    appSettings?.storeLat != null &&
    appSettings?.storeLng != null
      ? estimateDeliveryFee(appSettings.storeLat, appSettings.storeLng, customerLat, customerLng).fee
      : null;

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
          shippingMethod: shippingMethod as ShippingMethod,
          shippingAddress: customer.address,
          customerLat: customerLat ?? null,
          customerLng: customerLng ?? null,
          paymentMethod: paymentMethod as PaymentMethod,
          note: note ?? null,
          deliveryFee,
          hasPreOrder,
          items: {
            create: items.map((item) => {
              const product = productMap.get(item.productId)!;
              return {
                productId: product.id,
                nameSnapshot: product.name,
                priceSnapshot: product.salePrice,
                quantity: item.qty,
                isPreOrder: product.isPreOrder,
              };
            }),
          },
        },
      });
    });

    // ยอดที่ลูกค้าต้องชำระ = ค่าสินค้า + ค่าวิ่งงาน (เก็บรวมในบิลเดียว — ค่าวิ่งงานเป็นรายรับม้าเร็วที่ร้านจ่ายคืนทีหลัง)
    const grandTotal = totalAmount + (deliveryFee ?? 0);

    const promptPayId = process.env.PROMPTPAY_ID || appSettings?.promptPayId;
    if (paymentMethod === "TRANSFER" && promptPayId) {
      try {
        const payload = generatePayload(promptPayId, { amount: grandTotal });
        const qrDataUrl = await QRCode.toDataURL(payload, { width: 300, margin: 1 });
        await prisma.order.update({ where: { id: order.id }, data: { promptPayQr: qrDataUrl } });
      } catch (e) {
        console.error("[orders] QR generation failed:", e);
      }
    }

    try {
      const itemLines = items
        .map((item) => {
          const product = productMap.get(item.productId)!;
          return `- ${product.name} x${item.qty}`;
        })
        .join("\n");
      const mapsLine =
        customerLat != null && customerLng != null
          ? `\n📍 https://www.google.com/maps?q=${customerLat},${customerLng}`
          : "";
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      const paymentLine =
        paymentMethod === "COD"
          ? `ชำระเงิน: ${PAYMENT_LABEL.COD} (เงินสด)`
          : `ชำระเงิน: ${PAYMENT_LABEL.TRANSFER} (รอลูกค้าส่งสลิป)`;
      const feeLine =
        deliveryFee != null && deliveryFee > 0
          ? `ค่าสินค้า: ${totalAmount.toLocaleString("th-TH")} บาท\nค่าวิ่งงานม้าเร็ว: ${deliveryFee.toLocaleString("th-TH")} บาท\nยอดที่ต้องเก็บรวม: ${(totalAmount + deliveryFee).toLocaleString("th-TH")} บาท`
          : `ยอดรวม: ${totalAmount.toLocaleString("th-TH")} บาท`;
      await notifyShop(
        `🛒 ออเดอร์ใหม่ ${order.orderNo}${hasPreOrder ? " (มีสินค้า Pre-order)" : ""}\n` +
          `ลูกค้า: ${customer.name.trim()} (${customer.phone.trim()})\n` +
          `${itemLines}\n` +
          `${feeLine}\n` +
          `จัดส่ง: ${SHIPPING_LABEL[shippingMethod] ?? shippingMethod}${mapsLine}\n` +
          `${paymentLine}` +
          (hasPreOrder ? `\n📦 มีสินค้า Pre-order — อย่าลืมกด "สินค้ามาถึงร้านแล้ว" ตอนของเข้า` : "") +
          (appUrl ? `\n\nดูรายละเอียด: ${appUrl}/admin/orders/${order.id}` : "")
      );
    } catch (e) {
      console.error("[orders] LINE notify failed:", e);
    }

    return NextResponse.json({ orderNo: order.orderNo });
  } catch (e) {
    console.error("[orders] create failed:", e);
    return NextResponse.json({ error: "สั่งซื้อไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }
}
