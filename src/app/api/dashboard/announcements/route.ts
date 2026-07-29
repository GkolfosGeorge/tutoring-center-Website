import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profileId = (session.user as any).studentProfileId;
  if (!profileId) return NextResponse.json({ announcements: [], unseenCount: 0 });

  const [profile, studentGroups] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { id: profileId }, select: { lastSeenAnnouncementsAt: true } }),
    prisma.studentGroup.findMany({ where: { studentId: profileId }, select: { groupId: true } }),
  ]);

  const groupIds = studentGroups.map((g) => g.groupId);
  if (groupIds.length === 0) return NextResponse.json({ announcements: [], unseenCount: 0 });

  const announcementGroups = await prisma.announcementGroup.findMany({
    where: { groupId: { in: groupIds } },
    include: { announcement: true },
  });

  const seen = new Set<string>();
  const announcements = announcementGroups
    .filter((ag) => {
      if (seen.has(ag.announcementId)) return false;
      seen.add(ag.announcementId);
      return true;
    })
    .map((ag) => ag.announcement)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 20);

  const lastSeen = profile?.lastSeenAnnouncementsAt ?? null;
  const unseenCount = lastSeen
    ? announcements.filter((a) => a.createdAt.getTime() > lastSeen.getTime()).length
    : announcements.length;

  return NextResponse.json({
    announcements: announcements.map((a) => ({
      id: a.id,
      message: a.message,
      createdAt: a.createdAt.toISOString(),
    })),
    unseenCount,
  });
}

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profileId = (session.user as any).studentProfileId;
  if (!profileId) return NextResponse.json({ success: true });

  await prisma.studentProfile.update({
    where: { id: profileId },
    data: { lastSeenAnnouncementsAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
