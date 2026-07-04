import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as any).role;
  if (role === "ADMIN" || role === "SECRETARY") redirect("/admin");

  return (
    <DashboardLayout userName={session.user?.name ?? "Μαθητής"}>
      {children}
    </DashboardLayout>
  );
}
