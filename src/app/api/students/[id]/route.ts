import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function checkAdmin() {
  const session = await auth();
  if (!session) return false;
  return (session.user as any).role === "ADMIN";
}

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const profile = await prisma.studentProfile.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, username: true } },
      enrollments: { select: { id: true, subject: true }, orderBy: { subject: "asc" } },
      groups: { select: { groupId: true, subjects: true } },
    },
  });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(profile);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const {
    name, username, password, classYear, direction, tuitionBalance,
    schoolYear, firstName, lastName, phone, email,
    fatherName, fatherPhone, motherName, motherPhone, primaryContact,
    parentEmail, address, comments, afm, doy,
  } = await req.json();

  const profile = await prisma.studentProfile.findUnique({ where: { id }, include: { user: true } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userUpdate: any = {};
  if (name) userUpdate.name = name;
  if (password) userUpdate.password = await bcrypt.hash(password, 10);
  if (username && username !== profile.user.username) {
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) return NextResponse.json({ error: "Username exists" }, { status: 400 });
    userUpdate.username = username;
  }

  if (Object.keys(userUpdate).length > 0) {
    await prisma.user.update({ where: { id: profile.userId }, data: userUpdate });
  }

  await prisma.studentProfile.update({
    where: { id },
    data: {
      classYear, direction: direction || null,
      tuitionBalance: tuitionBalance !== undefined ? parseFloat(tuitionBalance) : undefined,
      schoolYear: schoolYear !== undefined ? (schoolYear || null) : undefined,
      firstName: firstName !== undefined ? (firstName || null) : undefined,
      lastName: lastName !== undefined ? (lastName || null) : undefined,
      phone: phone !== undefined ? (phone || null) : undefined,
      email: email !== undefined ? (email || null) : undefined,
      fatherName: fatherName !== undefined ? (fatherName || null) : undefined,
      fatherPhone: fatherPhone !== undefined ? (fatherPhone || null) : undefined,
      motherName: motherName !== undefined ? (motherName || null) : undefined,
      motherPhone: motherPhone !== undefined ? (motherPhone || null) : undefined,
      primaryContact: primaryContact !== undefined ? (primaryContact || null) : undefined,
      parentEmail: parentEmail !== undefined ? (parentEmail || null) : undefined,
      address: address !== undefined ? (address || null) : undefined,
      comments: comments !== undefined ? (comments || null) : undefined,
      afm: afm !== undefined ? (afm || null) : undefined,
      doy: doy !== undefined ? (doy || null) : undefined,
    },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const profile = await prisma.studentProfile.findUnique({ where: { id } });
  if (!profile) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.user.delete({ where: { id: profile.userId } });
  return NextResponse.json({ success: true });
}
