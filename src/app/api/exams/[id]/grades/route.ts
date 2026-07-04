import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN" || role === "SECRETARY";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: examId } = await params;
  const { studentId, theme1, theme2, theme3, theme4, totalScore, absent, writtenDate } = await req.json();

  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const data = {
    theme1: absent ? null : (theme1 ?? null),
    theme2: absent ? null : (theme2 ?? null),
    theme3: absent ? null : (theme3 ?? null),
    theme4: absent ? null : (theme4 ?? null),
    totalScore: absent ? null : (totalScore ?? null),
    absent: absent ?? false,
    writtenDate: writtenDate ?? null,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grade = await (prisma.examGrade as any).upsert({
    where: { examId_studentId: { examId, studentId } },
    create: { examId, studentId, ...data },
    update: data,
  });

  return NextResponse.json(grade);
}
