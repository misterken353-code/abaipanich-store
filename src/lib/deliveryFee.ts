import { haversineKm } from "./geo";

// สูตรค่าส่งม้าเร็ว — เริ่มต้น 15 บาท (กม.แรก), กม.ที่ 2 ขึ้นไป กม.ละ 5 บาท
export function calculateDeliveryFee(distanceKm: number): number {
  if (distanceKm <= 1) return 15;
  return 15 + Math.ceil(distanceKm - 1) * 5;
}

export function estimateDeliveryFee(
  storeLat: number,
  storeLng: number,
  customerLat: number,
  customerLng: number
): { distanceKm: number; fee: number } {
  const distanceKm = haversineKm(storeLat, storeLng, customerLat, customerLng);
  return { distanceKm, fee: calculateDeliveryFee(distanceKm) };
}
