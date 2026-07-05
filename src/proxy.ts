import { NextRequest, NextResponse } from "next/server";

// เฉพาะเส้นทาง /admin เท่านั้นที่ต้อง login — หน้าเพจขาย (/p/[slug]) เป็น public
export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const session =
    req.cookies.get("next-auth.session-token") ??
    req.cookies.get("__Secure-next-auth.session-token");

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
