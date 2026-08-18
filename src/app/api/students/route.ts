import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN";
}

export async function GET() {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const students = await prisma.studentProfile.findMany({
    include: {
      user: true,
      groups: { include: { group: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  return NextResponse.json(students);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const {
    name, username, password, classYear, direction, tuitionBalance,
    groupIds, schoolYear, firstName, lastName, phone, email,
    fatherName, fatherPhone, motherName, motherPhone, primaryContact,
    parentEmail, address, comments, afm, doy,
  } = await req.json();

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) return NextResponse.json({ error: "Username exists" }, { status: 400 });

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      username,
      password: hashed,
      role: "STUDENT",
      studentProfile: {
        create: {
          classYear, direction: direction || null,
          tuitionBalance: tuitionBalance ?? 0,
          schoolYear: schoolYear || null,
          firstName: firstName || null, lastName: lastName || null,
          phone: phone || null, email: email || null,
          fatherName: fatherName || null, fatherPhone: fatherPhone || null,
          motherName: motherName || null, motherPhone: motherPhone || null,
          primaryContact: primaryContact || null,
          parentEmail: parentEmail || null, address: address || null,
          comments: comments || null,
          afm: afm || null, doy: doy || null,
          ...(groupIds?.length > 0 ? {
            groups: {
              create: (groupIds as string[]).map((groupId: string) => ({ groupId })),
            },
          } : {}),
        },
      },
    },
    include: { studentProfile: { include: { groups: { include: { group: true } } } } },
  });

  return NextResponse.json(user, { status: 201 });
}
