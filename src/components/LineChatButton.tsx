import { getAddFriendUrl } from "@/lib/lineOa";
import { prisma } from "@/lib/prisma";

// ปุ่มลอย "แชทกับร้าน" มุมขวาล่าง — ลูกค้าทักเข้า LINE OA ได้ทุกเมื่อ (เปิด/เพิ่มเพื่อนแล้วคุยต่อ)
export default async function LineChatButton() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  const url = getAddFriendUrl(settings?.lineOaUrl);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      aria-label="แชทกับร้านผ่าน LINE"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#06C755] px-4 py-3 font-bold text-white shadow-xl transition-transform hover:scale-105"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.48 2 2 5.64 2 10.12c0 4.02 3.55 7.39 8.35 8.03.33.07.77.22.88.5.1.26.07.66.03.92l-.14.85c-.04.26-.2 1.02.9.56 1.1-.46 5.93-3.49 8.09-5.98C21.4 13.36 22 11.82 22 10.12 22 5.64 17.52 2 12 2Z" />
      </svg>
      <span className="hidden sm:inline">แชทกับร้าน</span>
    </a>
  );
}
