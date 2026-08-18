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
  const { id } = await params;

  const exam = await prisma.exam.findUnique({ where: { id }, select: { scale: true, examType: true } });
  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grades = await (prisma.examGrade as any).findMany({
    where: { examId: id, totalScore: { not: null }, absent: false },
    select: {
      totalScore: true,
      theme1: true, theme2: true, theme3: true, theme4: true,
      studentId: true,
      student: { include: { user: { select: { name: true } } } },
    },
    orderBy: { totalScore: "desc" },
  }) as Array<{ totalScore: number; theme1: number | null; theme2: number | null; theme3: number | null; theme4: number | null; studentId: string; student: { user: { name: string } } }>;

  const rawScores = grades.map(g => g.totalScore!);
  const sorted = [...rawScores].sort((a, b) => a - b);
  const avg = rawScores.length > 0 ? rawScores.reduce((a, b) => a + b, 0) / rawScores.length : null;

  // Per-theme averages (for EXAM type)
  const themeAvgs = exam.examType === "EXAM" ? {
    theme1: avg != null && grades.some(g => g.theme1 !== null)
      ? grades.reduce((s, g) => s + (g.theme1 ?? 0), 0) / grades.filter(g => g.theme1 !== null).length
      : null,
    theme2: avg != null && grades.some(g => g.theme2 !== null)
      ? grades.reduce((s, g) => s + (g.theme2 ?? 0), 0) / grades.filter(g => g.theme2 !== null).length
      : null,
    theme3: avg != null && grades.some(g => g.theme3 !== null)
      ? grades.reduce((s, g) => s + (g.theme3 ?? 0), 0) / grades.filter(g => g.theme3 !== null).length
      : null,
    theme4: avg != null && grades.some(g => g.theme4 !== null)
      ? grades.reduce((s, g) => s + (g.theme4 ?? 0), 0) / grades.filter(g => g.theme4 !== null).length
      : null,
  } : null;

  // Leaderboard (anonymized rank list with student names)
  const rankedStudents = grades.map((g, idx) => ({
    studentId: g.studentId,
    name: g.student.user.name,
    totalScore: g.totalScore!,
    rank: idx + 1,
  }));

  return NextResponse.json({
    scale: exam.scale,
    examType: exam.examType,
    count: rawScores.length,
    min: sorted.length > 0 ? sorted[0] : null,
    max: sorted.length > 0 ? sorted[sorted.length - 1] : null,
    avg,
    scores: sorted,
    themeAvgs,
    rankedStudents,
  });
}
