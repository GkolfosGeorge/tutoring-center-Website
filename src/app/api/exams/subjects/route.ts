import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN" || role === "SECRETARY";
}

// Returns all distinct subjects that at least one student is enrolled in
export async function GET() {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.subjectEnrollment.findMany({
    distinct: ["subject"],
    select: { subject: true },
    orderBy: { subject: "asc" },
  });

  return NextResponse.json(rows.map(r => r.subject));
}
