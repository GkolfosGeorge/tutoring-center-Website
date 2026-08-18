import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN";
}

function normalizeDate(d: string | Date): Date {
  const date = new Date(d);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export async function GET(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  const month = searchParams.get("month"); // "2026-06"

  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  let dateFilter: any = {};
  if (month) {
    const [year, mon] = month.split("-").map(Number);
    dateFilter = {
      gte: new Date(Date.UTC(year, mon - 1, 1)),
      lt: new Date(Date.UTC(year, mon, 1)),
    };
  }

  const statuses = await prisma.sessionStatus.findMany({
    where: {
      enrollment: { studentId },
      ...(month ? { date: dateFilter } : {}),
    },
    include: { enrollment: true },
  });

  return NextResponse.json(statuses);
}

// POST: upsert one or many session statuses
// Body: { enrollmentId, date, held } or { sessions: [{enrollmentId, date, held}] }
export async function POST(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const items: { enrollmentId: string; date: string; held: boolean }[] =
    body.sessions ?? [body];

  const results = await Promise.all(
    items.map(({ enrollmentId, date, held }) =>
      prisma.sessionStatus.upsert({
        where: { enrollmentId_date: { enrollmentId, date: normalizeDate(date) } },
        create: { enrollmentId, date: normalizeDate(date), held },
        update: { held },
      })
    )
  );

  return NextResponse.json(results);
}

export async function DELETE(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.sessionStatus.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
