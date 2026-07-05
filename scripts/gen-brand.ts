import sharp from "sharp";

const GOLD = "#c9a445";
const GOLD_LIGHT = "#e8cf85";
const DEEP = "#04241a";
const DEEP2 = "#0a3d2c";

// ==================== LOGO (512x512) ====================
const logoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="75%">
      <stop offset="0%" stop-color="${DEEP2}"/>
      <stop offset="100%" stop-color="${DEEP}"/>
    </radialGradient>
  </defs>
  <circle cx="256" cy="256" r="248" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="234" fill="none" stroke="${GOLD}" stroke-width="3"/>
  <circle cx="256" cy="256" r="222" fill="none" stroke="${GOLD}" stroke-width="1" opacity="0.6"/>

  <text x="256" y="318" font-size="230" fill="${GOLD_LIGHT}" text-anchor="middle" font-family="Angsana New, AngsanaUPC, serif" font-weight="bold">ส</text>

  <path d="M 150 340 L 362 340" stroke="${GOLD}" stroke-width="2" opacity="0.8"/>
  <circle cx="256" cy="340" r="4" fill="${GOLD}"/>
</svg>`;

// ==================== BANNER (1600x500) ====================
const W = 1600;
const H = 500;
const bannerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${DEEP2}"/>
      <stop offset="55%" stop-color="${DEEP}"/>
      <stop offset="100%" stop-color="#01140d"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>

  <!-- corner flourishes -->
  <path d="M 60 60 L 60 110 M 60 60 L 110 60" stroke="${GOLD}" stroke-width="2" opacity="0.7"/>
  <path d="M ${W - 60} 60 L ${W - 60} 110 M ${W - 60} 60 L ${W - 110} 60" stroke="${GOLD}" stroke-width="2" opacity="0.7"/>
  <path d="M 60 ${H - 60} L 60 ${H - 110} M 60 ${H - 60} L 110 ${H - 60}" stroke="${GOLD}" stroke-width="2" opacity="0.7"/>
  <path d="M ${W - 60} ${H - 60} L ${W - 60} ${H - 110} M ${W - 60} ${H - 60} L ${W - 110} ${H - 60}" stroke="${GOLD}" stroke-width="2" opacity="0.7"/>

  <!-- top/bottom double line frame -->
  <line x1="230" y1="150" x2="${W - 230}" y2="150" stroke="${GOLD}" stroke-width="1.5" opacity="0.75"/>
  <line x1="230" y1="158" x2="${W - 230}" y2="158" stroke="${GOLD}" stroke-width="1" opacity="0.4"/>
  <line x1="230" y1="360" x2="${W - 230}" y2="360" stroke="${GOLD}" stroke-width="1.5" opacity="0.75"/>
  <line x1="230" y1="352" x2="${W - 230}" y2="352" stroke="${GOLD}" stroke-width="1" opacity="0.4"/>

  <text x="${W / 2}" y="270" font-size="118" fill="${GOLD_LIGHT}" text-anchor="middle" font-family="Angsana New, AngsanaUPC, serif" font-weight="bold">สบายพาณิชย์</text>

  <path d="M ${W / 2 - 30} 305 L ${W / 2} 320 L ${W / 2 + 30} 305" fill="none" stroke="${GOLD}" stroke-width="2"/>
  <text x="${W / 2}" y="335" font-size="30" fill="${GOLD}" text-anchor="middle" font-family="Cordia New, Leelawadee UI, sans-serif" letter-spacing="2">ของดี ราคาคุ้มค่า จัดส่งถึงมือคุณ</text>
</svg>`;

async function main() {
  await sharp(Buffer.from(logoSvg)).png().toFile("public/logo.png");
  console.log("saved public/logo.png");

  await sharp(Buffer.from(bannerSvg)).png().toFile("public/banner.png");
  console.log("saved public/banner.png");

  // Next.js App Router auto-serves src/app/icon.png as the favicon
  await sharp(Buffer.from(logoSvg)).resize(256, 256).png().toFile("src/app/icon.png");
  console.log("saved src/app/icon.png (Next.js metadata file convention)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
