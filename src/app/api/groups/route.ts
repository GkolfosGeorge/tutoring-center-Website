import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN";
}

export async function GET() {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const groups = await prisma.group.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });
  return NextResponse.json(groups);
}

export async function POST(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, classYear } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });
  try {
    const group = await prisma.group.create({
      data: { name: name.trim(), classYear: classYear || null },
    });
    return NextResponse.json(group, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "Το τμήμα υπάρχει ήδη" }, { status: 400 });
    }
    return NextResponse.json({ error: "Σφάλμα κατά τη δημιουργία τμήματος" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.group.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
