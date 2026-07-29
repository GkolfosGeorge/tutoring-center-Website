import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN" || role === "SECRETARY";
}

export async function GET() {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const announcements = await prisma.announcement.findMany({
    include: { groups: { include: { group: { select: { id: true, name: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(announcements);
}

export async function POST(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { message, groupIds } = await req.json();

  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (!Array.isArray(groupIds) || groupIds.length === 0) {
    return NextResponse.json({ error: "Select at least one group" }, { status: 400 });
  }

  const announcement = await prisma.announcement.create({
    data: {
      message: message.trim(),
      groups: { create: (groupIds as string[]).map((groupId) => ({ groupId })) },
    },
    include: { groups: { include: { group: { select: { id: true, name: true } } } } },
  });

  return NextResponse.json(announcement, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

  await prisma.announcement.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
