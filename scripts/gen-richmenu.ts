import sharp from "sharp";

const W = 2500;
const H = 843;
const COL = W / 3;

function col(i: number) {
  return { x0: i * COL, cx: i * COL + COL / 2 };
}

const c0 = col(0);
const c1 = col(1);
const c2 = col(2);

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4e9a2c"/>
      <stop offset="100%" stop-color="#2f6b1c"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="${c1.x0}" y="0" width="4" height="${H}" fill="#f5a623" opacity="0.55"/>
  <rect x="${c2.x0}" y="0" width="4" height="${H}" fill="#f5a623" opacity="0.55"/>

  <!-- Column 1: shopping bag -->
  <g transform="translate(${c0.cx}, 300)">
    <path d="M -90 -20 L -70 -100 L 70 -100 L 90 -20 Z" fill="none" stroke="white" stroke-width="14" stroke-linejoin="round"/>
    <rect x="-90" y="-20" width="180" height="140" rx="10" fill="none" stroke="white" stroke-width="14"/>
    <path d="M -40 -60 A 40 40 0 0 1 40 -60" fill="none" stroke="white" stroke-width="14" stroke-linecap="round"/>
  </g>
  <text x="${c0.cx}" y="520" font-size="70" font-weight="bold" fill="white" text-anchor="middle" font-family="Tahoma, Leelawadee UI, sans-serif">เลือกซื้อสินค้า</text>

  <!-- Column 2: cart -->
  <g transform="translate(${c1.cx}, 300)">
    <path d="M -100 -80 L -70 -80 L -30 60 L 90 60 L 110 -30 L -55 -30" fill="none" stroke="white" stroke-width="14" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="-15" cy="100" r="18" fill="none" stroke="white" stroke-width="12"/>
    <circle cx="70" cy="100" r="18" fill="none" stroke="white" stroke-width="12"/>
  </g>
  <text x="${c1.cx}" y="520" font-size="70" font-weight="bold" fill="white" text-anchor="middle" font-family="Tahoma, Leelawadee UI, sans-serif">ตะกร้าของฉัน</text>

  <!-- Column 3: chat -->
  <g transform="translate(${c2.cx}, 300)">
    <rect x="-100" y="-90" width="200" height="140" rx="24" fill="none" stroke="white" stroke-width="14"/>
    <path d="M -40 50 L -60 95 L -5 52 Z" fill="white" stroke="white" stroke-width="6" stroke-linejoin="round"/>
    <circle cx="-45" cy="-20" r="10" fill="white"/>
    <circle cx="0" cy="-20" r="10" fill="white"/>
    <circle cx="45" cy="-20" r="10" fill="white"/>
  </g>
  <text x="${c2.cx}" y="520" font-size="70" font-weight="bold" fill="white" text-anchor="middle" font-family="Tahoma, Leelawadee UI, sans-serif">ติดต่อร้าน</text>

  <text x="${W / 2}" y="700" font-size="40" fill="#ffe6b3" text-anchor="middle" font-family="Tahoma, Leelawadee UI, sans-serif">สบายพาณิชย์ — สั่งซื้อออนไลน์</text>
</svg>`;

sharp(Buffer.from(svg))
  .png()
  .toFile("scripts/richmenu.png")
  .then(() => console.log("saved richmenu.png"))
  .catch((e) => console.error("error", e));
