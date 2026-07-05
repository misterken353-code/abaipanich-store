import fs from "fs";
import { prisma } from "../src/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://abaipanich-store.vercel.app";

async function main() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  const token = settings?.lineChannelAccessToken;
  if (!token) throw new Error("ยังไม่ได้ตั้งค่า LINE Channel Access Token");

  const richMenuDef = {
    size: { width: 2500, height: 843 },
    selected: true,
    name: "sabaipanich-main-menu",
    chatBarText: "เมนู",
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: "uri", uri: `${APP_URL}/` },
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: "uri", uri: `${APP_URL}/cart` },
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: "message", text: "สนใจสอบถามสินค้าค่ะ" },
      },
    ],
  };

  // 1) Create rich menu object
  const createRes = await fetch("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(richMenuDef),
  });
  if (!createRes.ok) {
    console.error("create failed:", createRes.status, await createRes.text());
    return;
  }
  const { richMenuId } = await createRes.json();
  console.log("created richMenuId:", richMenuId);

  // 2) Upload image content
  const imageBuffer = fs.readFileSync("scripts/richmenu.png");
  const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: { "Content-Type": "image/png", Authorization: `Bearer ${token}` },
    body: imageBuffer,
  });
  if (!uploadRes.ok) {
    console.error("upload failed:", uploadRes.status, await uploadRes.text());
    return;
  }
  console.log("image uploaded");

  // 3) Set as default rich menu for all users
  const setDefaultRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!setDefaultRes.ok) {
    console.error("set default failed:", setDefaultRes.status, await setDefaultRes.text());
    return;
  }
  console.log("set as default rich menu — done! richMenuId:", richMenuId);
}

main().finally(() => prisma.$disconnect());
