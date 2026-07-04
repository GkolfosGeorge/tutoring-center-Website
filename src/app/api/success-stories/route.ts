import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  if (!session) return false;
  return (session.user as any).role === "ADMIN";
}

export async function GET() {
  const stories = await prisma.successStory.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(stories);
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, year, university, department } = await req.json();
  const story = await prisma.successStory.create({ data: { name, year: parseInt(year), university, department } });
  return NextResponse.json(story, { status: 201 });
}
