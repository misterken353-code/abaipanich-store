import { prisma } from "@/lib/prisma";

export async function getLineConfig() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  return {
    channelSecret: settings?.lineChannelSecret || process.env.LINE_CHANNEL_SECRET || null,
    channelAccessToken: settings?.lineChannelAccessToken || process.env.LINE_CHANNEL_ACCESS_TOKEN || null,
    shopUserId: settings?.lineShopUserId || null,
  };
}

export async function pushLineMessage(to: string, text: string) {
  const { channelAccessToken } = await getLineConfig();
  if (!channelAccessToken) return { skipped: true as const };

  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ to, messages: [{ type: "text", text }] }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[line] push failed:", res.status, body);
    return { skipped: false as const, ok: false as const };
  }

  await prisma.lineMessageLog.create({
    data: { lineUserId: to, direction: "OUT", message: text },
  });

  return { skipped: false as const, ok: true as const };
}

// ตอบกลับทันทีด้วย replyToken (ฟรี ไม่นับโควตา push) — ใช้ตอนลูกค้าเพิ่มเพื่อน/ทักมาครั้งแรก
export async function replyLineMessage(replyToken: string, text: string) {
  const { channelAccessToken } = await getLineConfig();
  if (!channelAccessToken) return { skipped: true as const };

  const res = await fetch("https://api.line.me/v2/bot/message/reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ replyToken, messages: [{ type: "text", text }] }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[line] reply failed:", res.status, body);
    return { skipped: false as const, ok: false as const };
  }
  return { skipped: false as const, ok: true as const };
}

// แจ้งร้าน (lineShopUserId ที่ตั้งไว้ใน AppSettings) เมื่อมีเหตุการณ์ที่ต้องรู้ เช่น ออเดอร์ใหม่
export async function notifyShop(text: string) {
  const { shopUserId } = await getLineConfig();
  if (!shopUserId) return { skipped: true as const };
  return pushLineMessage(shopUserId, text);
}
