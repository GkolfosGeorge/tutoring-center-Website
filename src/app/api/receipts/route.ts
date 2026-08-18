import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 });

  const role = (session.user as any).role;
  const ownProfileId = (session.user as any).studentProfileId;
  const isStaff = role === "ADMIN";
  if (!isStaff && studentId !== ownProfileId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const receipts = await prisma.receipt.findMany({
    where: { studentId },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(receipts);
}

export async function POST(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const studentId = formData.get("studentId") as string;
  const amount = formData.get("amount") as string;
  const date = formData.get("date") as string;

  if (!file || !studentId || !amount || !date) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadDir = join(process.cwd(), "public", "uploads", "receipts");
  await mkdir(uploadDir, { recursive: true });

  const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  await writeFile(join(uploadDir, fileName), buffer);

  const record = await prisma.receipt.create({
    data: {
      studentId,
      amount: parseFloat(amount),
      date: new Date(date),
      fileName,
      filePath: `/uploads/receipts/${fileName}`,
      fileSize: file.size,
    },
  });

  return NextResponse.json(record, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const receipt = await prisma.receipt.findUnique({ where: { id } });
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.receipt.delete({ where: { id } });
  await unlink(join(process.cwd(), "public", "uploads", "receipts", receipt.fileName)).catch(() => {});

  return NextResponse.json({ success: true });
}
