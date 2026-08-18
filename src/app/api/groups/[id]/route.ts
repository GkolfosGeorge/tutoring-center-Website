import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      members: {
        include: {
          student: {
            include: {
              user: { select: { name: true, username: true } },
              enrollments: { select: { id: true, subject: true }, orderBy: { subject: "asc" } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Parse subjects JSON field for each member
  const result = {
    ...group,
    members: group.members.map(m => ({
      ...m,
      subjects: m.subjects ? (() => { try { return JSON.parse(m.subjects!); } catch { return null; } })() : null,
    })),
  };

  return NextResponse.json(result);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const group = await prisma.group.findUnique({ where: { id } });
  if (!group) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.classEvent.deleteMany({ where: { groupName: group.name } });
  await prisma.group.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
