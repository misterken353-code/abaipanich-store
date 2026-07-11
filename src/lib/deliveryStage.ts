// ป้ายกำกับ "ขั้นการจัดส่ง" ที่ลูกค้าติดตามได้ — ใช้ร่วมกันทั้งหน้าแอดมินและหน้าลูกค้า
// ป้ายบางขั้นเปลี่ยนตามวิธีจัดส่ง (ม้าเร็ว/รับเอง/ขนส่ง)

export type DeliveryStageValue = "RECEIVED" | "PREPARING" | "DELIVERING" | "DELIVERED";
export type ShippingMethodValue = "PICKUP" | "MOTORCYCLE" | "FREIGHT";

// ลำดับขั้น (index 0 = ได้รับคำสั่งซื้อ ซึ่งเสร็จเสมอ, 1-4 = ตาม DeliveryStage)
export const STAGE_ORDER: DeliveryStageValue[] = ["RECEIVED", "PREPARING", "DELIVERING", "DELIVERED"];

// index ปัจจุบันของ timeline จากค่า deliveryStage (null = เพิ่งสั่ง ยังไม่รับออเดอร์ = 0)
export function stageIndex(stage: DeliveryStageValue | null | undefined): number {
  if (!stage) return 0;
  return STAGE_ORDER.indexOf(stage) + 1;
}

// ป้ายของแต่ละขั้นตามวิธีจัดส่ง
export function stageLabels(method: ShippingMethodValue) {
  const deliver =
    method === "PICKUP"
      ? { going: "พร้อมให้มารับที่ร้าน", done: "รับสินค้าเรียบร้อย" }
      : method === "FREIGHT"
        ? { going: "ส่งมอบให้ขนส่งแล้ว", done: "จัดส่งสำเร็จ" }
        : { going: "กำลังจัดส่ง", done: "จัดส่งสำเร็จ" };

  return {
    RECEIVED: { title: "ร้านรับออเดอร์แล้ว", icon: "📝" },
    PREPARING: { title: "กำลังจัดเตรียมสินค้า", icon: "📦" },
    DELIVERING: { title: deliver.going, icon: "🛵" },
    DELIVERED: { title: deliver.done, icon: "✅" },
  } as const;
}
