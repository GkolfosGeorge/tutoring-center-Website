import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN";
}

// GET /api/class-events/attendance?groupName=X&subject=Y&date=YYYY-MM-DD
export async function GET(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const groupName = searchParams.get("groupName");
  const subject = searchParams.get("subject");
  const date = searchParams.get("date"); // YYYY-MM-DD (UTC)

  if (!groupName || !subject || !date) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({ where: { name: groupName } });
  if (!group) return NextResponse.json([]);

  const studentGroups = await prisma.studentGroup.findMany({
    where: { groupId: group.id },
    include: {
      student: {
        include: {
          user: true,
          enrollments: { where: { subject } },
        },
      },
    },
  });

  const targetDate = new Date(date + "T00:00:00.000Z");

  const result: {
    studentId: string;
    studentName: string;
    enrollmentId: string;
    held: boolean | null;
    absent: boolean;
  }[] = [];

  for (const sg of studentGroups) {
    // Check subject filter (null = all subjects)
    if (sg.subjects) {
      try {
        const subs: string[] = JSON.parse(sg.subjects);
        if (subs.length > 0 && !subs.includes(subject)) continue;
      } catch {}
    }

    if (sg.student.enrollments.length === 0) continue;
    const enrollment = sg.student.enrollments[0];

    const sessionStatus = await prisma.sessionStatus.findUnique({
      where: { enrollmentId_date: { enrollmentId: enrollment.id, date: targetDate } },
    });

    const absence = await prisma.absence.findFirst({
      where: { studentId: sg.studentId, subject, date: targetDate },
    });

    result.push({
      studentId: sg.studentId,
      studentName: sg.student.user.name,
      enrollmentId: enrollment.id,
      held: sessionStatus?.held ?? null,
      absent: !!absence,
    });
  }

  result.sort((a, b) => a.studentName.localeCompare(b.studentName, "el"));
  return NextResponse.json(result);
}
