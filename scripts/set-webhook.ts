import { prisma } from "../src/lib/prisma";

async function main() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  const token = settings?.lineChannelAccessToken;
  if (!token) throw new Error("ยังไม่ได้ตั้งค่า LINE Channel Access Token");

  const endpoint = "https://abaipanich-store.vercel.app/api/line/webhook";

  // 1) Set webhook endpoint URL
  const setRes = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ endpoint }),
  });
  console.log("set endpoint:", setRes.status, await setRes.text());

  // 2) Read back current webhook config
  const getRes = await fetch("https://api.line.me/v2/bot/channel/webhook/endpoint", {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("current config:", getRes.status, await getRes.text());

  // 3) Ask LINE to send a test request to our webhook
  const testRes = await fetch("https://api.line.me/v2/bot/channel/webhook/test", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ endpoint }),
  });
  console.log("webhook test:", testRes.status, await testRes.text());
}

main().finally(() => prisma.$disconnect());
