import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const session = await auth();
  if (!session) return false;
  return (session.user as any).role === "ADMIN";
}

export async function GET() {
  const stories = await prisma.successStory.findMany({
    orderBy: [{ academicYear: "desc" }, { order: "asc" }],
  });
  return NextResponse.json(stories);
}

export async function POST(req: NextRequest) {
  if (!(await checkAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    firstName, lastName, academicYear, direction, directionTrack,
    university, department, grades, generalScore, admissionPoints,
  } = await req.json();

  if (!firstName?.trim() || !lastName?.trim() || !academicYear || !direction || !university?.trim()) {
    return NextResponse.json(
      { error: "Συμπληρώστε επώνυμο, όνομα, ακαδημαϊκό έτος, κατεύθυνση και ίδρυμα." },
      { status: 400 }
    );
  }

  const story = await prisma.successStory.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      academicYear: parseInt(academicYear),
      direction,
      directionTrack: direction === "Θετική" ? (directionTrack || null) : null,
      university: university.trim(),
      department: department?.trim() || null,
      grades: Array.isArray(grades) && grades.length > 0 ? JSON.stringify(grades) : null,
      generalScore: generalScore !== undefined && generalScore !== "" && generalScore !== null
        ? parseFloat(generalScore) : null,
      admissionPoints: admissionPoints !== undefined && admissionPoints !== "" && admissionPoints !== null
        ? parseFloat(admissionPoints) : null,
    },
  });

  return NextResponse.json(story, { status: 201 });
}
