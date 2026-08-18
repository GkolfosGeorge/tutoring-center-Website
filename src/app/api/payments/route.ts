import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN";
}

export async function GET(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const studentId = searchParams.get("studentId");

  const payments = await prisma.payment.findMany({
    where: studentId ? { studentId } : undefined,
    orderBy: { date: "desc" },
  });

  return NextResponse.json(payments);
}

// Record a payment and subtract from balance
export async function POST(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studentId, amount, date, description, paymentMethod } = await req.json();

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        studentId,
        amount: parseFloat(amount),
        date: new Date(date),
        description: description || "Πληρωμή",
        paymentMethod: paymentMethod || null,
        isPaid: true,
      },
    }),
    prisma.studentProfile.update({
      where: { id: studentId },
      data: { tuitionBalance: { decrement: parseFloat(amount) } },
    }),
  ]);

  return NextResponse.json(payment, { status: 201 });
}

// Delete a payment and restore the balance
export async function DELETE(req: NextRequest) {
  if (!(await checkStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.$transaction([
    prisma.payment.delete({ where: { id } }),
    prisma.studentProfile.update({
      where: { id: payment.studentId },
      data: { tuitionBalance: { increment: payment.amount } },
    }),
  ]);

  return NextResponse.json({ success: true });
}
