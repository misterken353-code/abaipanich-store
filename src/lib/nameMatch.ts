// เช็คว่าชื่อบัญชีธนาคารตรงกับชื่อผู้สมัคร/คนขับ — กันโอนเงินผิดคน (บัญชีต้องเป็นของเจ้าตัวเท่านั้น)
// ตัดช่องว่างซ้ำ/คำนำหน้าออกก่อนเทียบ เพื่อไม่ให้ "นาย สมชาย ใจดี" กับ "สมชาย  ใจดี" ถือว่าไม่ตรงกัน
const TITLE_PREFIXES = ["นาย", "นาง", "นางสาว", "น.ส.", "ด.ช.", "ด.ญ.", "mr.", "mrs.", "ms."];

function normalizeName(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/\s+/g, " ");
  for (const t of TITLE_PREFIXES) {
    if (s.startsWith(t.toLowerCase() + " ") || s.startsWith(t.toLowerCase())) {
      s = s.slice(t.length).trim();
      break;
    }
  }
  return s.replace(/\s+/g, "");
}

export function namesMatch(applicantName: string, bankAccountName: string): boolean {
  if (!applicantName.trim() || !bankAccountName.trim()) return false;
  return normalizeName(applicantName) === normalizeName(bankAccountName);
}
