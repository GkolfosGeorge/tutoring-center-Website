import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profileId = (session.user as any).studentProfileId;
  if (!profileId) return NextResponse.json([]);

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const studentGroups = await prisma.studentGroup.findMany({
    where: { studentId: profileId },
    include: { group: true },
  });
  if (studentGroups.length === 0) return NextResponse.json([]);

  const groupNames = studentGroups.map((sg) => sg.group.name);

  const where: any = { groupName: { in: groupNames } };
  if (from && to) {
    where.date = { gte: new Date(from + "T00:00:00.000Z"), lt: new Date(to + "T00:00:00.000Z") };
  }

  const events = await prisma.classEvent.findMany({
    where,
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  const scoped = events.filter((ev) => {
    const sg = studentGroups.find((s) => s.group.name === ev.groupName);
    if (!sg?.subjects) return true;
    try {
      const subs: string[] = JSON.parse(sg.subjects);
      return subs.length === 0 || subs.includes(ev.subject);
    } catch {
      return true;
    }
  });

  return NextResponse.json(
    scoped.map((e) => ({
      id: e.id,
      groupName: e.groupName,
      subject: e.subject,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      classroom: e.classroom,
    }))
  );
}
