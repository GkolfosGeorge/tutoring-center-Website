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

  const month = searchParams.get("month"); // "2026-06"
  let dateFilter: any = undefined;
  if (month) {
    const [year, mon] = month.split("-").map(Number);
    dateFilter = {
      gte: new Date(year, mon - 1, 1),
      lt: new Date(year, mon, 1),
    };
  }

  const absences = await prisma.absence.findMany({
    where: {
      ...(studentId ? { studentId } : {}),
      ...(dateFilter ? { date: dateFilter } : {}),
    },
    include: { student: { include: { user: true } } },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(absences);
}

export async function POST(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId, subject, date, justified, notes } = await req.json();

  const absence = await prisma.absence.create({
    data: {
      studentId,
      subject,
      date: new Date(date),
      justified: justified ?? false,
      notes: notes || null,
    },
  });

  return NextResponse.json(absence, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

  await prisma.absence.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
