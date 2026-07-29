import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EPAL_CLASSES } from "@/lib/subjects";
import FilesClient from "./FilesClient";

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const profileId = (session.user as any).studentProfileId;

  let classYear: string | null = null;
  let subjects: string[] = [];

  if (profileId) {
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      include: { enrollments: true },
    });
    classYear = profile?.classYear ?? null;
    subjects = Array.from(new Set(profile?.enrollments.map((e) => e.subject) ?? [])).sort();
  }

  const isEpal = classYear !== null && EPAL_CLASSES.includes(classYear);

  const files = subjects.length > 0
    ? await prisma.courseFile.findMany({
        where: {
          subject: { in: subjects },
          OR: [
            { classYear: null },
            { classYear: classYear ?? undefined },
            ...(isEpal ? [{ classYear: "ΕΠΑΛ" }] : []),
          ],
        },
        orderBy: { uploadedAt: "desc" },
      })
    : [];

  const filesJson = files.map((f) => ({
    id: f.id,
    title: f.title,
    subject: f.subject,
    category: f.category,
    isFlipbook: f.isFlipbook,
    // Flip book files are view-only — don't expose the direct static path to the client.
    fileName: f.isFlipbook ? "" : f.fileName,
    fileSize: f.fileSize,
    uploadedAt: f.uploadedAt.toISOString(),
  }));

  return <FilesClient files={filesJson} subjects={subjects} />;
}
