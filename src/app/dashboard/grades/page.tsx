import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import GradesClient, { type GradeEntry } from "./GradesClient";

export const dynamic = "force-dynamic";

const EXAM_TYPE_LABELS: Record<string, string> = {
  EXAM: "Διαγώνισμα",
  TEST: "Τεστ",
  QUESTIONS: "Ερωτήσεις",
};

function legacyCategory(examType: string): "EXAM" | "TEST" | "QUESTIONS" {
  if (examType === "Διαγώνισμα" || examType === "Πανελλήνιες") return "EXAM";
  if (examType === "Τεστ") return "TEST";
  return "QUESTIONS";
}

function statsFor(scores: number[]) {
  if (scores.length === 0) return { count: 0, min: null, max: null, avg: null };
  return {
    count: scores.length,
    min: Math.min(...scores),
    max: Math.max(...scores),
    avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
  };
}

export default async function GradesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const profileId = (session.user as any).studentProfileId;
  if (!profileId) {
    return (
      <div className="text-center py-20 text-gray-400">
        Δεν βρέθηκε προφίλ μαθητή.
      </div>
    );
  }

  const [studentGroups, subjectEnrollments, legacyGrades, allLegacyGrades] = await Promise.all([
    prisma.studentGroup.findMany({ where: { studentId: profileId }, select: { groupId: true } }),
    prisma.subjectEnrollment.findMany({ where: { studentId: profileId }, select: { subject: true } }),
    prisma.grade.findMany({ where: { studentId: profileId }, orderBy: { date: "desc" } }),
    prisma.grade.findMany({ select: { subject: true, examType: true, score: true, maxScore: true, date: true } }),
  ]);

  const groupIds = studentGroups.map((g) => g.groupId);

  const examGroups = groupIds.length > 0
    ? await prisma.examGroup.findMany({
        where: { groupId: { in: groupIds } },
        include: { exam: { include: { grades: { where: { studentId: profileId } } } } },
      })
    : [];

  const seenExamIds = new Set<string>();
  const examEntriesRaw = examGroups.filter((eg) => {
    if (seenExamIds.has(eg.examId)) return false;
    seenExamIds.add(eg.examId);
    return true;
  });
  const examIds = examEntriesRaw.map((eg) => eg.examId);

  const allExamGrades = examIds.length > 0
    ? await prisma.examGrade.findMany({
        where: { examId: { in: examIds }, totalScore: { not: null }, absent: false },
        select: { examId: true, totalScore: true },
      })
    : [];

  const examStatsMap: Record<string, number[]> = {};
  for (const g of allExamGrades) {
    if (g.totalScore === null) continue;
    (examStatsMap[g.examId] ??= []).push(g.totalScore);
  }

  const examEntries: GradeEntry[] = examEntriesRaw.map((eg) => {
    const exam = eg.exam;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grade: any = exam.grades[0] ?? null;
    const absent = grade?.absent === true;
    const themeValues: (number | null)[] = grade ? [grade.theme1, grade.theme2, grade.theme3, grade.theme4] : [];
    const hasThemes = exam.examType === "EXAM" && !absent && themeValues.some((t) => t !== null);
    return {
      id: exam.id,
      subject: exam.subject,
      typeCategory: (exam.examType as "EXAM" | "TEST" | "QUESTIONS"),
      typeLabel: EXAM_TYPE_LABELS[exam.examType] ?? exam.examType,
      title: exam.title,
      score: absent ? null : (grade?.totalScore ?? null),
      maxScore: exam.scale,
      absent,
      date: grade?.writtenDate ?? exam.examDate ?? null,
      themes: hasThemes ? themeValues : null,
      classStats: statsFor(examStatsMap[exam.id] ?? []),
    };
  });

  const legacyKey = (g: { subject: string; examType: string; date: Date; maxScore: number }) =>
    `${g.subject}|${g.examType}|${g.date.toISOString().slice(0, 10)}|${g.maxScore}`;

  const legacyStatsMap: Record<string, number[]> = {};
  for (const g of allLegacyGrades) {
    (legacyStatsMap[legacyKey(g)] ??= []).push(g.score);
  }

  const legacyEntries: GradeEntry[] = legacyGrades.map((g) => ({
    id: g.id,
    subject: g.subject,
    typeCategory: legacyCategory(g.examType),
    typeLabel: g.examType,
    title: g.notes,
    score: g.score,
    maxScore: g.maxScore,
    absent: false,
    date: g.date.toISOString(),
    themes: null,
    classStats: statsFor(legacyStatsMap[legacyKey(g)] ?? []),
  }));

  const entries = [...examEntries, ...legacyEntries].sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date);
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });

  const subjects = Array.from(
    new Set([...subjectEnrollments.map((e) => e.subject), ...entries.map((e) => e.subject)])
  ).sort();

  return <GradesClient entries={entries} subjects={subjects} />;
}
