import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  if (!session) return false;
  return (session.user as any).role === "ADMIN";
}

export async function GET() {
  const teachers = await prisma.teacher.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(teachers);
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, subject, bio } = await req.json();
  const teacher = await prisma.teacher.create({ data: { name, subject, bio } });
  return NextResponse.json(teacher, { status: 201 });
}
