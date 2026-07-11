// ตัวช่วยสร้างลิงก์ "เพิ่มเพื่อน" LINE OA ของร้าน
// LINE ไม่อนุญาตให้บังคับเพิ่มเพื่อนอัตโนมัติ — ลูกค้าต้องกดเพิ่มเอง เราจึงทำให้ "กดปุ่มเดียวจบ"

// Basic ID ของ LINE OA ร้านสบายพาณิชย์ (จากลิงก์ manager.line.biz/account/@217mhrld)
// ใช้เป็น fallback เมื่อยังไม่ได้ตั้ง lineOaUrl (ลิงก์ lin.ee) ในหน้า /admin/settings
export const LINE_OA_BASIC_ID = "@217mhrld";

// คืนลิงก์เพิ่มเพื่อนที่ดีที่สุดที่มี: ใช้ lineOaUrl (lin.ee) ถ้าตั้งไว้ ไม่งั้น deep link จาก basic id
export function getAddFriendUrl(lineOaUrl?: string | null): string {
  const trimmed = lineOaUrl?.trim();
  if (trimmed) return trimmed;
  // deep link มาตรฐานของ LINE — เปิดแอป LINE ไปหน้าเพิ่มเพื่อนของ OA โดยตรง
  return `https://line.me/R/ti/p/${encodeURIComponent(LINE_OA_BASIC_ID)}`;
}
