import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN" || role === "SECRETARY";
}

export async function GET(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");

  const grades = await prisma.grade.findMany({
    where: studentId ? { studentId } : undefined,
    include: { student: { include: { user: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(grades);
}

export async function POST(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId, subject, examType, score, maxScore, date, notes } = await req.json();

  const grade = await prisma.grade.create({
    data: {
      studentId,
      subject,
      examType,
      score: parseFloat(score),
      maxScore: parseFloat(maxScore ?? 20),
      date: new Date(date),
      notes: notes || null,
    },
  });

  return NextResponse.json(grade, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

  await prisma.grade.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
