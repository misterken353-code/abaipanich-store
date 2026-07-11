// คนขับถือว่า "พร้อมรับงาน (ออนไลน์)" เมื่อกดสแตนบายไว้ และหน้าคนขับยัง poll อยู่ภายในเวลาที่กำหนด
// (กัน false-online กรณีคนขับปิดแอปทิ้งไว้โดยไม่กดพักรับงาน)
export const RIDER_ONLINE_STALE_MS = 5 * 60 * 1000; // 5 นาที

export function isRiderOnline(r: { isOnline: boolean; lastSeenAt: Date | null }): boolean {
  return (
    r.isOnline &&
    r.lastSeenAt != null &&
    Date.now() - new Date(r.lastSeenAt).getTime() < RIDER_ONLINE_STALE_MS
  );
}
