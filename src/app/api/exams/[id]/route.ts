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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      groups: { include: { group: { select: { id: true, name: true, classYear: true } } } },
      grades: {
        include: {
          student: { include: { user: { select: { name: true } } } },
        },
        orderBy: { student: { user: { name: "asc" } } },
      },
    },
  });

  if (!exam) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Find all students in the exam's groups that are enrolled in the exam's subject
  const groupIds = exam.groups.map(eg => eg.groupId);
  const studentGroups = await prisma.studentGroup.findMany({
    where: { groupId: { in: groupIds } },
    include: {
      group: { select: { name: true } },
      student: {
        include: {
          user: { select: { name: true } },
          enrollments: { select: { subject: true } },
        },
      },
    },
    orderBy: { group: { name: "asc" } },
  });

  // All students in the exam's groups — one entry per student, preserving first group encountered
  const seen = new Set<string>();
  const students: { id: string; name: string; groupName: string }[] = [];
  for (const sg of studentGroups) {
    if (seen.has(sg.studentId)) continue;
    seen.add(sg.studentId);
    students.push({ id: sg.studentId, name: sg.student.user.name, groupName: sg.group.name });
  }
  // Sort by group name first, then alphabetically within group
  students.sort((a, b) => {
    const gc = a.groupName.localeCompare(b.groupName, "el");
    return gc !== 0 ? gc : a.name.localeCompare(b.name, "el");
  });

  return NextResponse.json({ ...exam, students });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.exam.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  const uploadDir = join(process.cwd(), "public", "uploads", "exams");
  await mkdir(uploadDir, { recursive: true });

  async function saveFile(file: File): Promise<string> {
    const bytes = await file.arrayBuffer();
    const name = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await writeFile(join(uploadDir, name), Buffer.from(bytes));
    return `/uploads/exams/${name}`;
  }

  const ekfoniseisPath = ekfoniseis && ekfoniseis.size > 0 ? await saveFile(ekfoniseis) : existing.ekfoniseisPath;
  const lyseisPath = lyseis && lyseis.size > 0 ? await saveFile(lyseis) : existing.lyseisPath;

  await prisma.examGroup.deleteMany({ where: { examId: id } });

  const exam = await prisma.exam.update({
    where: { id },
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
      groups: { create: groupIds.map(gid => ({ groupId: gid })) },
    },
    include: {
      groups: { include: { group: { select: { id: true, name: true } } } },
      _count: { select: { grades: true } },
    },
  });

  return NextResponse.json(exam);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  await prisma.exam.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
