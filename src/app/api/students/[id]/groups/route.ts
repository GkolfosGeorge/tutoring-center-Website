import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN";
}

// POST: add student to a group, optionally with specific subjects
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: studentId } = await params;
  const { groupId, subjects } = await req.json();

  const subjectsJson = Array.isArray(subjects) && subjects.length > 0
    ? JSON.stringify(subjects)
    : null;

  let sg;
  try {
    sg = await prisma.studentGroup.create({
      data: Object.assign({ studentId, groupId }, subjectsJson !== null ? { subjects: subjectsJson } : {}),
    });
  } catch {
    return NextResponse.json({ error: "Already in group" }, { status: 400 });
  }

  // Auto-link student to existing future class events of this group
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (group) {
    const now = new Date();
    const futureEvents = await prisma.classEvent.findMany({
      where: { groupName: group.name, date: { gte: now } },
    });
    const enrollments = await prisma.subjectEnrollment.findMany({ where: { studentId } });
    const enrolledSubjects = new Set(enrollments.map(e => e.subject));
    const allowedSubjects: Set<string> = subjectsJson
      ? new Set(JSON.parse(subjectsJson))
      : enrolledSubjects;

    for (const event of futureEvents) {
      if (!allowedSubjects.has(event.subject)) continue;
      const enrollment = enrollments.find(e => e.subject === event.subject);
      if (!enrollment) continue;
      await prisma.sessionStatus.upsert({
        where: { enrollmentId_date: { enrollmentId: enrollment.id, date: event.date } },
        create: { enrollmentId: enrollment.id, date: event.date, held: true },
        update: {},
      });
    }
  }

  const full = await prisma.studentGroup.findUnique({
    where: { id: sg.id },
    include: { group: true },
  });
  return NextResponse.json(full, { status: 201 });
}

// PUT: update the subjects for an existing student-group membership
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: studentId } = await params;
  const { groupId, subjects } = await req.json();

  const subjectsJson = Array.isArray(subjects) && subjects.length > 0
    ? JSON.stringify(subjects)
    : null;

  const sg = await prisma.studentGroup.updateMany({
    where: { studentId, groupId },
    data: { subjects: subjectsJson },
  });

  return NextResponse.json({ success: true, count: sg.count });
}

// DELETE: remove student from a group by groupId query param
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: studentId } = await params;
  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("groupId");
  if (!groupId) return NextResponse.json({ error: "groupId required" }, { status: 400 });

  // Remove WeeklySlots tied to this group for this student
  await prisma.weeklySlot.deleteMany({ where: { groupId, enrollment: { studentId } } });
  await prisma.studentGroup.deleteMany({ where: { studentId, groupId } });
  return NextResponse.json({ success: true });
}
