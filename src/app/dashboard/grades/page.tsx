import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GradesClient from "./GradesClient";

export const dynamic = "force-dynamic";

export default async function GradesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const profileId = (session.user as any).studentProfileId;
  if (!profileId) {
    return (
      <div className="text-center py-20 text-gray-400">
        Δεν βρέθηκε προφίλ μαθητή.
      </div>
    );
  }

  const grades = await prisma.grade.findMany({
    where: { studentId: profileId },
    orderBy: { date: "desc" },
  });

  const classGrades = await prisma.grade.findMany({
    include: { student: { include: { user: true } } },
  });

  return <GradesClient grades={grades} classGrades={classGrades} />;
}
