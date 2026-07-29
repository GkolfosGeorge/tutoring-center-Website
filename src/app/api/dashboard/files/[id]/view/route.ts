import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import { join } from "path";
import { EPAL_CLASSES } from "@/lib/subjects";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const file = await prisma.courseFile.findUnique({ where: { id } });
  if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const role = (session.user as any).role;
  if (role === "STUDENT") {
    const profileId = (session.user as any).studentProfileId;
    const profile = profileId
      ? await prisma.studentProfile.findUnique({ where: { id: profileId }, include: { enrollments: true } })
      : null;
    const enrolledSubjects = profile?.enrollments.map((e) => e.subject) ?? [];
    const isEpal = !!profile?.classYear && EPAL_CLASSES.includes(profile.classYear);
    const entitled =
      enrolledSubjects.includes(file.subject) &&
      (file.classYear === null || file.classYear === profile?.classYear || (isEpal && file.classYear === "ΕΠΑΛ"));
    if (!entitled) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const diskPath = join(process.cwd(), "public", "uploads", file.fileName);
  const buffer = await readFile(diskPath);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
