import {
  stageIndex,
  stageLabels,
  type DeliveryStageValue,
  type ShippingMethodValue,
} from "@/lib/deliveryStage";

// ไทม์ไลน์ติดตามสถานะการจัดส่งที่ลูกค้าเห็นในหน้า /order/[orderNo]
export default function OrderTracker({
  stage,
  shippingMethod,
  cancelled,
}: {
  stage: DeliveryStageValue | null;
  shippingMethod: ShippingMethodValue;
  cancelled: boolean;
}) {
  if (cancelled) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-center">
        <div className="text-2xl">❌</div>
        <p className="mt-1 font-bold text-red-700">ออเดอร์นี้ถูกยกเลิก</p>
        <p className="text-sm text-red-500">หากมีข้อสงสัย กรุณาติดต่อร้านทาง LINE</p>
      </div>
    );
  }

  const labels = stageLabels(shippingMethod);
  const steps: { title: string; icon: string }[] = [
    { title: "ได้รับคำสั่งซื้อแล้ว", icon: "🛒" },
    labels.RECEIVED,
    labels.PREPARING,
    labels.DELIVERING,
    labels.DELIVERED,
  ];
  const current = stageIndex(stage); // 0..4

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5">
      <p className="mb-4 font-bold text-gray-800">สถานะการจัดส่ง</p>
      <ol className="relative">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          const reached = i <= current;
          const isLast = i === steps.length - 1;
          return (
            <li key={i} className="relative flex gap-3 pb-6 last:pb-0">
              {/* เส้นเชื่อมแนวตั้ง */}
              {!isLast && (
                <span
                  className={`absolute left-[15px] top-8 h-[calc(100%-1rem)] w-0.5 ${
                    done ? "bg-green-500" : "bg-gray-200"
                  }`}
                />
              )}
              {/* จุดวงกลม */}
              <span
                className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                  reached
                    ? "bg-green-600 text-white ring-4 ring-green-100"
                    : "bg-gray-100 text-gray-300 ring-4 ring-white"
                } ${active ? "animate-pulse" : ""}`}
              >
                {reached ? step.icon : "•"}
              </span>
              <div className="pt-1">
                <p className={`text-sm font-semibold ${reached ? "text-gray-800" : "text-gray-400"}`}>
                  {step.title}
                </p>
                {active && (
                  <span className="mt-0.5 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-700">
                    ● สถานะปัจจุบัน
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-1 text-center text-xs text-gray-400">
        เปิดหน้านี้ซ้ำเพื่อดูสถานะล่าสุด · สอบถามเพิ่มเติมทาง LINE ได้เลย
      </p>
    </div>
  );
}
