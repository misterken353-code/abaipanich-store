import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white p-4">
        <h2 className="mb-6 text-lg font-semibold text-green-700">สบายพาณิชย์</h2>
        <nav className="flex flex-col gap-2 text-sm">
          <Link href="/admin" className="rounded-lg px-3 py-2 hover:bg-gray-100">
            ภาพรวม
          </Link>
          <Link href="/admin/products" className="rounded-lg px-3 py-2 hover:bg-gray-100">
            สินค้า / Sync สต็อก
          </Link>
          <Link href="/admin/sale-pages" className="rounded-lg px-3 py-2 hover:bg-gray-100">
            เพจขาย
          </Link>
          <Link href="/admin/orders" className="rounded-lg px-3 py-2 hover:bg-gray-100">
            ออเดอร์ลูกค้า
          </Link>
          <Link href="/admin/riders" className="rounded-lg px-3 py-2 hover:bg-gray-100">
            คนขับ (ม้าเร็ว)
          </Link>
          <Link href="/admin/settings" className="rounded-lg px-3 py-2 hover:bg-gray-100">
            ตั้งค่า
          </Link>
        </nav>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
          className="mt-8"
        >
          <button className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
            ออกจากระบบ
          </button>
        </form>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
