import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN";
}

export async function GET(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const enrollments = await prisma.subjectEnrollment.findMany({
    where: { studentId },
    include: { slots: true },
    orderBy: { subject: "asc" },
  });

  return NextResponse.json(enrollments);
}

export async function POST(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId, subject, costPerHour, durationMinutes } = await req.json();

  const existing = await prisma.subjectEnrollment.findFirst({
    where: { studentId, subject },
  });
  if (existing) return NextResponse.json({ error: "Ήδη εγγεγραμμένος σε αυτό το μάθημα" }, { status: 400 });

  const enrollment = await prisma.subjectEnrollment.create({
    data: {
      studentId,
      subject,
      costPerHour: parseFloat(costPerHour ?? 0),
      durationMinutes: parseInt(durationMinutes ?? 60),
    },
    include: { slots: true },
  });

  return NextResponse.json(enrollment, { status: 201 });
}
