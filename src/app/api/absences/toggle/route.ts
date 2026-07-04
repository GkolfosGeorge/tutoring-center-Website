import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN" || role === "SECRETARY";
}

// POST: toggle absence for studentId + subject + date
export async function POST(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId, subject, date, justified } = await req.json();

  const dateObj = new Date(date);
  const dayStart = new Date(dateObj);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dateObj);
  dayEnd.setHours(23, 59, 59, 999);

  const existing = await prisma.absence.findFirst({
    where: {
      studentId,
      subject,
      date: { gte: dayStart, lte: dayEnd },
    },
  });

  if (existing) {
    await prisma.absence.delete({ where: { id: existing.id } });
    return NextResponse.json({ action: "removed", id: existing.id });
  } else {
    const absence = await prisma.absence.create({
      data: {
        studentId,
        subject,
        date: dateObj,
        justified: justified ?? false,
      },
    });
    return NextResponse.json({ action: "added", absence });
  }
}
