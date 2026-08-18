import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN";
}

function utcDay(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

async function studentsInGroup(groupName: string, subjectFilter: string) {
  const studentGroups = await prisma.studentGroup.findMany({
    where: { group: { name: groupName } },
    include: { student: { include: { enrollments: true } } },
  });

  return studentGroups
    .filter(sg => {
      if (!sg.subjects) return true;
      try {
        const subs: string[] = JSON.parse(sg.subjects);
        return subs.length === 0 || subs.includes(subjectFilter);
      } catch {
        return true;
      }
    })
    .map(sg => sg.student);
}

async function linkStudents(groupName: string, subject: string, date: Date) {
  const students = await studentsInGroup(groupName, subject);
  for (const student of students) {
    for (const enrollment of student.enrollments.filter(e => e.subject === subject)) {
      await prisma.sessionStatus.upsert({
        where: { enrollmentId_date: { enrollmentId: enrollment.id, date } },
        create: { enrollmentId: enrollment.id, date, held: true },
        update: { held: true },
      });
    }
  }
}

async function unlinkStudents(groupName: string, subject: string, date: Date) {
  const students = await studentsInGroup(groupName, subject);
  for (const student of students) {
    for (const enrollment of student.enrollments.filter(e => e.subject === subject)) {
      await prisma.sessionStatus.deleteMany({
        where: { enrollmentId: enrollment.id, date },
      });
    }
  }
}

export async function GET(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const groups = searchParams.get("groups");

  let where: any = {};
  if (from && to) {
    where.date = {
      gte: new Date(from + "T00:00:00.000Z"),
      lt: new Date(to + "T00:00:00.000Z"),
    };
  } else if (month) {
    const [y, m] = month.split("-").map(Number);
    where.date = {
      gte: new Date(Date.UTC(y, m - 1, 1)),
      lt: new Date(Date.UTC(y, m, 1)),
    };
  }
  if (groups) {
    const names = groups.split(",").map(g => g.trim()).filter(Boolean);
    if (names.length > 0) where.groupName = { in: names };
  }

  const events = await prisma.classEvent.findMany({
    where,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json(events);
}

export async function POST(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupName, groupId, subject, date, startTime, endTime, classroom, repeatWeeks, repeatUntil, notes, isWeekly } = await req.json();

  let weeks = 1;
  if (repeatUntil) {
    // Calculate weeks from start date to until date (inclusive)
    const start = new Date(date);
    const until = new Date(repeatUntil);
    const diffMs = until.getTime() - start.getTime();
    weeks = Math.max(1, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1);
  } else if (repeatWeeks) {
    weeks = Math.max(1, parseInt(repeatWeeks) || 1);
  }

  const recurrenceId = weeks > 1 ? crypto.randomUUID() : null;

  const created = [];
  for (let w = 0; w < weeks; w++) {
    const base = new Date(date);
    base.setDate(base.getDate() + w * 7);
    const eventDate = utcDay(
      `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`
    );

    const event = await prisma.classEvent.create({
      data: { groupName, subject, date: eventDate, startTime, endTime, classroom: classroom || null, recurrenceId, notes: notes || null },
    });
    created.push(event);
    await linkStudents(groupName, subject, eventDate);
  }

  if (isWeekly && groupId) {
    const firstDate = new Date(date);
    const jsDay = firstDate.getUTCDay();
    const storedDay = jsDay === 0 ? 6 : jsDay - 1;

    const studentGroups = await prisma.studentGroup.findMany({
      where: { groupId },
      include: { student: { include: { enrollments: true } } },
    });

    for (const sg of studentGroups) {
      let studiesSubject = false;
      if (!sg.subjects) {
        studiesSubject = true;
      } else {
        try {
          const subs: string[] = JSON.parse(sg.subjects);
          studiesSubject = subs.length === 0 || subs.includes(subject);
        } catch { studiesSubject = true; }
      }
      if (!studiesSubject) continue;

      const enrollment = sg.student.enrollments.find(e => e.subject === subject);
      if (!enrollment) continue;

      await prisma.weeklySlot.deleteMany({ where: { enrollmentId: enrollment.id, groupId } });
      await prisma.weeklySlot.create({
        data: { enrollmentId: enrollment.id, dayOfWeek: storedDay, startTime, endTime, groupId },
      });
    }
  }

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const recurrenceId = searchParams.get("recurrenceId");

  if (recurrenceId) {
    // Delete all occurrences in the series
    const events = await prisma.classEvent.findMany({ where: { recurrenceId } });
    for (const ev of events) {
      await unlinkStudents(ev.groupName, ev.subject, ev.date);
    }
    await prisma.classEvent.deleteMany({ where: { recurrenceId } });
    return NextResponse.json({ success: true });
  }

  if (!id) return NextResponse.json({ error: "id or recurrenceId required" }, { status: 400 });

  const event = await prisma.classEvent.findUnique({ where: { id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await unlinkStudents(event.groupName, event.subject, event.date);
  await prisma.classEvent.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
