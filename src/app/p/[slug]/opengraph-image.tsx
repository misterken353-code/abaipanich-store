import fs from "fs";
import path from "path";
import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import decodeWebp, { init as initWebpDecoder } from "@jsquash/webp/decode.js";
import encodePng, { init as initPngEncoder } from "@jsquash/png/encode.js";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontData = fs.readFileSync(path.join(process.cwd(), "src/lib/fonts/NotoSansThai-Bold.ttf"));

const SUPPORTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/gif"];

// satori (next/og's renderer) can only decode png/jpeg/gif natively. webp sources get converted via
// WASM codecs instead of `sharp`, because `sharp` conflicts with Next's own bundled sharp copy
// (two different native libvips builds loaded in the same process crash with a GObject type error).
// WASM binaries are copied into src/lib/wasm/ (not read from node_modules) so `output: "standalone"`
// file tracing reliably includes them in the deploy bundle.
let wasmReady: Promise<void> | null = null;
function ensureWasmInit() {
  if (!wasmReady) {
    wasmReady = (async () => {
      const webpWasm = fs.readFileSync(path.join(process.cwd(), "src/lib/wasm/webp_dec.wasm"));
      await initWebpDecoder(await WebAssembly.compile(webpWasm));
      const pngWasm = fs.readFileSync(path.join(process.cwd(), "src/lib/wasm/squoosh_png_bg.wasm"));
      await initPngEncoder(pngWasm);
    })();
  }
  return wasmReady;
}

async function fetchCompatibleImage(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") || "";
    const buf = await res.arrayBuffer();

    if (SUPPORTED_TYPES.some((t) => type.startsWith(t))) {
      return `data:${type};base64,${Buffer.from(buf).toString("base64")}`;
    }
    if (type.startsWith("image/webp")) {
      await ensureWasmInit();
      const imageData = await decodeWebp(buf);
      const png = await encodePng(imageData);
      return `data:image/png;base64,${Buffer.from(png).toString("base64")}`;
    }
    return null;
  } catch {
    return null;
  }
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salePage = await prisma.salePage.findUnique({
    where: { slug },
    include: { items: { include: { product: true }, orderBy: { sortOrder: "asc" } } },
  });

  const candidates = (salePage?.items ?? []).filter((it) => it.product.image1Url);
  const cards: { name: string; price: number; image: string | null }[] = [];
  for (const it of candidates) {
    if (cards.length >= 2) break;
    const image = await fetchCompatibleImage(it.product.image1Url);
    if (!image) continue;
    cards.push({
      name: it.product.name.length > 28 ? it.product.name.slice(0, 28) + "…" : it.product.name,
      price: Number(it.priceOverride ?? it.product.salePrice),
      image,
    });
  }

  const title = salePage?.title ?? "สบายพาณิชย์";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(to bottom, #0a3d2c, #04241a)",
          padding: 50,
        }}
      >
        <div style={{ display: "flex", color: "#fbbf24", fontSize: 32, fontWeight: 700, marginBottom: 14 }}>
          สบายพาณิชย์
        </div>
        <div
          style={{
            display: "flex",
            color: "white",
            fontSize: 46,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 44,
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
        {cards.length > 0 && (
          <div style={{ display: "flex", gap: 40 }}>
            {cards.map((card, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: "white",
                  borderRadius: 24,
                  overflow: "hidden",
                  width: 380,
                }}
              >
                {card.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={card.image} width={380} height={280} style={{ objectFit: "cover" }} />
                )}
                <div style={{ display: "flex", flexDirection: "column", padding: 22 }}>
                  <div style={{ display: "flex", fontSize: 26, color: "#111827", fontWeight: 700 }}>
                    {card.name}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: 30,
                      color: "#0a3d2c",
                      fontWeight: 700,
                      marginTop: 10,
                    }}
                  >
                    ฿{card.price.toLocaleString("th-TH")}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { ...size, fonts: [{ name: "Noto Sans Thai", data: fontData, style: "normal", weight: 700 }] }
  );
}
