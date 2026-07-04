import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN" || role === "SECRETARY";
}

export async function GET() {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exams = await prisma.exam.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      groups: { include: { group: { select: { id: true, name: true } } } },
      _count: { select: { grades: true } },
    },
  });

  return NextResponse.json(exams);
}

export async function POST(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const title = formData.get("title") as string;
  const description = (formData.get("description") as string) || null;
  const subject = formData.get("subject") as string;
  const classYear = formData.get("classYear") as string;
  const examType = formData.get("examType") as string;
  const scaleRaw = formData.get("scale") as string;
  const scale = examType === "EXAM" ? 100 : Math.max(1, parseInt(scaleRaw) || 100);
  const examDate = (formData.get("examDate") as string) || null;
  const examTime = (formData.get("examTime") as string) || null;
  const groupIds: string[] = JSON.parse((formData.get("groupIds") as string) || "[]");
  const ekfoniseis = formData.get("ekfoniseis") as File | null;
  const lyseis = formData.get("lyseis") as File | null;

  if (!title?.trim() || !subject?.trim() || !classYear || !examType) {
    return NextResponse.json({ error: "Λείπουν υποχρεωτικά πεδία" }, { status: 400 });
  }

  const uploadDir = join(process.cwd(), "public", "uploads", "exams");
  await mkdir(uploadDir, { recursive: true });

  async function saveFile(file: File): Promise<string> {
    const bytes = await file.arrayBuffer();
    const name = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await writeFile(join(uploadDir, name), Buffer.from(bytes));
    return `/uploads/exams/${name}`;
  }

  const ekfoniseisPath = ekfoniseis && ekfoniseis.size > 0 ? await saveFile(ekfoniseis) : null;
  const lyseisPath = lyseis && lyseis.size > 0 ? await saveFile(lyseis) : null;

  const exam = await prisma.exam.create({
    data: {
      title: title.trim(),
      description,
      subject: subject.trim(),
      classYear,
      examType,
      scale,
      examDate,
      examTime,
      ekfoniseisPath,
      lyseisPath,
      groups: {
        create: groupIds.map(gid => ({ groupId: gid })),
      },
    },
    include: {
      groups: { include: { group: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json(exam, { status: 201 });
}
