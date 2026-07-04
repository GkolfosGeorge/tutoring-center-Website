"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight,
  BookOpen, Clock, Calendar, X, Check, AlertCircle,
  CreditCard, User, ChevronDown, Save, Banknote, ClipboardList, FileText,
  Receipt, Upload, Download, CheckCircle2,
} from "lucide-react";
import StudentSummary from "./StudentSummary";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { getSubjectsForStudent, DAYS_GR, CLASS_YEARS, DIRECTIONS_BY_CLASS, LYCEUM_WITH_DIRECTIONS } from "@/lib/subjects";

type WeeklySlot = { id: string; dayOfWeek: number; startTime: string; endTime: string; groupId: string | null; group: { name: string } | null };
type Enrollment = { id: string; subject: string; costPerHour: number; durationMinutes: number; slots: WeeklySlot[] };
type SessionStatus = { id: string; enrollmentId: string; date: string; held: boolean };
type Absence = { id: string; subject: string; date: string; justified: boolean };
type Payment = { id: string; amount: number; date: string; description: string; paymentMethod: string | null };
type ReceiptRow = { id: string; amount: number; date: string; fileName: string; filePath: string; fileSize: number; uploadedAt: string };
type GroupClassEvent = {
  id: string; groupName: string; subject: string;
  date: string; startTime: string; endTime: string; classroom: string | null;
};

type StudentExam = {
  id: string;
  title: string;
  subject: string;
  classYear: string;
  examType: "EXAM" | "TEST" | "QUESTIONS";
  scale: number;
  examDate: string | null;
  examTime: string | null;
  groups: string[];
  grade: {
    theme1: number | null; theme2: number | null;
    theme3: number | null; theme4: number | null;
    totalScore: number | null;
    absent: boolean;
    writtenDate: string | null;
  } | null;
  classStats: { count: number; min: number | null; max: number | null; avg: number | null };
};

const EXAM_TYPE_LABELS: Record<string, string> = { EXAM: "Διαγώνισμα", TEST: "Τεστ", QUESTIONS: "Ερωτήσεις" };

type StudentGroup = { id: string; groupId: string; subjects: string | null; group: { id: string; name: string } };

type Profile = {
  id: string;
  classYear: string;
  direction: string | null;
  tuitionBalance: number;
  schoolYear: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  email: string | null;
  fatherName: string | null;
  fatherPhone: string | null;
  motherName: string | null;
  motherPhone: string | null;
  primaryContact: string | null;
  parentEmail: string | null;
  address: string | null;
  comments: string | null;
  afm: string | null;
  doy: string | null;
  user: { name: string; username: string };
  enrollments: Enrollment[];
  grades: any[];
  groups: StudentGroup[];
};

const SUBJECT_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-teal-100 text-teal-800 border-teal-200",
];

function getSubjectColor(enrollments: Enrollment[], subject: string) {
  const idx = enrollments.findIndex(e => e.subject === subject);
  return SUBJECT_COLORS[idx % SUBJECT_COLORS.length];
}

const MONTH_NAMES = [
  "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
  "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος",
];

const PAYMENT_METHODS = ["Μετρητά", "Κάρτα", "Κατάθεση"];

function toUTCDateKey(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Converts a local-midnight Date to UTC midnight ISO string for API calls
function localDateToUTC(date: Date): string {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();
}

export default function StudentCard({ profile: initialProfile }: { profile: Profile }) {
  const [balance, setBalance] = useState(initialProfile.tuitionBalance);
  const [enrollments, setEnrollments] = useState<Enrollment[]>(initialProfile.enrollments);
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>(initialProfile.groups);
  const [allGroups, setAllGroups] = useState<{ id: string; name: string }[]>([]);
  const [groupSearch, setGroupSearch] = useState("");
  const [groupDropOpen, setGroupDropOpen] = useState(false);
  const [pendingGroup, setPendingGroup] = useState<{ id: string; name: string } | null>(null);
  const [pendingSubjects, setPendingSubjects] = useState<string[]>([]);
  const [sessions, setSessions] = useState<SessionStatus[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [receiptForm, setReceiptForm] = useState({
    amount: "", date: new Date().toISOString().split("T")[0], file: null as File | null,
  });
  const [receiptUploading, setReceiptUploading] = useState(false);
  const receiptFileInputRef = useRef<HTMLInputElement>(null);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const [activeTab, setActiveTab] = useState<"calendar" | "enrollments" | "payments" | "exams" | "summary">("calendar");
  const [studentExams, setStudentExams] = useState<StudentExam[]>([]);
  const [examsLoading, setExamsLoading] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newSpecialtyName, setNewSpecialtyName] = useState("");
  const [newCost, setNewCost] = useState("");
  const [newDuration, setNewDuration] = useState(60);
  const [showSlotForm, setShowSlotForm] = useState<string | null>(null);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [costEditValue, setCostEditValue] = useState("");
  const [slotForm, setSlotForm] = useState({ dayOfWeek: "1", startTime: "16:00", endTime: "18:00" });
  const [calLoading, setCalLoading] = useState(false);
  const [groupClassEvents, setGroupClassEvents] = useState<GroupClassEvent[]>([]);
  const [dayModal, setDayModal] = useState<{
    date: Date;
    slots: { enrollment: Enrollment; slot: WeeklySlot }[];
    groupEvents: GroupClassEvent[];
  } | null>(null);

  const [showDetails, setShowDetails] = useState(false);
  function buildDf() {
    return {
      firstName: initialProfile.firstName ?? "",
      lastName: initialProfile.lastName ?? "",
      phone: initialProfile.phone ?? "",
      email: initialProfile.email ?? "",
      fatherName: initialProfile.fatherName ?? "",
      fatherPhone: initialProfile.fatherPhone ?? "",
      motherName: initialProfile.motherName ?? "",
      motherPhone: initialProfile.motherPhone ?? "",
      primaryContact: (initialProfile.primaryContact as "FATHER" | "MOTHER" | null) ?? "FATHER",
      parentEmail: initialProfile.parentEmail ?? "",
      address: initialProfile.address ?? "",
      schoolYear: initialProfile.schoolYear ?? "",
      comments: initialProfile.comments ?? "",
      afm: initialProfile.afm ?? "",
      doy: initialProfile.doy ?? "",
      classYear: initialProfile.classYear,
      direction: initialProfile.direction ?? "",
      username: initialProfile.user.username,
      password: "",
    };
  }
  const [df, setDf] = useState(buildDf());
  const [schoolYearDisplay, setSchoolYearDisplay] = useState(initialProfile.schoolYear);
  const [detailsSaving, setDetailsSaving] = useState(false);

  const [payForm, setPayForm] = useState({
    amount: "", method: "Μετρητά",
    date: new Date().toISOString().split("T")[0],
    description: "",
  });
  const [payLoading, setPayLoading] = useState(false);

  const availableSubjects = getSubjectsForStudent(initialProfile.classYear, initialProfile.direction);
  const enrolledSubjects = new Set(enrollments.map(e => e.subject));
  const unenrolledSubjects = availableSubjects.filter(s => !enrolledSubjects.has(s));
  const totalAnnualCost = enrollments.reduce((sum, e) => sum + e.costPerHour, 0);

  const monthStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}`;

  const loadCalendar = useCallback(async () => {
    setCalLoading(true);
    const [sRes, aRes] = await Promise.all([
      fetch(`/api/sessions?studentId=${initialProfile.id}&month=${monthStr}`),
      fetch(`/api/absences?studentId=${initialProfile.id}&month=${monthStr}`),
    ]);
    if (sRes.ok) setSessions(await sRes.json());
    if (aRes.ok) setAbsences(await aRes.json());
    setCalLoading(false);
  }, [currentMonth, initialProfile.id]);

  const loadGroupClassEvents = useCallback(async () => {
    if (studentGroups.length === 0) { setGroupClassEvents([]); return; }
    const names = studentGroups.map(sg => sg.group.name).join(",");
    const res = await fetch(`/api/class-events?month=${monthStr}&groups=${encodeURIComponent(names)}`);
    if (res.ok) {
      const data: GroupClassEvent[] = await res.json();
      const enrolled = new Set(enrollments.map(e => e.subject));
      setGroupClassEvents(data.filter(e => enrolled.has(e.subject)));
    }
  }, [monthStr, studentGroups, enrollments]);

  const loadPayments = useCallback(async () => {
    const res = await fetch(`/api/payments?studentId=${initialProfile.id}`);
    if (res.ok) setPayments(await res.json());
  }, [initialProfile.id]);

  const loadReceipts = useCallback(async () => {
    const res = await fetch(`/api/receipts?studentId=${initialProfile.id}`);
    if (res.ok) setReceipts(await res.json());
  }, [initialProfile.id]);

  useEffect(() => { loadCalendar(); }, [loadCalendar]);
  useEffect(() => { loadGroupClassEvents(); }, [loadGroupClassEvents]);
  useEffect(() => { if (activeTab === "payments") { loadPayments(); loadReceipts(); } }, [activeTab, loadPayments, loadReceipts]);
  useEffect(() => {
    if (activeTab !== "exams" && activeTab !== "summary") return;
    setExamsLoading(true);
    fetch(`/api/students/${initialProfile.id}/exams`)
      .then(r => r.json())
      .then(data => setStudentExams(Array.isArray(data) ? data : []))
      .finally(() => setExamsLoading(false));
  }, [activeTab, initialProfile.id]);
  useEffect(() => {
    fetch("/api/groups").then(r => r.json()).then(gs => setAllGroups(gs));
  }, []);

  function selectGroup(group: { id: string; name: string }) {
    setPendingGroup(group);
    setPendingSubjects([]);
    setGroupSearch(group.name);
    setGroupDropOpen(false);
  }

  async function confirmAddToGroup() {
    if (!pendingGroup) return;
    const res = await fetch(`/api/students/${initialProfile.id}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: pendingGroup.id, subjects: pendingSubjects }),
    });
    if (res.ok) {
      const sg = await res.json();
      setStudentGroups(prev => [...prev, sg]);
    }
    setGroupSearch("");
    setPendingGroup(null);
    setPendingSubjects([]);
    setGroupDropOpen(false);
  }

  async function removeFromGroup(groupId: string) {
    await fetch(`/api/students/${initialProfile.id}/groups?groupId=${groupId}`, { method: "DELETE" });
    setStudentGroups(prev => prev.filter(sg => sg.groupId !== groupId));
  }

  const assignedGroupIds = new Set(studentGroups.map(sg => sg.groupId));
  const filteredGroups = allGroups.filter(
    g => !assignedGroupIds.has(g.id) &&
    g.name.toLowerCase().includes(groupSearch.toLowerCase())
  );

  function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
  function getFirstDayOfWeek(y: number, m: number) {
    const d = new Date(y, m, 1).getDay();
    return d === 0 ? 6 : d - 1;
  }
  function localKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function utcKey(isoDate: string) {
    const d = new Date(isoDate);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }

  function getGroupEventsForDay(date: Date): GroupClassEvent[] {
    const key = localKey(date);
    return groupClassEvents.filter(e => utcKey(e.date) === key);
  }

  function getSlotsForDay(date: Date): { enrollment: Enrollment; slot: WeeklySlot }[] {
    const weekday = date.getDay() === 0 ? 6 : date.getDay() - 1;
    const out: { enrollment: Enrollment; slot: WeeklySlot }[] = [];
    for (const en of enrollments)
      for (const sl of en.slots)
        if (sl.dayOfWeek === weekday) out.push({ enrollment: en, slot: sl });
    return out;
  }

  function getSession(enrollmentId: string, date: Date): SessionStatus | null {
    const key = localKey(date);
    return sessions.find(s => s.enrollmentId === enrollmentId && toUTCDateKey(s.date) === key) ?? null;
  }
  function isAbsent(date: Date, subject: string) {
    const key = localKey(date);
    return absences.some(a => toUTCDateKey(a.date) === key && a.subject === subject);
  }

  async function setHeld(enrollmentId: string, date: Date, held: boolean) {
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enrollmentId, date: localDateToUTC(date), held }),
    });
    await loadCalendar();
  }

  async function bulkMonth(held: boolean) {
    const days = getDaysInMonth(currentMonth.year, currentMonth.month);
    const items: any[] = [];
    for (let d = 1; d <= days; d++) {
      const date = new Date(currentMonth.year, currentMonth.month, d);
      for (const { enrollment } of getSlotsForDay(date))
        items.push({ enrollmentId: enrollment.id, date: localDateToUTC(date), held });
    }
    if (!items.length) return;
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessions: items }),
    });
    await loadCalendar();
  }

  async function toggleAbsence(date: Date, enrollment: Enrollment) {
    await fetch("/api/absences/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: initialProfile.id, subject: enrollment.subject, date: localDateToUTC(date) }),
    });
    await loadCalendar();
  }

  async function addEnrollment() {
    if (!newSubject) return;
    const finalSubject = newSubject === "Ειδικότητα" ? (newSpecialtyName.trim() || "Ειδικότητα") : newSubject;
    const res = await fetch("/api/enrollments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: initialProfile.id,
        subject: finalSubject,
        costPerHour: parseFloat(newCost || "0"),
        durationMinutes: newDuration,
      }),
    });
    if (res.ok) {
      const e = await res.json();
      setEnrollments(prev => [...prev, e]);
      setNewSubject(""); setNewSpecialtyName(""); setNewCost(""); setNewDuration(60);
      setShowAddSubject(false);
    }
  }

  async function deleteEnrollment(id: string) {
    if (!confirm("Διαγραφή μαθήματος;")) return;
    await fetch(`/api/enrollments/${id}`, { method: "DELETE" });
    setEnrollments(prev => prev.filter(e => e.id !== id));
  }

  async function saveCost(enrollmentId: string) {
    const cost = parseFloat(costEditValue || "0");
    const res = await fetch(`/api/enrollments/${enrollmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ costPerHour: cost }),
    });
    if (res.ok) {
      setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, costPerHour: cost } : e));
    }
    setEditingCostId(null);
  }

  async function addSlot(enrollmentId: string) {
    const res = await fetch(`/api/enrollments/${enrollmentId}/slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dayOfWeek: parseInt(slotForm.dayOfWeek), startTime: slotForm.startTime, endTime: slotForm.endTime }),
    });
    if (res.ok) {
      const slot = await res.json();
      setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, slots: [...e.slots, slot] } : e));
      setShowSlotForm(null);
    }
  }

  async function deleteSlot(enrollmentId: string, slotId: string) {
    await fetch(`/api/slots/${slotId}`, { method: "DELETE" });
    setEnrollments(prev => prev.map(e => e.id === enrollmentId ? { ...e, slots: e.slots.filter(s => s.id !== slotId) } : e));
  }

  async function addPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!payForm.amount) return;
    setPayLoading(true);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: initialProfile.id,
        amount: parseFloat(payForm.amount),
        date: payForm.date,
        description: payForm.description || "Πληρωμή",
        paymentMethod: payForm.method,
      }),
    });
    if (res.ok) {
      setBalance(prev => prev - parseFloat(payForm.amount));
      setPayForm({ amount: "", method: "Μετρητά", date: new Date().toISOString().split("T")[0], description: "" });
      await loadPayments();
    }
    setPayLoading(false);
  }

  async function deletePayment(id: string, amount: number) {
    if (!confirm("Διαγραφή πληρωμής;")) return;
    await fetch(`/api/payments?id=${id}`, { method: "DELETE" });
    setBalance(prev => prev + amount);
    setPayments(prev => prev.filter(p => p.id !== id));
  }

  async function addReceipt(e: React.FormEvent) {
    e.preventDefault();
    if (!receiptForm.amount || !receiptForm.file) return;
    setReceiptUploading(true);
    const fd = new FormData();
    fd.append("studentId", initialProfile.id);
    fd.append("amount", receiptForm.amount);
    fd.append("date", receiptForm.date);
    fd.append("file", receiptForm.file);
    const res = await fetch("/api/receipts", { method: "POST", body: fd });
    if (res.ok) {
      setReceiptForm({ amount: "", date: new Date().toISOString().split("T")[0], file: null });
      if (receiptFileInputRef.current) receiptFileInputRef.current.value = "";
      await loadReceipts();
    } else {
      alert("Σφάλμα κατά την αποστολή της απόδειξης");
    }
    setReceiptUploading(false);
  }

  async function deleteReceipt(id: string) {
    if (!confirm("Διαγραφή απόδειξης;")) return;
    await fetch(`/api/receipts?id=${id}`, { method: "DELETE" });
    setReceipts(prev => prev.filter(r => r.id !== id));
  }

  async function saveDetails() {
    if (!df.username.trim()) { alert("Το username δεν μπορεί να είναι κενό."); return; }
    if (LYCEUM_WITH_DIRECTIONS.includes(df.classYear) && !df.direction) {
      alert("Επιλέξτε κατεύθυνση για αυτή την τάξη."); return;
    }
    setDetailsSaving(true);
    const res = await fetch(`/api/students/${initialProfile.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: df.username.trim(),
        password: df.password || undefined,
        classYear: df.classYear, direction: df.direction || null,
        firstName: df.firstName || null, lastName: df.lastName || null,
        phone: df.phone || null, email: df.email || null,
        fatherName: df.fatherName || null, fatherPhone: df.fatherPhone || null,
        motherName: df.motherName || null, motherPhone: df.motherPhone || null,
        primaryContact: df.primaryContact || null,
        parentEmail: df.parentEmail || null, address: df.address || null,
        schoolYear: df.schoolYear || null,
        comments: df.comments || null,
        afm: df.afm || null, doy: df.doy || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Σφάλμα κατά την αποθήκευση");
      setDetailsSaving(false);
      return;
    }
    // classYear/direction/username changes affect derived data (available subjects, login)
    // across the whole card — reload to keep everything consistent.
    window.location.reload();
  }

  const daysInMonth = getDaysInMonth(currentMonth.year, currentMonth.month);
  const firstDay = getFirstDayOfWeek(currentMonth.year, currentMonth.month);
  const today = new Date();

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <Link href="/admin/students">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" /> Μαθητές
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{initialProfile.user.name}</h1>
            {studentGroups.map(sg => {
              const subList = sg.subjects ? (() => { try { return JSON.parse(sg.subjects) as string[]; } catch { return []; } })() : [];
              return (
                <span key={sg.id} className="group flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                  {sg.group.name}
                  {subList.length > 0 && (
                    <span className="text-purple-400 font-normal"> · {subList.join(", ")}</span>
                  )}
                  <button onClick={() => removeFromGroup(sg.groupId)} className="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity ml-0.5">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {schoolYearDisplay && <span className="text-xs text-gray-400">{schoolYearDisplay}</span>}
          </div>
          <p className="text-gray-500 text-sm">
            {initialProfile.classYear}{initialProfile.direction && ` · ${initialProfile.direction}`}
            {" · "}<span className="font-mono text-xs">{initialProfile.user.username}</span>
          </p>
          {/* Add to group inline */}
          <div className="mt-1" style={{ maxWidth: 320 }}>
            <div className="relative">
              <input
                type="text"
                value={groupSearch}
                onFocus={() => setGroupDropOpen(true)}
                onBlur={() => setTimeout(() => setGroupDropOpen(false), 150)}
                onChange={e => { setGroupSearch(e.target.value); setGroupDropOpen(true); setPendingGroup(null); }}
                placeholder="+ Προσθήκη σε τμήμα..."
                className="w-full h-7 px-2 text-xs rounded-lg border border-dashed border-purple-300 text-purple-600 placeholder-purple-300 focus:outline-none focus:border-purple-500 bg-transparent"
              />
              {groupDropOpen && filteredGroups.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-40 overflow-y-auto">
                  {filteredGroups.map(g => (
                    <button key={g.id} type="button" onMouseDown={() => selectGroup(g)}
                      className="w-full text-left px-3 py-1.5 text-sm hover:bg-purple-50 hover:text-purple-700 text-gray-700">
                      {g.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subject picker after group is selected */}
            {pendingGroup && (
              <div className="mt-2 p-2.5 bg-purple-50 rounded-xl border border-purple-200">
                <p className="text-xs font-semibold text-purple-700 mb-1.5">
                  Μαθήματα στο <span className="font-bold">{pendingGroup.name}</span>:
                </p>
                {enrollments.length === 0 ? (
                  <p className="text-xs text-gray-400 italic mb-2">Δεν υπάρχουν εγγεγραμμένα μαθήματα</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {enrollments.map(e => {
                      const checked = pendingSubjects.includes(e.subject);
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => setPendingSubjects(prev =>
                            checked ? prev.filter(s => s !== e.subject) : [...prev, e.subject]
                          )}
                          className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
                            checked
                              ? "bg-purple-600 text-white border-purple-600"
                              : "bg-white text-purple-600 border-purple-300 hover:bg-purple-100"
                          }`}
                        >
                          {e.subject}
                        </button>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-400 mb-2">
                  {pendingSubjects.length === 0 ? "Κανένα επιλεγμένο = όλα τα μαθήματα" : `${pendingSubjects.length} επιλεγμένα`}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={confirmAddToGroup}
                    className="text-xs px-3 py-1 rounded-lg bg-purple-600 text-white hover:bg-purple-700 font-medium">
                    Προσθήκη
                  </button>
                  <button type="button" onClick={() => { setPendingGroup(null); setGroupSearch(""); }}
                    className="text-xs px-3 py-1 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50">
                    Ακύρωση
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Student details collapsible */}
      <div className="mb-5">
        <button onClick={() => setShowDetails(v => !v)}
          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
          <User className="w-4 h-4" />
          Στοιχεία Μαθητή
          <ChevronDown className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <Card className="mt-3 border-blue-100">
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Σχολικά & Σύνδεση</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Τάξη</label>
                        <select className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={df.classYear} onChange={e => setDf(p => ({ ...p, classYear: e.target.value, direction: "" }))}>
                          {CLASS_YEARS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      {LYCEUM_WITH_DIRECTIONS.includes(df.classYear) && (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Κατεύθυνση</label>
                          <select className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={df.direction} onChange={e => setDf(p => ({ ...p, direction: e.target.value }))}>
                            <option value="">-- Επιλέξτε --</option>
                            {(DIRECTIONS_BY_CLASS[df.classYear] ?? []).map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                      )}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Σχολική Χρονιά</label>
                        <Input value={df.schoolYear} onChange={e => setDf(p => ({ ...p, schoolYear: e.target.value }))}
                          placeholder="π.χ. 2025-2026" className="h-9" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Username</label>
                        <Input value={df.username} onChange={e => setDf(p => ({ ...p, username: e.target.value }))}
                          placeholder="π.χ. gpapadopoulos" className="h-9 font-mono" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Νέος Κωδικός (προαιρετικό)</label>
                        <Input type="password" value={df.password} onChange={e => setDf(p => ({ ...p, password: e.target.value }))}
                          placeholder="Αφήστε κενό αν δεν αλλάζει" className="h-9" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Στοιχεία Μαθητή</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        { label: "Όνομα", key: "firstName", placeholder: "Όνομα" },
                        { label: "Επώνυμο", key: "lastName", placeholder: "Επώνυμο" },
                        { label: "Τηλέφωνο", key: "phone", placeholder: "69xxxxxxxx" },
                        { label: "Email", key: "email", placeholder: "student@email.com", type: "email" },
                        { label: "Τόπος Κατοικίας", key: "address", placeholder: "Οδός, Πόλη" },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                          <Input type={f.type ?? "text"} value={(df as any)[f.key]}
                            onChange={e => setDf(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={f.placeholder} className="h-9" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Στοιχεία Πατέρα</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Ονοματεπώνυμο</label>
                        <Input value={df.fatherName} onChange={e => setDf(p => ({ ...p, fatherName: e.target.value }))}
                          placeholder="Ονοματεπώνυμο" className="h-9" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Τηλέφωνο</label>
                        <Input value={df.fatherPhone} onChange={e => setDf(p => ({ ...p, fatherPhone: e.target.value }))}
                          placeholder="69xxxxxxxx" className="h-9" />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer h-9">
                        <input type="radio" name="editPrimaryContact" checked={df.primaryContact === "FATHER"}
                          onChange={() => setDf(p => ({ ...p, primaryContact: "FATHER" }))}
                          className="w-4 h-4 text-blue-600" />
                        Κύριο τηλέφωνο επικοινωνίας ανάγκης
                      </label>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Στοιχεία Μητέρας</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-end">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Ονοματεπώνυμο</label>
                        <Input value={df.motherName} onChange={e => setDf(p => ({ ...p, motherName: e.target.value }))}
                          placeholder="Ονοματεπώνυμο" className="h-9" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Τηλέφωνο</label>
                        <Input value={df.motherPhone} onChange={e => setDf(p => ({ ...p, motherPhone: e.target.value }))}
                          placeholder="69xxxxxxxx" className="h-9" />
                      </div>
                      <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer h-9">
                        <input type="radio" name="editPrimaryContact" checked={df.primaryContact === "MOTHER"}
                          onChange={() => setDf(p => ({ ...p, primaryContact: "MOTHER" }))}
                          className="w-4 h-4 text-blue-600" />
                        Κύριο τηλέφωνο επικοινωνίας ανάγκης
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Email Γονέα / Κηδεμόνα</label>
                    <Input type="email" value={df.parentEmail} onChange={e => setDf(p => ({ ...p, parentEmail: e.target.value }))}
                      placeholder="parent@email.com" className="h-9 sm:max-w-sm" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Φορολογικά Στοιχεία (για αποδείξεις)</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">ΑΦΜ</label>
                        <Input value={df.afm} onChange={e => setDf(p => ({ ...p, afm: e.target.value }))}
                          placeholder="π.χ. 123456789" className="h-9" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">ΔΟΥ</label>
                        <Input value={df.doy} onChange={e => setDf(p => ({ ...p, doy: e.target.value }))}
                          placeholder="π.χ. Α' Αθηνών" className="h-9" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Σχόλια / Παρατηρήσεις</label>
                    <textarea value={df.comments} onChange={e => setDf(p => ({ ...p, comments: e.target.value }))}
                      rows={3} placeholder="Ελεύθερη καταγραφή σχολίων..."
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveDetails} disabled={detailsSaving} className="gap-1">
                      <Save className="w-3.5 h-3.5" />
                      {detailsSaving ? "Αποθήκευση..." : "Αποθήκευση"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setDf(buildDf()); setShowDetails(false); }}>Ακύρωση</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: "calendar", label: "Ημερολόγιο & Απουσίες", icon: Calendar },
          { key: "enrollments", label: "Μαθήματα & Ωράριο", icon: BookOpen },
          { key: "payments", label: "Πληρωμές", icon: CreditCard },
          { key: "exams", label: "Διαγωνίσματα", icon: ClipboardList },
          { key: "summary", label: "Σύνοψη", icon: FileText },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════ TAB: CALENDAR ═══════════════ */}
      {activeTab === "calendar" && (
        <div>
          {enrollments.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Δεν υπάρχουν εγγεγραμμένα μαθήματα</p>
              <p className="text-gray-400 text-sm mt-1">Προσθέστε μαθήματα από την καρτέλα "Μαθήματα & Ωράριο"</p>
              <Button className="mt-4" onClick={() => setActiveTab("enrollments")}>Προσθήκη Μαθημάτων</Button>
            </div>
          ) : (
            <Card>
              <CardHeader>
                {/* Month navigation */}
                <div className="flex items-center justify-between">
                  <button onClick={() => setCurrentMonth(m => { const d = new Date(m.year, m.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                    className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-5 h-5" /></button>

                  <div className="text-center">
                    <CardTitle className="text-lg">{MONTH_NAMES[currentMonth.month]} {currentMonth.year}</CardTitle>
                    {/* Bulk month actions */}
                    <div className="flex gap-2 justify-center mt-2">
                      <button onClick={() => bulkMonth(true)}
                        className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 hover:bg-green-200 font-medium transition-colors">
                        Όλα Κανονικά
                      </button>
                      <button onClick={() => bulkMonth(false)}
                        className="text-xs px-3 py-1 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 font-medium transition-colors">
                        Όλα Ακυρωμένα
                      </button>
                    </div>
                  </div>

                  <button onClick={() => setCurrentMonth(m => { const d = new Date(m.year, m.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
                    className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight className="w-5 h-5" /></button>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {enrollments.map(e => (
                    <span key={e.id} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getSubjectColor(enrollments, e.subject)}`}>
                      {e.subject}
                    </span>
                  ))}
                </div>

                {/* Status legend */}
                <div className="flex flex-wrap gap-3 pt-1">
                  {[
                    { label: "Κανονικά/Παρών", cls: "bg-green-100 text-green-700 border-green-200" },
                    { label: "Απουσία", cls: "bg-red-100 text-red-700 border-red-200 line-through" },
                    { label: "Ακυρώθηκε", cls: "bg-gray-100 text-gray-400 border-gray-200 line-through" },
                    { label: "Αδιόριστο", cls: "bg-amber-50 text-amber-600 border-amber-200" },
                  ].map(s => (
                    <span key={s.label} className={`text-xs px-2 py-0.5 rounded-md border font-medium ${s.cls}`}>{s.label}</span>
                  ))}
                </div>
              </CardHeader>

              <CardContent>
                {calLoading && <div className="text-center py-4 text-sm text-gray-400">Φόρτωση...</div>}

                {/* Day headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"].map(d => (
                    <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const date = new Date(currentMonth.year, currentMonth.month, i + 1);
                    const daySlots = getSlotsForDay(date);
                    const dayGroupEvts = getGroupEventsForDay(date);
                    // Subjects covered by group events — don't show WeeklySlot duplicate
                    const groupSubjects = new Set(dayGroupEvts.map(e => e.subject));
                    const filteredSlots = daySlots.filter(({ enrollment }) => !groupSubjects.has(enrollment.subject));
                    const hasAny = daySlots.length > 0 || dayGroupEvts.length > 0;
                    const isToday = date.toDateString() === today.toDateString();

                    return (
                      <motion.div key={i}
                        whileHover={hasAny ? { scale: 1.02 } : {}}
                        onClick={() => hasAny && setDayModal({ date, slots: daySlots, groupEvents: dayGroupEvts })}
                        className={`min-h-[80px] rounded-xl p-1.5 border transition-all ${
                          hasAny ? "cursor-pointer hover:border-blue-300 hover:shadow-sm" : "cursor-default"
                        } ${isToday ? "border-blue-400 bg-blue-50/40" : "border-gray-100"}`}>
                        <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday ? "bg-blue-600 text-white" : "text-gray-600"
                        }`}>{i + 1}</div>

                        <div className="space-y-0.5">
                          {/* Group class events (from admin calendar) */}
                          {dayGroupEvts.map(ge => {
                            const enrollment = enrollments.find(e => e.subject === ge.subject);
                            const sess = enrollment ? getSession(enrollment.id, date) : null;
                            const absent = enrollment ? isAbsent(date, enrollment.subject) : false;
                            let chipCls = "bg-blue-50 text-blue-600 border-blue-200";
                            if (sess) {
                              if (!sess.held) chipCls = "bg-gray-100 text-gray-400 border-gray-200 line-through";
                              else if (absent) chipCls = "bg-red-100 text-red-700 border-red-200 line-through";
                              else chipCls = "bg-green-100 text-green-700 border-green-200";
                            }
                            return (
                              <div key={ge.id}
                                className={`text-xs px-1.5 py-0.5 rounded-md font-medium truncate border ${chipCls}`}
                                title={`${ge.subject} ${ge.startTime}-${ge.endTime} | ${ge.groupName}`}>
                                {ge.subject.split(" ")[0]} {ge.startTime}
                              </div>
                            );
                          })}
                          {/* WeeklySlot events (only for subjects not in group events) */}
                          {filteredSlots.map(({ enrollment, slot }) => {
                            const sess = getSession(enrollment.id, date);
                            const absent = isAbsent(date, enrollment.subject);
                            let chipCls = "bg-amber-50 text-amber-600 border-amber-200";
                            if (sess) {
                              if (!sess.held) chipCls = "bg-gray-100 text-gray-400 border-gray-200 line-through";
                              else if (absent) chipCls = "bg-red-100 text-red-700 border-red-200 line-through";
                              else chipCls = "bg-green-100 text-green-700 border-green-200";
                            }
                            return (
                              <div key={`${enrollment.id}-${slot.id}`}
                                className={`text-xs px-1.5 py-0.5 rounded-md font-medium truncate border ${chipCls}`}
                                title={`${enrollment.subject} ${slot.startTime}-${slot.endTime}`}>
                                {enrollment.subject.split(" ")[0]}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Absence summary */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-6 flex-wrap">
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-red-600">{absences.length}</span> απουσίες τον μήνα
                  </p>
                  <p className="text-sm text-gray-500">
                    <span className="font-semibold text-gray-600">{sessions.filter(s => !s.held).length}</span> ακυρωμένα μαθήματα
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ═══════════════ TAB: ENROLLMENTS ═══════════════ */}
      {activeTab === "enrollments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Σύνολο: <span className="font-semibold text-blue-700">{totalAnnualCost.toFixed(2)}€/έτος</span>
            </p>
            {unenrolledSubjects.length > 0 && (
              <Button size="sm" onClick={() => setShowAddSubject(v => !v)}>
                <Plus className="w-4 h-4 mr-1" /> Μάθημα
              </Button>
            )}
          </div>

          {showAddSubject && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-blue-200">
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-40">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Μάθημα</label>
                      <select className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newSubject} onChange={e => { setNewSubject(e.target.value); setNewSpecialtyName(""); }}>
                        <option value="">-- Επιλέξτε --</option>
                        {unenrolledSubjects.map(s => <option key={s} value={s}>{s === "Ειδικότητα" ? "Ειδικότητα (ΕΠΑΛ)" : s}</option>)}
                      </select>
                    </div>
                    {newSubject === "Ειδικότητα" && (
                      <div className="flex-1 min-w-40">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Όνομα ειδικότητας</label>
                        <Input value={newSpecialtyName} onChange={e => setNewSpecialtyName(e.target.value)} placeholder="π.χ. Ηλεκτρολογία" />
                      </div>
                    )}
                    <div className="w-32">
                      <label className="block text-sm font-medium text-gray-700 mb-1">€/έτος</label>
                      <Input type="number" value={newCost} onChange={e => setNewCost(e.target.value)} placeholder="0" min="0" step="10" />
                    </div>
                    <div className="w-36">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Διάρκεια</label>
                      <select
                        className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={newDuration}
                        onChange={e => setNewDuration(parseInt(e.target.value))}
                      >
                        <option value="60">60 λεπτά</option>
                        <option value="45">45 λεπτά</option>
                      </select>
                    </div>
                    <Button onClick={addEnrollment} disabled={!newSubject}>Προσθήκη</Button>
                    <Button variant="ghost" onClick={() => setShowAddSubject(false)}>Ακύρωση</Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {enrollments.length === 0 ? (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Δεν υπάρχουν εγγεγραμμένα μαθήματα.</p>
            </div>
          ) : (
            enrollments.map(enrollment => (
              <Card key={enrollment.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${getSubjectColor(enrollments, enrollment.subject)}`}>
                        {enrollment.subject}
                      </span>
                      {editingCostId === enrollment.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            value={costEditValue}
                            onChange={e => setCostEditValue(e.target.value)}
                            onBlur={() => saveCost(enrollment.id)}
                            onKeyDown={e => { if (e.key === "Enter") saveCost(enrollment.id); if (e.key === "Escape") setEditingCostId(null); }}
                            className="h-6 w-24 text-xs"
                            autoFocus
                            min="0"
                            step="10"
                          />
                          <span className="text-xs text-gray-400">€/έτος</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setEditingCostId(enrollment.id); setCostEditValue(String(enrollment.costPerHour)); }}
                          title="Κλικ για επεξεργασία"
                          className="text-sm text-gray-500 hover:text-blue-600 underline decoration-dotted cursor-pointer"
                        >
                          {enrollment.costPerHour > 0 ? `${enrollment.costPerHour}€/έτος` : "—"}
                        </button>
                      )}
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{enrollment.durationMinutes ?? 60} λεπτά</span>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => deleteEnrollment(enrollment.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-1 mb-3">
                    {enrollment.slots.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">Δεν έχει οριστεί ωράριο ακόμα</p>
                    ) : (
                      enrollment.slots.map(slot => (
                        <div key={slot.id} className="flex items-center gap-2 text-sm">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-700 font-medium">{DAYS_GR[slot.dayOfWeek]}</span>
                          <span className="text-gray-500">{slot.startTime} – {slot.endTime}</span>
                          {slot.group && (
                            <span className="text-xs text-purple-600 font-medium bg-purple-50 px-1.5 py-0.5 rounded-full">
                              {slot.group.name}
                            </span>
                          )}
                          <button onClick={() => deleteSlot(enrollment.id, slot.id)}
                            className="ml-auto text-gray-300 hover:text-red-500 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {showSlotForm === enrollment.id ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex flex-wrap gap-2 items-end bg-gray-50 rounded-xl p-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Μέρα</label>
                        <select className="h-8 px-2 rounded-lg border border-gray-300 text-sm"
                          value={slotForm.dayOfWeek} onChange={e => setSlotForm(f => ({ ...f, dayOfWeek: e.target.value }))}>
                          {DAYS_GR.map((d, i) => <option key={i} value={i}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Από</label>
                        <Input type="text" placeholder="16:00" value={slotForm.startTime}
                          onChange={e => setSlotForm(f => ({ ...f, startTime: e.target.value }))} className="h-8 w-28" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Έως</label>
                        <Input type="text" placeholder="18:00" value={slotForm.endTime}
                          onChange={e => setSlotForm(f => ({ ...f, endTime: e.target.value }))} className="h-8 w-28" />
                      </div>
                      <Button size="sm" onClick={() => addSlot(enrollment.id)}><Check className="w-4 h-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowSlotForm(null)}><X className="w-4 h-4" /></Button>
                    </motion.div>
                  ) : (
                    <button onClick={() => setShowSlotForm(enrollment.id)}
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium">
                      <Plus className="w-3.5 h-3.5" /> Προσθήκη Ώρας
                    </button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ═══════════════ TAB: PAYMENTS ═══════════════ */}
      {activeTab === "payments" && (
        <div className="space-y-5">
          {/* Balance card */}
          <div className={`rounded-2xl p-5 flex items-center justify-between ${
            balance > 0 ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"
          }`}>
            <div>
              <p className="text-sm font-medium text-gray-500">Υπόλοιπο</p>
              <p className={`text-3xl font-bold mt-0.5 ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(balance)}
              </p>
            </div>
            <Banknote className={`w-10 h-10 ${balance > 0 ? "text-red-300" : "text-green-300"}`} />
          </div>

          {/* Add payment */}
          <Card className="border-blue-100">
            <CardHeader><CardTitle className="text-base">Καταχώρηση Πληρωμής</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={addPayment} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ποσό (€) *</label>
                    <Input type="number" value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="0.00" min="0.01" step="0.01" required className="h-9" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Τρόπος Πληρωμής</label>
                    <select value={payForm.method} onChange={e => setPayForm(p => ({ ...p, method: e.target.value }))}
                      className="w-full h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ημερομηνία</label>
                    <Input type="date" value={payForm.date} onChange={e => setPayForm(p => ({ ...p, date: e.target.value }))}
                      required className="h-9" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Περιγραφή</label>
                    <Input value={payForm.description} onChange={e => setPayForm(p => ({ ...p, description: e.target.value }))}
                      placeholder="π.χ. Α' δόση" className="h-9" />
                  </div>
                </div>
                <Button type="submit" disabled={payLoading || !payForm.amount} size="sm">
                  {payLoading ? "Αποθήκευση..." : "Καταχώρηση"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Add receipt */}
          <Card className="border-orange-100">
            <CardHeader><CardTitle className="text-base">Καταχώρηση Απόδειξης</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={addReceipt} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ποσό Απόδειξης (€) *</label>
                    <Input type="number" value={receiptForm.amount} onChange={e => setReceiptForm(p => ({ ...p, amount: e.target.value }))}
                      placeholder="0.00" min="0.01" step="0.01" required className="h-9" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Ημερομηνία Έκδοσης</label>
                    <Input type="date" value={receiptForm.date} onChange={e => setReceiptForm(p => ({ ...p, date: e.target.value }))}
                      required className="h-9" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Αρχείο Απόδειξης *</label>
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" ref={receiptFileInputRef}
                      onChange={e => setReceiptForm(p => ({ ...p, file: e.target.files?.[0] ?? null }))}
                      className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100" />
                  </div>
                </div>
                <Button type="submit" disabled={receiptUploading || !receiptForm.amount || !receiptForm.file} size="sm" className="gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  {receiptUploading ? "Ανέβασμα..." : "Καταχώρηση Απόδειξης"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Receipt history */}
          <Card>
            <CardHeader><CardTitle className="text-base">Ιστορικό Αποδείξεων</CardTitle></CardHeader>
            <CardContent>
              {receipts.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">Δεν υπάρχουν καταχωρημένες αποδείξεις.</p>
              ) : (
                <div className="space-y-1">
                  {receipts.map(r => (
                    <div key={r.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <Receipt className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(r.amount)}</p>
                        <p className="text-xs text-gray-400">{new Date(r.date).toLocaleDateString("el-GR")}</p>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Έτοιμη για λήψη
                      </span>
                      <a href={r.filePath} download target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium shrink-0">
                        <Download className="w-3.5 h-3.5" /> Λήψη
                      </a>
                      <button onClick={() => deleteReceipt(r.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment history */}
          <Card>
            <CardHeader><CardTitle className="text-base">Ιστορικό Πληρωμών</CardTitle></CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-center py-8 text-gray-400 text-sm">Δεν υπάρχουν καταγεγραμμένες πληρωμές.</p>
              ) : (
                <div className="space-y-1">
                  {payments.map(p => (
                    <div key={p.id} className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{p.description}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(p.date).toLocaleDateString("el-GR")}
                          {p.paymentMethod && ` · ${p.paymentMethod}`}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-green-600 shrink-0">+{formatCurrency(p.amount)}</span>
                      <button onClick={() => deletePayment(p.id, p.amount)}
                        className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ═══════════════ TAB: EXAMS ═══════════════ */}
      {activeTab === "exams" && (
        <div>
          {examsLoading ? (
            <div className="flex justify-center py-16">
              <ClipboardList className="w-6 h-6 animate-pulse text-blue-300" />
            </div>
          ) : studentExams.length === 0 ? (
            <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Δεν βρέθηκαν διαγωνίσματα για αυτόν τον μαθητή.</p>
              <p className="text-gray-400 text-sm mt-1">Βεβαιωθείτε ότι ο μαθητής ανήκει σε τμήμα που γράφει εξέταση.</p>
            </div>
          ) : (
            (() => {
              const columns = enrollments.length > 0
                ? enrollments.map(e => ({ key: e.id, subject: e.subject, colorClass: getSubjectColor(enrollments, e.subject) }))
                : [...new Set(studentExams.map(ex => ex.subject))].map((s, i) => ({
                    key: s, subject: s, colorClass: SUBJECT_COLORS[i % SUBJECT_COLORS.length],
                  }));
              return (
                <div
                  className="grid gap-3 items-start"
                  style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}
                >
                  {columns.map(col => {
                    const subjectExams = studentExams
                      .filter(ex => ex.subject === col.subject)
                      .sort((a, b) => {
                        if (a.examDate && b.examDate) return b.examDate.localeCompare(a.examDate);
                        if (a.examDate) return -1;
                        if (b.examDate) return 1;
                        return 0;
                      });

                    return (
                      <div key={col.key}>
                        {/* Column header */}
                        <div className={`rounded-xl px-3 py-2 mb-2 border text-center ${col.colorClass}`}>
                          <p className="text-sm font-semibold truncate">{col.subject}</p>
                          <p className="text-[11px] opacity-60">
                            {subjectExams.length > 0 ? `${subjectExams.length} εξετάσεις` : "Καμία εξέταση"}
                          </p>
                        </div>

                        {/* Exam cards */}
                        <div className="space-y-2">
                          {subjectExams.map(ex => {
                            const g = ex.grade;
                            const absent = g?.absent === true;
                            const hasGrade = g !== null && !absent && g.totalScore !== null;
                            const cs = ex.classStats;

                            const typeStyle = ex.examType === "EXAM"
                              ? { border: "border-l-red-400", label: "text-red-500" }
                              : ex.examType === "TEST"
                              ? { border: "border-l-blue-400", label: "text-blue-500" }
                              : { border: "border-l-purple-400", label: "text-purple-500" };

                            const displayDate = g?.writtenDate ?? ex.examDate;

                            return (
                              <div key={ex.id} className={`rounded-lg border border-l-4 ${typeStyle.border} shadow-sm p-3 ${absent ? "bg-red-50 border-red-100" : "bg-white border-gray-100"}`}>
                                {/* Type + title + score */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <span className={`text-[10px] font-bold uppercase tracking-wide ${typeStyle.label}`}>
                                      {EXAM_TYPE_LABELS[ex.examType]}
                                    </span>
                                    <p className={`text-xs font-semibold mt-0.5 leading-snug line-clamp-2 ${absent ? "text-red-600" : "text-gray-900"}`}>{ex.title}</p>
                                    {displayDate && (
                                      <p className="text-[10px] text-gray-400 mt-0.5">
                                        {new Date(displayDate).toLocaleDateString("el-GR", { day: "numeric", month: "short", year: "numeric" })}
                                      </p>
                                    )}
                                  </div>
                                  <div className="shrink-0 text-right">
                                    {absent ? (
                                      <span className="text-[10px] font-bold text-red-500 bg-red-100 px-1.5 py-0.5 rounded">Απών</span>
                                    ) : hasGrade ? (
                                      <>
                                        <span className="text-lg font-bold text-gray-900 leading-none">{g!.totalScore}</span>
                                        <span className="text-[10px] text-gray-400">/{ex.scale}</span>
                                      </>
                                    ) : (
                                      <span className="text-[10px] text-gray-300 italic">Αδιόρθ.</span>
                                    )}
                                  </div>
                                </div>

                                {/* Per-theme breakdown (EXAM type only, not absent) */}
                                {ex.examType === "EXAM" && g && !absent && (
                                  <div className="flex gap-1 mt-1.5 flex-wrap">
                                    {([g.theme1, g.theme2, g.theme3, g.theme4] as (number | null)[]).map((t, i) =>
                                      t !== null ? (
                                        <span key={i} className="text-[10px] bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                                          Θ{i + 1}:<span className="font-semibold text-gray-700 ml-0.5">{t}</span>
                                        </span>
                                      ) : null
                                    )}
                                  </div>
                                )}

                                {/* Class stats (only when not absent) */}
                                {cs.count > 0 && !absent && (
                                  <div className="flex justify-between text-[10px] mt-2 pt-2 border-t border-gray-50">
                                    <span className="text-red-400 font-medium">Ελ. {cs.min}</span>
                                    <span className="text-amber-500 font-medium">Μ.Ο. {cs.avg?.toFixed(1)}</span>
                                    <span className="text-green-500 font-medium">Μεγ. {cs.max}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* ═══════════════ TAB: SUMMARY ═══════════════ */}
      {activeTab === "summary" && (
        <StudentSummary
          profile={initialProfile}
          enrollments={enrollments}
          studentGroups={studentGroups}
          studentExams={studentExams}
          balance={balance}
        />
      )}

      {/* ═══════════════ DAY MODAL ═══════════════ */}
      <AnimatePresence>
        {dayModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setDayModal(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-gray-900 text-lg">
                  {dayModal.date.toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })}
                </h3>
                <button onClick={() => setDayModal(null)} className="text-gray-400 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Group class events (primary — from admin calendar) */}
                {dayModal.groupEvents.map(ge => {
                  const enrollment = enrollments.find(e => e.subject === ge.subject);
                  const sess = enrollment ? getSession(enrollment.id, dayModal.date) : null;
                  const absent = enrollment ? isAbsent(dayModal.date, enrollment.subject) : false;
                  const subjectColor = enrollment ? getSubjectColor(enrollments, enrollment.subject) : "bg-blue-100 text-blue-800 border-blue-200";

                  return (
                    <div key={ge.id} className="rounded-xl border border-blue-100 bg-blue-50/30 p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-sm font-semibold px-2 py-0.5 rounded-full border ${subjectColor}`}>
                          {ge.subject}
                        </span>
                        <span className="text-xs text-gray-400">{ge.startTime} – {ge.endTime}</span>
                        <span className="text-xs text-purple-500 font-medium">{ge.groupName}</span>
                        {ge.classroom && <span className="text-xs text-gray-400">· Αίθ.{ge.classroom}</span>}
                      </div>

                      {enrollment ? (
                        <>
                          <div className="mb-3">
                            <p className="text-xs font-medium text-gray-500 mb-2">Πραγματοποίηση μαθήματος:</p>
                            <div className="flex gap-2">
                              <button onClick={() => setHeld(enrollment.id, dayModal.date, true)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                                  sess?.held === true ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500 hover:border-green-300"
                                }`}>
                                <Check className="w-4 h-4 inline mr-1" /> Έγινε
                              </button>
                              <button onClick={() => setHeld(enrollment.id, dayModal.date, false)}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                                  sess?.held === false ? "border-gray-500 bg-gray-50 text-gray-700" : "border-gray-200 text-gray-500 hover:border-gray-400"
                                }`}>
                                <X className="w-4 h-4 inline mr-1" /> Ακυρώθηκε
                              </button>
                            </div>
                          </div>
                          {sess?.held === true && (
                            <div>
                              <p className="text-xs font-medium text-gray-500 mb-2">Παρουσία μαθητή:</p>
                              <button onClick={() => toggleAbsence(dayModal.date, enrollment)}
                                className={`w-full py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                                  absent ? "border-red-400 bg-red-50 text-red-700 hover:bg-red-100" : "border-green-400 bg-green-50 text-green-700 hover:bg-green-100"
                                }`}>
                                {absent ? <><AlertCircle className="w-4 h-4 inline mr-1.5" /> ΑΠΟΥΣΙΑ — κλικ για ΠΑΡΩΝ</> : <><Check className="w-4 h-4 inline mr-1.5" /> ΠΑΡΩΝ — κλικ για ΑΠΟΥΣΙΑ</>}
                              </button>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-amber-600 italic">Δεν βρέθηκε εγγραφή για αυτό το μάθημα.</p>
                      )}
                    </div>
                  );
                })}

                {/* WeeklySlot events (only for subjects NOT covered by group events) */}
                {dayModal.slots
                  .filter(({ enrollment }) => !dayModal.groupEvents.some(ge => ge.subject === enrollment.subject))
                  .map(({ enrollment, slot }) => {
                    const sess = getSession(enrollment.id, dayModal.date);
                    const absent = isAbsent(dayModal.date, enrollment.subject);
                    const subjectColor = getSubjectColor(enrollments, enrollment.subject);

                    return (
                      <div key={`${enrollment.id}-${slot.id}`} className="rounded-xl border border-gray-200 p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-sm font-semibold px-2 py-0.5 rounded-full border ${subjectColor}`}>
                            {enrollment.subject}
                          </span>
                          <span className="text-xs text-gray-400">{slot.startTime} – {slot.endTime}</span>
                        </div>
                        <div className="mb-3">
                          <p className="text-xs font-medium text-gray-500 mb-2">Πραγματοποίηση μαθήματος:</p>
                          <div className="flex gap-2">
                            <button onClick={() => setHeld(enrollment.id, dayModal.date, true)}
                              className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                                sess?.held === true ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500 hover:border-green-300"
                              }`}>
                              <Check className="w-4 h-4 inline mr-1" /> Έγινε
                            </button>
                            <button onClick={() => setHeld(enrollment.id, dayModal.date, false)}
                              className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                                sess?.held === false ? "border-gray-500 bg-gray-50 text-gray-700" : "border-gray-200 text-gray-500 hover:border-gray-400"
                              }`}>
                              <X className="w-4 h-4 inline mr-1" /> Ακυρώθηκε
                            </button>
                          </div>
                        </div>
                        {sess?.held === true && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-2">Παρουσία μαθητή:</p>
                            <button onClick={() => toggleAbsence(dayModal.date, enrollment)}
                              className={`w-full py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                                absent ? "border-red-400 bg-red-50 text-red-700 hover:bg-red-100" : "border-green-400 bg-green-50 text-green-700 hover:bg-green-100"
                              }`}>
                              {absent ? <><AlertCircle className="w-4 h-4 inline mr-1.5" /> ΑΠΟΥΣΙΑ — κλικ για ΠΑΡΩΝ</> : <><Check className="w-4 h-4 inline mr-1.5" /> ΠΑΡΩΝ — κλικ για ΑΠΟΥΣΙΑ</>}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>

              <p className="text-xs text-gray-400 mt-5 text-center">Κλικ εκτός για κλείσιμο</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
