import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import StudentCard from "./StudentCard";

export const dynamic = "force-dynamic";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const profile = await prisma.studentProfile.findUnique({
    where: { id },
    include: {
      user: true,
      enrollments: { include: { slots: { include: { group: { select: { name: true } } } } }, orderBy: { subject: "asc" } },
      grades: { orderBy: { date: "desc" }, take: 10 },
      groups: { include: { group: true } },
    },
  });

  if (!profile) notFound();

  return <StudentCard profile={profile} />;
}
