import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: studentId } = await params;

  const studentGroups = await prisma.studentGroup.findMany({
    where: { studentId },
    select: { groupId: true },
  });
  const groupIds = studentGroups.map(sg => sg.groupId);

  if (groupIds.length === 0) return NextResponse.json([]);

  const examGroups = await prisma.examGroup.findMany({
    where: { groupId: { in: groupIds } },
    include: {
      exam: {
        include: {
          grades: { where: { studentId } },
          groups: { include: { group: { select: { name: true } } } },
        },
      },
    },
  });

  const seenIds = new Set<string>();
  const examEntries = examGroups.filter(eg => {
    if (seenIds.has(eg.examId)) return false;
    seenIds.add(eg.examId);
    return true;
  });

  const examIds = examEntries.map(eg => eg.examId);

  // Class stats: exclude absent students
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allGrades = await (prisma.examGrade as any).findMany({
    where: { examId: { in: examIds }, totalScore: { not: null }, absent: false },
    select: { examId: true, totalScore: true },
  }) as Array<{ examId: string; totalScore: number }>;

  const statsMap: Record<string, number[]> = {};
  for (const g of allGrades) {
    if (!statsMap[g.examId]) statsMap[g.examId] = [];
    statsMap[g.examId].push(g.totalScore!);
  }

  const exams = examEntries
    .map(eg => {
      const scores = statsMap[eg.examId] ?? [];
      const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw: any = eg.exam.grades[0] ?? null;
      return {
        id: eg.exam.id,
        title: eg.exam.title,
        subject: eg.exam.subject,
        classYear: eg.exam.classYear,
        examType: eg.exam.examType,
        scale: eg.exam.scale,
        examDate: eg.exam.examDate,
        examTime: eg.exam.examTime,
        groups: eg.exam.groups.map((g: any) => g.group.name),
        grade: raw ? {
          theme1: raw.theme1,
          theme2: raw.theme2,
          theme3: raw.theme3,
          theme4: raw.theme4,
          totalScore: raw.totalScore,
          absent: raw.absent ?? false,
          writtenDate: raw.writtenDate ?? null,
        } : null,
        classStats: {
          count: scores.length,
          min: scores.length > 0 ? Math.min(...scores) : null,
          max: scores.length > 0 ? Math.max(...scores) : null,
          avg: avg !== null ? Math.round(avg * 100) / 100 : null,
        },
      };
    })
    .sort((a, b) => {
      if (a.examDate && b.examDate) return b.examDate.localeCompare(a.examDate);
      return 0;
    });

  return NextResponse.json(exams);
}
