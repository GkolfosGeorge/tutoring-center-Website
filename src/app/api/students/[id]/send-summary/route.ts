import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import nodemailer from "nodemailer";

async function checkStaff() {
  const session = await auth();
  if (!session) return false;
  const role = (session.user as any).role;
  return role === "ADMIN" || role === "SECRETARY";
}

export async function POST(req: NextRequest) {
  if (!(await checkStaff()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { htmlContent, parentEmail, parentName, studentName, emailSubject } = await req.json();

  if (!htmlContent || !parentEmail || !emailSubject)
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return NextResponse.json(
      { error: "Το SMTP δεν έχει διαμορφωθεί. Προσθέστε SMTP_HOST, SMTP_USER και SMTP_PASS στο αρχείο .env" },
      { status: 503 }
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });

  const greeting = parentName ? `Αγαπητέ/ή ${parentName},` : "Αγαπητέ/ή Κηδεμόνα,";

  const fullHtml = htmlContent.replace(
    "<body>",
    `<body><div style="font-family:Arial,sans-serif;font-size:9pt;color:#374151;margin-bottom:20px;padding:12px 16px;background:#f0f9ff;border-left:4px solid #1e40af;border-radius:4px;">${greeting}<br><br>Σας αποστέλλουμε την ενημέρωση για τον/την <strong>${studentName}</strong>.<br><br>Με εκτίμηση,<br>Apex Academy</div>`
  );

  await transporter.sendMail({
    from: `"Apex Academy" <${process.env.SMTP_FROM ?? user}>`,
    to: parentEmail,
    subject: emailSubject,
    html: fullHtml,
  });

  return NextResponse.json({ success: true });
}
