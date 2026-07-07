import { prisma } from "@/lib/prisma";

const GRAPH_API_VERSION = "v21.0";

export async function getFacebookConfig() {
  const settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  return {
    pageId: settings?.facebookPageId || process.env.FACEBOOK_PAGE_ID || null,
    pageAccessToken:
      settings?.facebookPageAccessToken || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || null,
  };
}

async function fetchPermalink(postId: string, pageAccessToken: string) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${postId}?fields=permalink_url&access_token=${pageAccessToken}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.permalink_url ?? null;
  } catch {
    return null;
  }
}

export async function postSalePageToFacebook(salePageId: string) {
  const salePage = await prisma.salePage.findUnique({ where: { id: salePageId } });
  if (!salePage) return { ok: false as const, error: "ไม่พบเพจขาย" };

  const { pageId, pageAccessToken } = await getFacebookConfig();
  if (!pageId || !pageAccessToken) {
    return { ok: false as const, error: "ยังไม่ได้ตั้งค่า Facebook Page ID / Access Token ที่หน้าตั้งค่า" };
  }

  const storeUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  const pageUrl = `${storeUrl}/p/${salePage.slug}`;
  const message = [salePage.title, salePage.description, `ดูสินค้าทั้งหมด: ${pageUrl}`]
    .filter(Boolean)
    .join("\n\n");

  const endpoint = salePage.coverUrl
    ? `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/photos`
    : `https://graph.facebook.com/${GRAPH_API_VERSION}/${pageId}/feed`;

  const body = new URLSearchParams({ access_token: pageAccessToken, message });
  if (salePage.coverUrl) body.set("url", salePage.coverUrl);
  else body.set("link", pageUrl);

  try {
    const res = await fetch(endpoint, { method: "POST", body });
    const data = await res.json();

    if (!res.ok || data.error) {
      const error = data.error?.message || `Facebook API error (${res.status})`;
      await prisma.facebookPost.create({
        data: { salePageId, pageId, status: "FAILED", error },
      });
      return { ok: false as const, error };
    }

    const postId: string = data.post_id || data.id;
    const permalink = await fetchPermalink(postId, pageAccessToken);

    const post = await prisma.facebookPost.create({
      data: { salePageId, pageId, postId, permalink, status: "POSTED" },
    });

    return { ok: true as const, post };
  } catch (e) {
    const error = e instanceof Error ? e.message : "เชื่อมต่อ Facebook ไม่ได้";
    await prisma.facebookPost.create({
      data: { salePageId, pageId, status: "FAILED", error },
    });
    return { ok: false as const, error };
  }
}
