"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Trash2, ChevronDown, ChevronRight, FileText,
  ClipboardList, Loader2, ExternalLink, Calendar, Clock,
  Folder, FolderOpen, Pencil, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Types ──────────────────────────────────────────────────────────────────

type ExamType = "EXAM" | "TEST" | "QUESTIONS";

type GroupSummary = { id: string; name: string };

type ExamSummary = {
  id: string;
  title: string;
  subject: string;
  classYear: string;
  examType: ExamType;
  scale: number;
  description: string | null;
  examDate: string | null;
  examTime: string | null;
  ekfoniseisPath: string | null;
  lyseisPath: string | null;
  createdAt: string;
  groups: { group: GroupSummary }[];
  _count: { grades: number };
};

type ExamGradeEntry = {
  studentId: string;
  theme1: number | null;
  theme2: number | null;
  theme3: number | null;
  theme4: number | null;
  totalScore: number | null;
  absent: boolean;
  writtenDate: string | null;
};

type ExamDetail = ExamSummary & {
  grades: ExamGradeEntry[];
  students: { id: string; name: string; groupName: string }[];
};

// ── Constants ──────────────────────────────────────────────────────────────

const CLASS_YEARS = [
  "Α' Λυκείου", "Β' Λυκείου", "Γ' Λυκείου",
  "Β' ΕΠΑΛ", "Γ' ΕΠΑΛ",
  "Α' Γυμνασίου", "Β' Γυμνασίου", "Γ' Γυμνασίου",
];

const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  EXAM: "Διαγώνισμα",
  TEST: "Τεστ",
  QUESTIONS: "Ερωτήσεις",
};

const EXAM_TYPE_COLORS: Record<ExamType, string> = {
  EXAM: "bg-red-100 text-red-700 border-red-200",
  TEST: "bg-blue-100 text-blue-700 border-blue-200",
  QUESTIONS: "bg-purple-100 text-purple-700 border-purple-200",
};

// ── Helpers ────────────────────────────────────────────────────────────────

function toScore100(score: number, scale: number): string {
  return ((score / scale) * 100).toFixed(1);
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Folder expansion (classYear and classYear||subject)
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  // Exam grade entry expansion
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ExamDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Form (create + edit)
  const [formMode, setFormMode] = useState<"hidden" | "create" | "edit">("hidden");
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [fTitle, setFTitle] = useState("");
  const [fDesc, setFDesc] = useState("");
  const [fSubject, setFSubject] = useState("");
  const [fClassYear, setFClassYear] = useState(CLASS_YEARS[0]);
  const [fExamType, setFExamType] = useState<ExamType>("EXAM");
  const [fScale, setFScale] = useState("20");
  const [fExamDate, setFExamDate] = useState("");
  const [fExamTime, setFExamTime] = useState("");
  const [fGroupIds, setFGroupIds] = useState<string[]>([]);
  const [fEkfoniseis, setFEkfoniseis] = useState<File | null>(null);
  const [fLyseis, setFLyseis] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Grade state
  const [pendingGrades, setPendingGrades] = useState<
    Record<string, { theme1?: number | null; theme2?: number | null; theme3?: number | null; theme4?: number | null; totalScore?: number | null; absent?: boolean; writtenDate?: string | null }>
  >({});
  const [savingGrades, setSavingGrades] = useState<Record<string, boolean>>({});

  // ── Grouping ──────────────────────────────────────────────────────────────

  const byYear = useMemo(() => {
    const map: Record<string, Record<string, ExamSummary[]>> = {};
    for (const exam of exams) {
      if (!map[exam.classYear]) map[exam.classYear] = {};
      if (!map[exam.classYear][exam.subject]) map[exam.classYear][exam.subject] = [];
      map[exam.classYear][exam.subject].push(exam);
    }
    return map;
  }, [exams]);

  const sortedYears = useMemo(() =>
    CLASS_YEARS.filter(y => byYear[y]).concat(Object.keys(byYear).filter(y => !CLASS_YEARS.includes(y))),
    [byYear]
  );

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadExams = useCallback(async () => {
    const res = await fetch("/api/exams");
    if (res.ok) setExams(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadExams();
    fetch("/api/groups").then(r => r.json()).then((gs: any[]) =>
      setGroups(Array.isArray(gs) ? gs.map(g => ({ id: g.id, name: g.name })) : [])
    );
    fetch("/api/exams/subjects").then(r => r.json()).then((subs: string[]) =>
      setAvailableSubjects(Array.isArray(subs) ? subs : [])
    );
  }, [loadExams]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    setPendingGrades({});
    const res = await fetch(`/api/exams/${id}`);
    if (res.ok) {
      const data: ExamDetail = await res.json();
      setDetail(data);
      const init: typeof pendingGrades = {};
      for (const g of data.grades) {
        init[g.studentId] = {
          theme1: g.theme1, theme2: g.theme2, theme3: g.theme3, theme4: g.theme4,
          totalScore: g.totalScore, absent: g.absent ?? false, writtenDate: g.writtenDate ?? null,
        };
      }
      setPendingGrades(init);
    }
    setDetailLoading(false);
  }, []);

  const handleExpandExam = useCallback(async (exam: ExamSummary) => {
    if (expandedExamId === exam.id) { setExpandedExamId(null); setDetail(null); return; }
    setExpandedExamId(exam.id);
    await loadDetail(exam.id);
  }, [expandedExamId, loadDetail]);

  // ── Folder navigation ─────────────────────────────────────────────────────

  function toggleYear(year: string) {
    setExpandedYears(prev => { const n = new Set(prev); n.has(year) ? n.delete(year) : n.add(year); return n; });
  }

  function toggleSubject(key: string) {
    setExpandedSubjects(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  // ── Form actions ──────────────────────────────────────────────────────────

  function resetForm() {
    setFTitle(""); setFDesc(""); setFSubject("");
    setFClassYear(CLASS_YEARS[0]); setFExamType("EXAM"); setFScale("20");
    setFExamDate(""); setFExamTime(""); setFGroupIds([]);
    setFEkfoniseis(null); setFLyseis(null); setEditingExamId(null);
  }

  function openCreate() { resetForm(); setFormMode("create"); }

  function openEdit(exam: ExamSummary) {
    setFTitle(exam.title);
    setFDesc(exam.description ?? "");
    setFSubject(exam.subject);
    setFClassYear(exam.classYear);
    setFExamType(exam.examType);
    setFScale(String(exam.scale));
    setFExamDate(exam.examDate ?? "");
    setFExamTime(exam.examTime ?? "");
    setFGroupIds(exam.groups.map(eg => eg.group.id));
    setFEkfoniseis(null); setFLyseis(null);
    setEditingExamId(exam.id);
    setFormMode("edit");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeForm() { resetForm(); setFormMode("hidden"); }

  async function submitForm() {
    if (!fTitle.trim() || !fSubject || fGroupIds.length === 0) {
      alert("Συμπληρώστε τίτλο, επιλέξτε μάθημα και τουλάχιστον ένα τμήμα.");
      return;
    }
    setSubmitting(true);
    const fd = new FormData();
    fd.append("title", fTitle.trim());
    fd.append("description", fDesc);
    fd.append("subject", fSubject);
    fd.append("classYear", fClassYear);
    fd.append("examType", fExamType);
    fd.append("scale", fExamType === "EXAM" ? "100" : fScale);
    if (fExamDate) fd.append("examDate", fExamDate);
    if (fExamTime) fd.append("examTime", fExamTime);
    fd.append("groupIds", JSON.stringify(fGroupIds));
    if (fEkfoniseis) fd.append("ekfoniseis", fEkfoniseis);
    if (fLyseis) fd.append("lyseis", fLyseis);

    const url = formMode === "edit" ? `/api/exams/${editingExamId}` : "/api/exams";
    const method = formMode === "edit" ? "PUT" : "POST";

    const res = await fetch(url, { method, body: fd });
    if (res.ok) {
      closeForm();
      await loadExams();
    } else {
      const d = await res.json();
      alert(d.error ?? "Σφάλμα");
    }
    setSubmitting(false);
  }

  async function deleteExam(exam: ExamSummary) {
    if (!confirm(`Διαγραφή εξέτασης "${exam.title}"; Θα διαγραφούν και όλες οι βαθμολογίες.`)) return;
    const res = await fetch(`/api/exams/${exam.id}`, { method: "DELETE" });
    if (!res.ok) { alert("Σφάλμα κατά τη διαγραφή"); return; }
    if (expandedExamId === exam.id) { setExpandedExamId(null); setDetail(null); }
    await loadExams();
  }

  // ── Grade entry ───────────────────────────────────────────────────────────

  function updatePending(
    studentId: string,
    field: "theme1" | "theme2" | "theme3" | "theme4" | "totalScore",
    raw: string
  ) {
    const val = raw === "" ? null : parseFloat(raw);
    setPendingGrades(prev => {
      const cur = prev[studentId] ?? {};
      const next = { ...cur, [field]: isNaN(val as number) ? null : val };
      if (detail?.examType === "EXAM" && field !== "totalScore") {
        const t1 = field === "theme1" ? (isNaN(val as number) ? null : val) : (next.theme1 ?? null);
        const t2 = field === "theme2" ? (isNaN(val as number) ? null : val) : (next.theme2 ?? null);
        const t3 = field === "theme3" ? (isNaN(val as number) ? null : val) : (next.theme3 ?? null);
        const t4 = field === "theme4" ? (isNaN(val as number) ? null : val) : (next.theme4 ?? null);
        const values = [t1, t2, t3, t4].filter(v => v !== null) as number[];
        next.totalScore = values.length > 0 ? parseFloat(values.reduce((a, b) => a + b, 0).toFixed(2)) : null;
      }
      return { ...prev, [studentId]: next };
    });
  }

  const saveGrade = useCallback(async (studentId: string, overrideGrades?: typeof pendingGrades) => {
    if (!detail) return;
    setSavingGrades(prev => ({ ...prev, [studentId]: true }));
    const g = (overrideGrades ?? pendingGrades)[studentId] ?? {};
    await fetch(`/api/exams/${detail.id}/grades`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId,
        theme1: g.theme1 ?? null, theme2: g.theme2 ?? null,
        theme3: g.theme3 ?? null, theme4: g.theme4 ?? null,
        totalScore: g.totalScore ?? null,
        absent: g.absent ?? false,
        writtenDate: g.writtenDate ?? null,
      }),
    });
    setSavingGrades(prev => ({ ...prev, [studentId]: false }));
  }, [detail, pendingGrades]);

  const toggleAbsent = useCallback(async (studentId: string) => {
    const cur = pendingGrades[studentId] ?? {};
    const newAbsent = !cur.absent;
    const updated = { ...pendingGrades, [studentId]: { ...cur, absent: newAbsent } };
    setPendingGrades(updated);
    await saveGrade(studentId, updated);
  }, [pendingGrades, saveGrade]);

  function setStudentDate(studentId: string, date: string) {
    setPendingGrades(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] ?? {}), writtenDate: date },
    }));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Τέστ / Διαγωνίσματα</h1>
          <p className="text-sm text-gray-500 mt-0.5">{exams.length} εξετάσεις</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Νέα Εξέταση
        </Button>
      </div>

      {/* ── Create / Edit form ── */}
      <AnimatePresence>
        {formMode !== "hidden" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl border border-blue-200 p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-800">
                  {formMode === "edit" ? "Επεξεργασία Εξέτασης" : "Νέα Εξέταση"}
                </h2>
                <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Exam type */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Είδος Εξέτασης *</label>
                <div className="flex gap-2">
                  {(["EXAM", "TEST", "QUESTIONS"] as ExamType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setFExamType(t)}
                      className={`flex-1 py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                        fExamType === t ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      {EXAM_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Main fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Τίτλος *</label>
                  <Input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder={`π.χ. ${EXAM_TYPE_LABELS[fExamType]} — Ιαν. 2026`} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Μάθημα *</label>
                  {availableSubjects.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      Δεν βρέθηκαν μαθήματα — χρειάζεται να υπάρχουν εγγεγραμμένοι μαθητές.
                    </p>
                  ) : (
                    <select
                      value={fSubject}
                      onChange={e => setFSubject(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">— Επιλογή μαθήματος —</option>
                      {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Τάξη *</label>
                  <select
                    value={fClassYear}
                    onChange={e => setFClassYear(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {CLASS_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                {fExamType !== "EXAM" ? (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Κλίμακα *</label>
                    <Input type="number" min="1" value={fScale} onChange={e => setFScale(e.target.value)} placeholder="π.χ. 20" />
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      Κλίμακα: <strong>100/100</strong>
                    </span>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    <Calendar className="w-3 h-3 inline mr-1" />Ημερομηνία
                  </label>
                  <Input type="date" value={fExamDate} onChange={e => setFExamDate(e.target.value)} />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                    <Clock className="w-3 h-3 inline mr-1" />Ώρα
                  </label>
                  <Input type="text" placeholder="π.χ. 09:00" value={fExamTime} onChange={e => setFExamTime(e.target.value)} />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Περιγραφή</label>
                  <Input value={fDesc} onChange={e => setFDesc(e.target.value)} placeholder="Προαιρετική περιγραφή..." />
                </div>
              </div>

              {/* Groups */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">Τμήματα που γράφουν *</label>
                {groups.length === 0 ? (
                  <p className="text-sm text-gray-400">Δεν υπάρχουν τμήματα</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {groups.map(g => (
                      <label key={g.id} className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg border transition-colors text-sm ${
                        fGroupIds.includes(g.id) ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 hover:border-blue-300"
                      }`}>
                        <input
                          type="checkbox"
                          className="rounded text-blue-600"
                          checked={fGroupIds.includes(g.id)}
                          onChange={() => setFGroupIds(prev =>
                            prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]
                          )}
                        />
                        {g.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Files */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Εκφωνήσεις (PDF)</label>
                  <input
                    type="file" accept=".pdf,.doc,.docx"
                    onChange={e => setFEkfoniseis(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                  {fEkfoniseis && <p className="text-xs text-gray-400 mt-1">{fEkfoniseis.name}</p>}
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">Λύσεις (PDF)</label>
                  <input
                    type="file" accept=".pdf,.doc,.docx"
                    onChange={e => setFLyseis(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  {fLyseis && <p className="text-xs text-gray-400 mt-1">{fLyseis.name}</p>}
                </div>
              </div>

              <div className="flex gap-3 pt-1 border-t border-gray-100">
                <Button onClick={submitForm} disabled={submitting} className="gap-2">
                  {submitting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : formMode === "edit" ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />
                  }
                  {formMode === "edit" ? "Αποθήκευση" : "Δημιουργία"}
                </Button>
                <Button variant="ghost" onClick={closeForm}>Ακύρωση</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {exams.length === 0 && formMode === "hidden" && (
        <div className="text-center py-20 text-gray-400">
          <ClipboardList className="w-14 h-14 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Δεν υπάρχουν εξετάσεις ακόμη</p>
          <p className="text-sm mt-1">Πατήστε «Νέα Εξέταση» για να ξεκινήσετε</p>
        </div>
      )}

      {/* ── Folder structure: classYear → subject → exams ── */}
      <div className="space-y-3">
        {sortedYears.map(year => {
          const subjectMap = byYear[year];
          const yearExpanded = expandedYears.has(year);
          const yearCount = Object.values(subjectMap).reduce((s, arr) => s + arr.length, 0);

          return (
            <div key={year} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Year folder */}
              <div
                className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors select-none"
                onClick={() => toggleYear(year)}
              >
                {yearExpanded
                  ? <FolderOpen className="w-5 h-5 text-yellow-500 shrink-0" />
                  : <Folder className="w-5 h-5 text-yellow-500 shrink-0" />
                }
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-gray-900">{year}</h2>
                  <p className="text-xs text-gray-400">
                    {Object.keys(subjectMap).length} μαθήματα · {yearCount} εξετάσεις
                  </p>
                </div>
                {yearExpanded
                  ? <ChevronDown className="w-5 h-5 text-gray-400" />
                  : <ChevronRight className="w-5 h-5 text-gray-400" />
                }
              </div>

              {/* Subject subfolders */}
              <AnimatePresence>
                {yearExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden border-t border-gray-100"
                  >
                    <div className="p-3 space-y-2">
                      {Object.entries(subjectMap)
                        .sort(([a], [b]) => a.localeCompare(b, "el"))
                        .map(([subject, subjectExams]) => {
                          const subKey = `${year}||${subject}`;
                          const subExpanded = expandedSubjects.has(subKey);

                          return (
                            <div key={subject} className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
                              {/* Subject subfolder */}
                              <div
                                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                                onClick={() => toggleSubject(subKey)}
                              >
                                {subExpanded
                                  ? <FolderOpen className="w-4 h-4 text-blue-400 shrink-0" />
                                  : <Folder className="w-4 h-4 text-blue-400 shrink-0" />
                                }
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-medium text-gray-800 text-sm">{subject}</h3>
                                </div>
                                <span className="text-xs text-gray-400 mr-1">{subjectExams.length} εξετ.</span>
                                {subExpanded
                                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                                  : <ChevronRight className="w-4 h-4 text-gray-400" />
                                }
                              </div>

                              {/* Exam cards */}
                              <AnimatePresence>
                                {subExpanded && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden border-t border-gray-100"
                                  >
                                    <div className="p-2 space-y-1.5">
                                      {[...subjectExams]
                                        .sort((a, b) => {
                                          if (a.examDate && b.examDate) return b.examDate.localeCompare(a.examDate);
                                          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                                        })
                                        .map(exam => (
                                          <ExamCard
                                            key={exam.id}
                                            exam={exam}
                                            expanded={expandedExamId === exam.id}
                                            detail={expandedExamId === exam.id ? detail : null}
                                            detailLoading={detailLoading && expandedExamId === exam.id}
                                            pendingGrades={pendingGrades}
                                            savingGrades={savingGrades}
                                            onExpand={() => handleExpandExam(exam)}
                                            onDelete={() => deleteExam(exam)}
                                            onEdit={() => openEdit(exam)}
                                            onUpdatePending={updatePending}
                                            onSaveGrade={saveGrade}
                                            onToggleAbsent={toggleAbsent}
                                            onSetDate={setStudentDate}
                                          />
                                        ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── ExamCard ──────────────────────────────────────────────────────────────

type ExamCardProps = {
  exam: ExamSummary;
  expanded: boolean;
  detail: ExamDetail | null;
  detailLoading: boolean;
  pendingGrades: Record<string, any>;
  savingGrades: Record<string, boolean>;
  onExpand: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onUpdatePending: (sid: string, field: "theme1" | "theme2" | "theme3" | "theme4" | "totalScore", raw: string) => void;
  onSaveGrade: (sid: string) => Promise<void>;
  onToggleAbsent: (sid: string) => Promise<void>;
  onSetDate: (sid: string, date: string) => void;
};

function ExamCard({ exam, expanded, detail, detailLoading, pendingGrades, savingGrades, onExpand, onDelete, onEdit, onUpdatePending, onSaveGrade, onToggleAbsent, onSetDate }: ExamCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors select-none"
        onClick={onExpand}
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          exam.examType === "EXAM" ? "bg-red-50" : exam.examType === "TEST" ? "bg-blue-50" : "bg-purple-50"
        }`}>
          <ClipboardList className={`w-4 h-4 ${
            exam.examType === "EXAM" ? "text-red-500" : exam.examType === "TEST" ? "text-blue-500" : "text-purple-500"
          }`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900 text-sm truncate">{exam.title}</h4>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${EXAM_TYPE_COLORS[exam.examType]}`}>
              {EXAM_TYPE_LABELS[exam.examType]}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            {exam.groups.map(eg => eg.group.name).join(", ")}
            {exam.examDate && ` · ${new Date(exam.examDate).toLocaleDateString("el-GR", { day: "numeric", month: "short", year: "numeric" })}`}
            {exam.examTime && ` ${exam.examTime}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
          {exam._count.grades > 0 && (
            <span className="text-xs text-gray-400">{exam._count.grades} βαθμ.</span>
          )}
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="Επεξεργασία"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Διαγραφή"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <div onClick={onExpand}>
          {expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Grade entry */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-gray-100"
          >
            {detailLoading || !detail ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              </div>
            ) : (
              <div className="p-4 space-y-4">
                <div className="flex flex-wrap gap-3 items-center">
                  {detail.description && <p className="text-sm text-gray-600 w-full">{detail.description}</p>}
                  {detail.examDate && (
                    <span className="flex items-center gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      {new Date(detail.examDate).toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                      {detail.examTime && <><Clock className="w-3.5 h-3.5 text-blue-400 ml-1" />{detail.examTime}</>}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">Κλίμακα: <strong>{detail.scale}</strong></span>
                  {detail.ekfoniseisPath && (
                    <a href={detail.ekfoniseisPath} target="_blank" className="flex items-center gap-1 text-xs text-orange-600 hover:underline">
                      <FileText className="w-3.5 h-3.5" /> Εκφωνήσεις <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {detail.lyseisPath && (
                    <a href={detail.lyseisPath} target="_blank" className="flex items-center gap-1 text-xs text-green-600 hover:underline">
                      <FileText className="w-3.5 h-3.5" /> Λύσεις <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {detail.students.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">
                    Δεν βρέθηκαν μαθητές για τα επιλεγμένα τμήματα.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-100">
                    {detail.examType === "EXAM" ? (
                      <ExamGradeTable students={detail.students} pendingGrades={pendingGrades} savingGrades={savingGrades} scale={detail.scale} examDate={detail.examDate} onUpdate={onUpdatePending} onSave={onSaveGrade} onToggleAbsent={onToggleAbsent} onSetDate={onSetDate} />
                    ) : (
                      <SimpleGradeTable students={detail.students} pendingGrades={pendingGrades} savingGrades={savingGrades} scale={detail.scale} examDate={detail.examDate} onUpdate={onUpdatePending} onSave={onSaveGrade} onToggleAbsent={onToggleAbsent} onSetDate={onSetDate} />
                    )}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Grade tables ──────────────────────────────────────────────────────────

const GROUP_COLORS = [
  { row: "bg-blue-50/60", header: "bg-blue-100 text-blue-800 border-blue-200" },
  { row: "bg-green-50/60", header: "bg-green-100 text-green-800 border-green-200" },
  { row: "bg-amber-50/60", header: "bg-amber-100 text-amber-800 border-amber-200" },
  { row: "bg-purple-50/60", header: "bg-purple-100 text-purple-800 border-purple-200" },
  { row: "bg-rose-50/60", header: "bg-rose-100 text-rose-800 border-rose-200" },
  { row: "bg-teal-50/60", header: "bg-teal-100 text-teal-800 border-teal-200" },
  { row: "bg-orange-50/60", header: "bg-orange-100 text-orange-800 border-orange-200" },
  { row: "bg-indigo-50/60", header: "bg-indigo-100 text-indigo-800 border-indigo-200" },
];

type GradeTableProps = {
  students: { id: string; name: string; groupName: string }[];
  pendingGrades: Record<string, any>;
  savingGrades: Record<string, boolean>;
  scale: number;
  examDate: string | null;
  onUpdate: (sid: string, field: "theme1" | "theme2" | "theme3" | "theme4" | "totalScore", raw: string) => void;
  onSave: (sid: string) => Promise<void>;
  onToggleAbsent: (sid: string) => Promise<void>;
  onSetDate: (sid: string, date: string) => void;
};

function numStr(v: number | null | undefined): string {
  return v === null || v === undefined ? "" : String(v);
}

function buildGroups(students: { id: string; name: string; groupName: string }[]) {
  const order: string[] = [];
  const map: Record<string, { id: string; name: string; groupName: string }[]> = {};
  for (const s of students) {
    if (!map[s.groupName]) { order.push(s.groupName); map[s.groupName] = []; }
    map[s.groupName].push(s);
  }
  return order.map((name, idx) => ({ name, students: map[name], colorIdx: idx % GROUP_COLORS.length }));
}

function AbsentButton({ absent, onToggle }: { absent: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`text-xs px-2 py-1 rounded-lg border font-medium transition-all ${
        absent
          ? "bg-red-100 border-red-300 text-red-700"
          : "bg-white border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200"
      }`}
    >
      {absent ? "Απών" : "—"}
    </button>
  );
}

function ExamGradeTable({ students, pendingGrades, savingGrades, scale, examDate, onUpdate, onSave, onToggleAbsent, onSetDate }: GradeTableProps) {
  const groups = buildGroups(students);
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <th className="px-4 py-2.5 text-left border-b border-gray-100 min-w-[200px]">Μαθητής / Ημ/νία</th>
          {["Θέμα 1", "Θέμα 2", "Θέμα 3", "Θέμα 4"].map(t => (
            <th key={t} className="px-2 py-2.5 text-center border-b border-gray-100 w-20">{t}</th>
          ))}
          <th className="px-3 py-2.5 text-center border-b border-gray-100 w-28 bg-blue-50 text-blue-700">ΣΥΝΟΛΟ /{scale}</th>
          <th className="px-3 py-2.5 text-center border-b border-gray-100 w-24 bg-red-50 text-red-600">Δεν έγρ.</th>
          <th className="px-3 py-2.5 border-b border-gray-100 w-8"></th>
        </tr>
      </thead>
      <tbody>
        {groups.map(group => (
          <>
            <tr key={`hdr-${group.name}`}>
              <td colSpan={8} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider border-b border-t ${group.colorIdx !== undefined ? GROUP_COLORS[group.colorIdx].header : ""}`}>
                {group.name} <span className="font-normal opacity-60">({group.students.length} μαθητές)</span>
              </td>
            </tr>
            {group.students.map(s => {
              const g = pendingGrades[s.id] ?? {};
              const saving = savingGrades[s.id] ?? false;
              const absent = g.absent ?? false;
              const rowDate = g.writtenDate ?? examDate ?? "";
              const rowBg = absent ? "bg-red-50/60" : GROUP_COLORS[group.colorIdx].row;
              return (
                <tr key={s.id} className={`transition-colors ${rowBg}`}>
                  <td className="px-4 py-2 border-b border-gray-100">
                    <p className={`font-medium text-sm ${absent ? "text-red-500 line-through" : "text-gray-800"}`}>{s.name}</p>
                    <input
                      type="date"
                      value={rowDate}
                      onChange={e => onSetDate(s.id, e.target.value)}
                      onBlur={() => onSave(s.id)}
                      className="mt-0.5 h-6 text-[11px] rounded border border-gray-200 px-1.5 text-gray-500 bg-white"
                    />
                  </td>
                  {(["theme1", "theme2", "theme3", "theme4"] as const).map(field => (
                    <td key={field} className="px-2 py-2 border-b border-gray-100">
                      <Input
                        type="number" min="0" max={scale} step="0.25"
                        value={absent ? "" : numStr(g[field])}
                        onChange={e => onUpdate(s.id, field, e.target.value)}
                        onBlur={() => onSave(s.id)}
                        disabled={absent}
                        className={`w-16 h-7 text-sm text-center px-1 ${absent ? "opacity-30" : ""}`}
                        placeholder="—"
                      />
                    </td>
                  ))}
                  <td className="px-3 py-2 border-b border-gray-100 bg-blue-50/40">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number" min="0" max={scale} step="0.25"
                        value={absent ? "" : numStr(g.totalScore)}
                        onChange={e => onUpdate(s.id, "totalScore", e.target.value)}
                        onBlur={() => onSave(s.id)}
                        disabled={absent}
                        className={`w-16 h-7 text-sm text-center px-1 font-semibold border-blue-200 bg-blue-50 ${absent ? "opacity-30" : ""}`}
                        placeholder="—"
                      />
                      <span className="text-xs text-gray-400">/{scale}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 border-b border-gray-100 text-center bg-red-50/30">
                    <AbsentButton absent={absent} onToggle={() => onToggleAbsent(s.id)} />
                  </td>
                  <td className="px-2 py-2 border-b border-gray-100 text-center">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 mx-auto" /> : <span className="text-xs text-gray-300">✓</span>}
                  </td>
                </tr>
              );
            })}
          </>
        ))}
      </tbody>
    </table>
  );
}

function SimpleGradeTable({ students, pendingGrades, savingGrades, scale, examDate, onUpdate, onSave, onToggleAbsent, onSetDate }: GradeTableProps) {
  const groups = buildGroups(students);
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <th className="px-4 py-2.5 text-left border-b border-gray-100 min-w-[200px]">Μαθητής / Ημ/νία</th>
          <th className="px-3 py-2.5 text-center border-b border-gray-100 w-32">Βαθμός /{scale}</th>
          <th className="px-3 py-2.5 text-center border-b border-gray-100 w-32 bg-blue-50 text-blue-700">Αναγωγή /100</th>
          <th className="px-3 py-2.5 text-center border-b border-gray-100 w-24 bg-red-50 text-red-600">Δεν έγρ.</th>
          <th className="px-3 py-2.5 border-b border-gray-100 w-8"></th>
        </tr>
      </thead>
      <tbody>
        {groups.map(group => (
          <>
            <tr key={`hdr-${group.name}`}>
              <td colSpan={5} className={`px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider border-b border-t ${GROUP_COLORS[group.colorIdx].header}`}>
                {group.name} <span className="font-normal opacity-60">({group.students.length} μαθητές)</span>
              </td>
            </tr>
            {group.students.map(s => {
              const g = pendingGrades[s.id] ?? {};
              const saving = savingGrades[s.id] ?? false;
              const absent = g.absent ?? false;
              const score = g.totalScore;
              const rowDate = g.writtenDate ?? examDate ?? "";
              const converted = !absent && score !== null && score !== undefined ? toScore100(score, scale) : null;
              const rowBg = absent ? "bg-red-50/60" : GROUP_COLORS[group.colorIdx].row;
              return (
                <tr key={s.id} className={`transition-colors ${rowBg}`}>
                  <td className="px-4 py-2 border-b border-gray-100">
                    <p className={`font-medium text-sm ${absent ? "text-red-500 line-through" : "text-gray-800"}`}>{s.name}</p>
                    <input
                      type="date"
                      value={rowDate}
                      onChange={e => onSetDate(s.id, e.target.value)}
                      onBlur={() => onSave(s.id)}
                      className="mt-0.5 h-6 text-[11px] rounded border border-gray-200 px-1.5 text-gray-500 bg-white"
                    />
                  </td>
                  <td className="px-3 py-2 border-b border-gray-100">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number" min="0" max={scale} step="0.25"
                        value={absent ? "" : numStr(score)}
                        onChange={e => onUpdate(s.id, "totalScore", e.target.value)}
                        onBlur={() => onSave(s.id)}
                        disabled={absent}
                        className={`w-20 h-7 text-sm text-center px-1 ${absent ? "opacity-30" : ""}`}
                        placeholder="—"
                      />
                      <span className="text-xs text-gray-400">/{scale}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 border-b border-gray-100 text-center bg-blue-50/40">
                    {converted !== null
                      ? <span className="font-semibold text-blue-700">{converted}<span className="text-xs font-normal text-blue-400">/100</span></span>
                      : <span className="text-gray-300">—</span>
                    }
                  </td>
                  <td className="px-3 py-2 border-b border-gray-100 text-center bg-red-50/30">
                    <AbsentButton absent={absent} onToggle={() => onToggleAbsent(s.id)} />
                  </td>
                  <td className="px-2 py-2 border-b border-gray-100 text-center">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400 mx-auto" /> : <span className="text-xs text-gray-300">✓</span>}
                  </td>
                </tr>
              );
            })}
          </>
        ))}
      </tbody>
    </table>
  );
}
