import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import AdminLayout from "@/components/admin/AdminLayout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as any).role;
  if (role === "STUDENT") redirect("/dashboard");

  return (
    <AdminLayout userName={session.user?.name ?? ""} role={role}>
      {children}
    </AdminLayout>
  );
}
