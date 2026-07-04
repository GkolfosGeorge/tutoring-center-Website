import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

async function checkAdmin() {
  const session = await auth();
  if (!session) return false;
  return (session.user as any).role === "ADMIN";
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const files = await prisma.courseFile.findMany({ orderBy: { uploadedAt: "desc" } });
  return NextResponse.json(files);
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const title = formData.get("title") as string;
  const subject = formData.get("subject") as string;
  const classYear = formData.get("classYear") as string | null;

  if (!file || !title || !subject) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const filePath = join(uploadDir, fileName);
  await writeFile(filePath, buffer);

  const record = await prisma.courseFile.create({
    data: {
      title,
      subject,
      classYear: classYear || null,
      fileName,
      filePath: `/uploads/${fileName}`,
      fileSize: file.size,
    },
  });

  return NextResponse.json(record, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "No id" }, { status: 400 });

  await prisma.courseFile.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
