import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "สบายพาณิชย์ — สั่งซื้อออนไลน์",
  description: "เลือกสินค้า สั่งซื้อ และชำระเงินผ่าน PromptPay",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
