import sharp from "sharp";

// โทนสีตามโลโก้ใหม่ "สบายพาณิชย์" — เขียวใบไม้ + ส้มอำพัน บนพื้นครีม
const LEAF = "#4e9a2c"; // เขียวใบไม้ (ตัวบ้าน)
const LEAF_DARK = "#2f6b1c"; // เขียวเข้ม (หลังคา/ตัวอักษร)
const LEAF_DEEP = "#24541a"; // เขียวเข้มสุด (ไล่เฉด)
const ORANGE = "#f5a623"; // ส้มอำพัน (ตะกร้า/ดวงอาทิตย์)
const ORANGE_DARK = "#e08e12";
const CREAM = "#f4f8ee"; // พื้นครีมอมเขียว
const CREAM2 = "#eaf3e0";

// รูปบ้าน + ตะกร้า + ดวงอาทิตย์ ให้เข้ากับโลโก้ (ใช้ซ้ำทั้ง logo และ banner)
function house(scale: number, tx: number, ty: number): string {
  return `
  <g transform="translate(${tx} ${ty}) scale(${scale})">
    <!-- ดวงอาทิตย์ -->
    <circle cx="0" cy="-118" r="15" fill="${ORANGE}"/>
    <!-- หลังคา -->
    <path d="M -95 -30 L 0 -105 L 95 -30 Z" fill="${LEAF_DARK}"/>
    <!-- ปล่องไฟ -->
    <rect x="45" y="-88" width="20" height="38" rx="3" fill="${LEAF_DARK}"/>
    <!-- ตัวบ้าน -->
    <rect x="-72" y="-30" width="144" height="118" rx="8" fill="${LEAF}"/>
    <!-- ประตู -->
    <rect x="-20" y="30" width="40" height="58" rx="6" fill="${LEAF_DARK}"/>
    <circle cx="12" cy="60" r="3.5" fill="${CREAM}"/>
    <!-- หน้าต่างซ้าย/ขวา -->
    <g fill="${CREAM}">
      <rect x="-56" y="-8" width="30" height="30" rx="4"/>
      <rect x="26" y="-8" width="30" height="30" rx="4"/>
    </g>
    <g stroke="${LEAF}" stroke-width="3">
      <line x1="-41" y1="-8" x2="-41" y2="22"/>
      <line x1="-56" y1="7" x2="-26" y2="7"/>
      <line x1="41" y1="-8" x2="41" y2="22"/>
      <line x1="26" y1="7" x2="56" y2="7"/>
    </g>
    <!-- ตะกร้าสาน -->
    <g transform="translate(0 92)">
      <path d="M -34 -14 A 34 34 0 0 1 34 -14" fill="none" stroke="${ORANGE}" stroke-width="7" stroke-linecap="round"/>
      <path d="M -46 -6 L -38 46 L 38 46 L 46 -6 Z" fill="${ORANGE}"/>
      <g stroke="${ORANGE_DARK}" stroke-width="2.5" opacity="0.8">
        <line x1="0" y1="-6" x2="0" y2="46"/>
        <line x1="-42" y1="20" x2="42" y2="20"/>
      </g>
    </g>
  </g>`;
}

// ==================== LOGO (512x512) ====================
const logoSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="42%" r="72%">
      <stop offset="0%" stop-color="${CREAM}"/>
      <stop offset="100%" stop-color="${CREAM2}"/>
    </radialGradient>
  </defs>
  <circle cx="256" cy="256" r="248" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="236" fill="none" stroke="${LEAF}" stroke-width="4" opacity="0.35"/>
  ${house(1.55, 256, 250)}
</svg>`;

// ==================== BANNER (1600x500) ====================
const W = 1600;
const H = 500;
const bannerSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${LEAF}"/>
      <stop offset="55%" stop-color="${LEAF_DARK}"/>
      <stop offset="100%" stop-color="${LEAF_DEEP}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bgGrad)"/>

  <!-- ใบไม้จาง ๆ ตกแต่งมุม -->
  <g fill="#ffffff" opacity="0.06">
    <ellipse cx="140" cy="410" rx="120" ry="46" transform="rotate(-25 140 410)"/>
    <ellipse cx="1470" cy="120" rx="130" ry="50" transform="rotate(-25 1470 120)"/>
  </g>

  <!-- เส้นกรอบทอง/ส้มบาง -->
  <line x1="470" y1="150" x2="${W - 470}" y2="150" stroke="${ORANGE}" stroke-width="2" opacity="0.85"/>
  <line x1="470" y1="360" x2="${W - 470}" y2="360" stroke="${ORANGE}" stroke-width="2" opacity="0.85"/>

  <!-- บ้านฝั่งซ้าย -->
  ${house(1.0, 250, 250)}

  <!-- ชื่อร้าน -->
  <text x="${W / 2 + 60}" y="258" font-size="120" fill="#ffffff" text-anchor="middle" font-family="Angsana New, AngsanaUPC, serif" font-weight="bold">สบายพาณิชย์</text>
  <text x="${W / 2 + 60}" y="322" font-size="34" fill="${ORANGE}" text-anchor="middle" font-family="Cordia New, Leelawadee UI, sans-serif" letter-spacing="3">ร้านค้าอุปโภคบริโภคครบครัน</text>
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
