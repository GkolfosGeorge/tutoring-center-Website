import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN" || role === "SECRETARY";
}

// GET /api/groups/subjects?name=GroupName
// Returns the list of subjects taught to the given group (from student enrollments)
export async function GET(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim();
  if (!name) return NextResponse.json([]);

  const group = await prisma.group.findUnique({ where: { name } });
  if (!group) return NextResponse.json([]);

  const studentGroups = await prisma.studentGroup.findMany({
    where: { groupId: group.id },
    include: { student: { include: { enrollments: true } } },
  });

  const subjects = new Set<string>();

  for (const sg of studentGroups) {
    if (sg.subjects) {
      try {
        (JSON.parse(sg.subjects) as string[]).forEach(s => subjects.add(s));
      } catch { /* ignore */ }
    } else {
      // null = all subjects — collect everything the student is enrolled in
      sg.student.enrollments.forEach(e => subjects.add(e.subject));
    }
  }

  return NextResponse.json([...subjects].sort());
}
