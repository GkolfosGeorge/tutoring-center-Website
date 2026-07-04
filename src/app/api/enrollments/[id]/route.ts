import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN" || role === "SECRETARY";
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { costPerHour } = await req.json();

  const enrollment = await prisma.subjectEnrollment.update({
    where: { id },
    data: { costPerHour: parseFloat(costPerHour) },
    include: { slots: true },
  });

  return NextResponse.json(enrollment);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.subjectEnrollment.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
