"use client";

import { getSubjectChipColor } from "@/lib/subjectColors";

export type GradeEntry = {
  id: string;
  subject: string;
  typeCategory: "EXAM" | "TEST" | "QUESTIONS";
  typeLabel: string;
  title: string | null;
  score: number | null;
  maxScore: number;
  absent: boolean;
  date: string | null;
  themes: (number | null)[] | null;
  classStats: { count: number; min: number | null; max: number | null; avg: number | null };
};

const TYPE_STYLE: Record<GradeEntry["typeCategory"], { border: string; label: string }> = {
  EXAM: { border: "border-l-red-400", label: "text-red-500" },
  TEST: { border: "border-l-blue-400", label: "text-blue-500" },
  QUESTIONS: { border: "border-l-purple-400", label: "text-purple-500" },
};

function getScoreColor(score: number, max: number) {
  const pct = score / max;
  if (pct >= 0.8) return "text-green-600";
  if (pct >= 0.6) return "text-yellow-600";
  return "text-red-600";
}

function toTwenty(score: number, max: number) {
  return Math.round((score / max) * 200) / 10;
}

export default function GradesClient({
  entries,
  subjects,
}: {
  entries: GradeEntry[];
  subjects: string[];
}) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Βαθμολογίες</h1>
        <p className="text-gray-500 mt-1">Παρακολούθηση επίδοσης ανά μάθημα</p>
      </div>

      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
      >
        {subjects.map((subject) => {
          const subjectEntries = entries.filter((e) => e.subject === subject);
          const clr = getSubjectChipColor(subjects, subject);

          return (
            <div key={subject}>
              <div
                className="rounded-xl px-3 py-2.5 mb-3 border text-center"
                style={{ backgroundColor: clr.bg, color: clr.text, borderColor: clr.border }}
              >
                <p className="text-sm font-bold truncate">{subject}</p>
              </div>

              <div className="space-y-2">
                {subjectEntries.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Δεν υπάρχουν βαθμολογίες.</p>
                ) : (
                  subjectEntries.map((entry) => {
                    const style = TYPE_STYLE[entry.typeCategory];
                    const hasGrade = !entry.absent && entry.score !== null;

                    return (
                      <div
                        key={entry.id}
                        className={`rounded-lg border border-l-4 ${style.border} shadow-sm p-3 ${
                          entry.absent ? "bg-red-50 border-red-100" : "bg-white border-gray-100"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className={`text-[10px] font-bold uppercase tracking-wide ${style.label}`}>
                              {entry.typeLabel}
                            </span>
                            {entry.title && (
                              <p
                                className={`text-xs font-semibold mt-0.5 leading-snug line-clamp-2 ${
                                  entry.absent ? "text-red-600" : "text-gray-900"
                                }`}
                              >
                                {entry.title}
                              </p>
                            )}
                            {entry.date && (
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {new Date(entry.date).toLocaleDateString("el-GR", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            {entry.absent ? (
                              <span className="text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded">
                                Απών
                              </span>
                            ) : hasGrade ? (
                              <>
                                <span className={`text-lg font-bold leading-none ${getScoreColor(entry.score!, entry.maxScore)}`}>
                                  {entry.score}
                                </span>
                                <span className="text-[10px] text-gray-400">/{entry.maxScore}</span>
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {toTwenty(entry.score!, entry.maxScore)}/20
                                </p>
                              </>
                            ) : (
                              <span className="text-[10px] text-gray-300 italic">Αδιόρθ.</span>
                            )}
                          </div>
                        </div>

                        {entry.themes && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {entry.themes.map((t, i) =>
                              t !== null ? (
                                <span
                                  key={i}
                                  className="text-[10px] bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-gray-500"
                                >
                                  Θ{i + 1}:<span className="font-semibold text-gray-700 ml-0.5">{t}</span>
                                </span>
                              ) : null
                            )}
                          </div>
                        )}

                        {entry.classStats.count > 0 && !entry.absent && (
                          <div className="flex justify-between text-[10px] mt-2 pt-2 border-t border-gray-50">
                            <span className="text-red-400 font-medium">Ελ. {entry.classStats.min}</span>
                            <span className="text-amber-500 font-medium">Μ.Ο. {entry.classStats.avg?.toFixed(1)}</span>
                            <span className="text-green-500 font-medium">Μεγ. {entry.classStats.max}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
