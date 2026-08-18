import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { FILE_CATEGORIES } from "@/lib/fileCategories";

async function checkAdmin() {
  const session = await auth();
  if (!session) return false;
  return (session.user as any).role === "ADMIN";
}

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const files = await prisma.courseFile.findMany({ orderBy: { uploadedAt: "desc" } });
  return NextResponse.json(files);
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const title = formData.get("title") as string;
  const subject = formData.get("subject") as string;
  const category = formData.get("category") as string;
  const classYear = formData.get("classYear") as string | null;
  const isFlipbook = formData.get("isFlipbook") === "true";

  if (!file || !title || !subject || !category) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (!(FILE_CATEGORIES as readonly string[]).includes(category)) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }
  if (isFlipbook && !file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json({ error: "Flip book files must be PDF" }, { status: 400 });
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
      category,
      classYear: classYear || null,
      isFlipbook,
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
