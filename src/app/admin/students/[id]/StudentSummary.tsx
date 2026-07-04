"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ChevronLeft, ChevronRight, Printer, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

type WeeklySlot = { id: string; dayOfWeek: number; startTime: string; endTime: string; groupId: string | null; group: { name: string } | null };
type Enrollment = { id: string; subject: string; costPerHour: number; durationMinutes: number; slots: WeeklySlot[] };
type SessionStatus = { id: string; enrollmentId: string; date: string; held: boolean };
type Absence = { id: string; subject: string; date: string; justified: boolean };
type Payment = { id: string; amount: number; date: string; description: string; paymentMethod: string | null };
type StudentGroup = { id: string; groupId: string; subjects: string | null; group: { id: string; name: string } };
type GroupClassEvent = { id: string; groupName: string; subject: string; date: string; startTime: string; endTime: string; classroom: string | null };
type StudentExam = {
  id: string; title: string; subject: string; classYear: string;
  examType: "EXAM" | "TEST" | "QUESTIONS"; scale: number;
  examDate: string | null; examTime: string | null; groups: string[];
  grade: { theme1: number | null; theme2: number | null; theme3: number | null; theme4: number | null; totalScore: number | null; absent: boolean; writtenDate: string | null } | null;
  classStats: { count: number; min: number | null; max: number | null; avg: number | null };
};
type Profile = {
  id: string; classYear: string; direction: string | null; schoolYear: string | null;
  firstName: string | null; lastName: string | null;
  fatherName: string | null; motherName: string | null; primaryContact: string | null;
  parentEmail: string | null;
  tuitionBalance: number;
  user: { name: string; username: string };
};

function primaryContactName(profile: Profile): string | null {
  if (profile.primaryContact === "MOTHER" && profile.motherName) return profile.motherName;
  if (profile.primaryContact === "FATHER" && profile.fatherName) return profile.fatherName;
  return profile.fatherName ?? profile.motherName ?? null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Ιανουάριος","Φεβρουάριος","Μάρτιος","Απρίλιος","Μάιος","Ιούνιος","Ιούλιος","Αύγουστος","Σεπτέμβριος","Οκτώβριος","Νοέμβριος","Δεκέμβριος"];
const MONTH_SHORT = ["Ιαν","Φεβ","Μαρ","Απρ","Μαϊ","Ιουν","Ιουλ","Αυγ","Σεπ","Οκτ","Νοε","Δεκ"];
const EXAM_TYPE_LABELS: Record<string, string> = { EXAM: "Διαγώνισμα", TEST: "Τεστ", QUESTIONS: "Ερωτήσεις" };

// Colors (bg, text, border) per subject index — used in both print and screen
const S_BG  = ["#dbeafe","#ede9fe","#d1fae5","#ffedd5","#fce7f3","#ccfbf1"];
const S_CLR = ["#1e40af","#5b21b6","#065f46","#9a3412","#9d174d","#134e4a"];
const S_BRD = ["#93c5fd","#c4b5fd","#6ee7b7","#fcd34d","#f9a8d4","#99f6e4"];

// ── Date helpers ──────────────────────────────────────────────────────────────

function localDateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
function utcDateKey(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`;
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDayOfWeek(y: number, m: number) {
  const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1;
}

function getSubjIdx(enrollments: Enrollment[], subject: string): number {
  const i = enrollments.findIndex(e => e.subject === subject);
  return (i >= 0 ? i : 0) % S_BG.length;
}

// ── Print HTML generator ──────────────────────────────────────────────────────

function generatePrintHTML(opts: {
  mode: "monthly" | "overall";
  profile: Profile;
  enrollments: Enrollment[];
  sessions: SessionStatus[];
  absences: Absence[];
  groupEvents: GroupClassEvent[];
  payments: Payment[];
  exams: StudentExam[];
  allAbsences: Absence[];
  selMonth: { year: number; month: number };
  balance: number;
}): string {
  const { mode, profile, enrollments, sessions, absences, groupEvents, payments, exams, allAbsences, selMonth, balance } = opts;

  const si = (subject: string) => getSubjIdx(enrollments, subject);

  // ── Section title ──────────────────────────────────────────────────────────
  function sectionTitle(label: string, sub = "") {
    return `<div style="font-size:7.5pt;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#4b5563;border-left:3px solid #1e40af;padding-left:5px;margin:8px 0 5px;">${label}${sub ? `<span style="font-weight:400;"> ${sub}</span>` : ""}</div>`;
  }

  // ── Calendar (monthly) ────────────────────────────────────────────────────
  function calendarHTML(): string {
    const { year, month } = selMonth;
    const days = getDaysInMonth(year, month);
    const first = getFirstDayOfWeek(year, month);

    const heads = ["Δευ","Τρί","Τετ","Πέμ","Παρ","Σάβ","Κυρ"].map(
      h => `<div style="background:#f3f4f6;text-align:center;font-weight:700;padding:2px 1px;color:#6b7280;font-size:6.5pt;">${h}</div>`
    ).join("");

    const empties = Array.from({length: first}, () => `<div style="background:white;"></div>`).join("");

    const cells = Array.from({length: days}, (_, i) => {
      const dayNum = i + 1;
      const dateKey = localDateKey(year, month, dayNum);
      const weekday = new Date(year, month, dayNum).getDay();
      const wd = weekday === 0 ? 6 : weekday - 1;

      // Group events for this day
      const gevts = groupEvents.filter(e => utcDateKey(e.date) === dateKey);
      const gSubjs = new Set(gevts.map(e => e.subject));

      // Slot events (private lessons, not in group events)
      const slots = enrollments.flatMap(en =>
        en.slots
          .filter(sl => sl.dayOfWeek === wd && !gSubjs.has(en.subject))
          .map(sl => ({ enrollment: en, slot: sl }))
      );

      const chips: string[] = [];

      for (const ge of gevts) {
        const enrol = enrollments.find(e => e.subject === ge.subject);
        const sess = enrol ? sessions.find(s => s.enrollmentId === enrol.id && utcDateKey(s.date) === dateKey) : null;
        const absent = absences.some(a => utcDateKey(a.date) === dateKey && a.subject === ge.subject);
        const idx = si(ge.subject);

        let bg = S_BG[idx], clr = S_CLR[idx], extra = "";
        if (sess && !sess.held) { bg = "#f3f4f6"; clr = "#9ca3af"; extra = "text-decoration:line-through;"; }
        else if (absent)        { bg = "#fee2e2"; clr = "#dc2626"; extra = "font-weight:700;"; }

        const label = ge.subject.split(" ")[0].substring(0, 7);
        chips.push(`<div style="background:${bg};color:${clr};font-size:6pt;padding:1px 2px;border-radius:2px;margin:1px 0;overflow:hidden;white-space:nowrap;${extra}">${label}${absent ? " ✕" : ""}</div>`);
      }

      for (const { enrollment, slot } of slots) {
        const sess = sessions.find(s => s.enrollmentId === enrollment.id && utcDateKey(s.date) === dateKey);
        const absent = absences.some(a => utcDateKey(a.date) === dateKey && a.subject === enrollment.subject);
        const idx = si(enrollment.subject);

        let bg = "#fef3c7", clr = "#92400e", extra = "";
        if (sess && !sess.held) { bg = "#f3f4f6"; clr = "#9ca3af"; extra = "text-decoration:line-through;"; }
        else if (absent)        { bg = "#fee2e2"; clr = "#dc2626"; extra = "font-weight:700;"; }
        else if (sess?.held)    { bg = S_BG[idx]; clr = S_CLR[idx]; }

        const label = enrollment.subject.split(" ")[0].substring(0, 7);
        chips.push(`<div style="background:${bg};color:${clr};font-size:6pt;padding:1px 2px;border-radius:2px;margin:1px 0;overflow:hidden;white-space:nowrap;${extra}">${label}${absent ? " ✕" : ""}</div>`);
      }

      return `<div style="background:white;min-height:44px;padding:2px;vertical-align:top;"><div style="font-weight:700;font-size:6.5pt;margin-bottom:1px;">${dayNum}</div>${chips.join("")}</div>`;
    }).join("");

    const legend = enrollments.map((e, i) => {
      const idx = i % S_BG.length;
      return `<span style="background:${S_BG[idx]};color:${S_CLR[idx]};border:1px solid ${S_BRD[idx]};padding:1px 5px;border-radius:3px;font-weight:700;">${e.subject}</span>`;
    }).join(" ") + ` <span style="background:#fef3c7;color:#92400e;border:1px solid #fcd34d;padding:1px 5px;border-radius:3px;">Αδιόριστο</span> <span style="background:#fee2e2;color:#dc2626;padding:1px 5px;border-radius:3px;font-weight:700;">Απουσία ✕</span> <span style="background:#f3f4f6;color:#9ca3af;padding:1px 5px;border-radius:3px;text-decoration:line-through;">Ακυρώθηκε</span>`;

    return `
      <div style="font-size:6.5pt;display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;">${legend}</div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:1px;background:#e5e7eb;border:1px solid #e5e7eb;">${heads}${empties}${cells}</div>`;
  }

  // ── Exams ─────────────────────────────────────────────────────────────────
  function examsHTML(examList: StudentExam[]): string {
    if (examList.length === 0) return `<p style="font-size:7.5pt;color:#9ca3af;font-style:italic;margin:4px 0;">Δεν υπάρχουν εξετάσεις.</p>`;
    const subjects = [...new Set(examList.map(e => e.subject))];
    return `<div style="display:flex;gap:8px;flex-wrap:wrap;">` + subjects.map(subj => {
      const idx = si(subj);
      const subExams = examList.filter(e => e.subject === subj);
      const cards = subExams.map(ex => {
        const g = ex.grade;
        const absent = g?.absent === true;
        const hasGrade = g !== null && !absent && g.totalScore !== null;
        const displayDate = g?.writtenDate ?? ex.examDate;
        const tc = ex.examType === "EXAM" ? "#ef4444" : ex.examType === "TEST" ? "#3b82f6" : "#8b5cf6";
        let inner = `<div style="font-size:5.5pt;font-weight:700;color:${tc};text-transform:uppercase;">${EXAM_TYPE_LABELS[ex.examType]}</div>`;
        inner += `<div style="font-size:7.5pt;font-weight:700;color:${absent?"#dc2626":"#111827"};line-height:1.2;">${ex.title}</div>`;
        if (displayDate) inner += `<div style="font-size:6pt;color:#9ca3af;">${new Date(displayDate).toLocaleDateString("el-GR",{day:"numeric",month:"short",year:"numeric"})}</div>`;
        if (absent) {
          inner += `<div style="font-size:7pt;font-weight:700;color:#dc2626;">ΑΠΩΝ</div>`;
        } else if (hasGrade) {
          inner += `<div style="font-size:12pt;font-weight:700;color:#111827;line-height:1.1;">${g!.totalScore}<span style="font-size:6.5pt;color:#9ca3af;">/${ex.scale}</span></div>`;
          if (ex.examType === "EXAM" && g) {
            const ts = [g.theme1, g.theme2, g.theme3, g.theme4].filter(t => t !== null);
            if (ts.length > 0) inner += `<div style="font-size:5.5pt;color:#6b7280;">${ts.map((t,i)=>`Θ${i+1}:${t}`).join(" · ")}</div>`;
          }
          if (ex.classStats.count > 0) inner += `<div style="font-size:5.5pt;color:#9ca3af;border-top:1px solid #f3f4f6;margin-top:2px;padding-top:2px;">Ελ.${ex.classStats.min} · Μ.Ο.${ex.classStats.avg?.toFixed(1)} · Μεγ.${ex.classStats.max}</div>`;
        } else {
          inner += `<div style="font-size:6.5pt;color:#d1d5db;font-style:italic;">Αδιόρθωτο</div>`;
        }
        return `<div style="border:1px solid #e5e7eb;border-left:3px solid ${tc};border-radius:2px 4px 4px 2px;padding:3px 5px;margin-bottom:3px;background:${absent?"#fef2f2":"white"};">${inner}</div>`;
      }).join("");
      return `<div style="flex:1;min-width:90px;"><div style="background:${S_BG[idx]};color:${S_CLR[idx]};border:1px solid ${S_BRD[idx]};padding:3px 6px;border-radius:4px;text-align:center;font-weight:700;font-size:7pt;margin-bottom:4px;">${subj}</div>${cards}</div>`;
    }).join("") + `</div>`;
  }

  // ── Payments ──────────────────────────────────────────────────────────────
  function paymentsHTML(list: Payment[], showBalance = false): string {
    if (list.length === 0) return `<p style="font-size:7.5pt;color:#9ca3af;font-style:italic;margin:4px 0;">Δεν υπάρχουν πληρωμές.</p>`;
    const total = list.reduce((s, p) => s + p.amount, 0);
    let t = `<table style="width:100%;border-collapse:collapse;font-size:7.5pt;">`;
    t += `<tr style="background:#f3f4f6;"><th style="padding:3px 5px;text-align:left;border-bottom:1px solid #e5e7eb;">Ημερομηνία</th><th style="padding:3px 5px;text-align:left;border-bottom:1px solid #e5e7eb;">Περιγραφή</th><th style="padding:3px 5px;text-align:left;border-bottom:1px solid #e5e7eb;">Τρόπος</th><th style="padding:3px 5px;text-align:right;border-bottom:1px solid #e5e7eb;">Ποσό</th></tr>`;
    for (const p of list) {
      t += `<tr><td style="padding:2px 5px;border-bottom:1px solid #f9fafb;">${new Date(p.date).toLocaleDateString("el-GR")}</td><td style="padding:2px 5px;border-bottom:1px solid #f9fafb;">${p.description}</td><td style="padding:2px 5px;border-bottom:1px solid #f9fafb;">${p.paymentMethod ?? "—"}</td><td style="padding:2px 5px;border-bottom:1px solid #f9fafb;text-align:right;font-weight:600;color:#059669;">+${p.amount.toFixed(2)}€</td></tr>`;
    }
    if (showBalance) {
      t += `<tr style="background:#f3f4f6;"><td colspan="3" style="padding:3px 5px;font-weight:700;">Σύνολο:</td><td style="padding:3px 5px;text-align:right;font-weight:700;color:#059669;">${total.toFixed(2)}€</td></tr>`;
      t += `<tr style="background:${balance>0?"#fef2f2":"#f0fdf4"};"><td colspan="3" style="padding:3px 5px;font-weight:700;">Υπόλοιπο:</td><td style="padding:3px 5px;text-align:right;font-weight:700;color:${balance>0?"#dc2626":"#059669"};">${Math.abs(balance).toFixed(2)}€${balance>0?" (οφειλή)":""}</td></tr>`;
    }
    return t + `</table>`;
  }

  // ── Absences by month (overall) ───────────────────────────────────────────
  function absencesByMonthHTML(): string {
    if (allAbsences.length === 0) return `<p style="font-size:7.5pt;color:#9ca3af;font-style:italic;margin:4px 0;">Δεν υπάρχουν καταγεγραμμένες απουσίες.</p>`;
    const byM: Record<string, Absence[]> = {};
    for (const a of allAbsences) {
      const d = new Date(a.date);
      const k = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}`;
      (byM[k] = byM[k] ?? []).push(a);
    }
    const months = Object.keys(byM).sort();
    return `<div style="display:flex;gap:8px;flex-wrap:wrap;">` + months.map(mk => {
      const [y, m] = mk.split("-").map(Number);
      const list = byM[mk].sort((a,b) => a.date.localeCompare(b.date));
      const rows = list.map(a => {
        const d = new Date(a.date);
        const dateStr = `${String(d.getUTCDate()).padStart(2,"0")}/${String(d.getUTCMonth()+1).padStart(2,"0")}`;
        const idx = si(a.subject);
        return `<div style="font-size:6.5pt;padding:1.5px 4px;margin-bottom:2px;background:${S_BG[idx]};color:${S_CLR[idx]};border-radius:2px;display:flex;justify-content:space-between;gap:4px;"><span>${dateStr}</span><span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:80px;">${a.subject.substring(0,13)}</span></div>`;
      }).join("");
      return `<div style="min-width:110px;flex:1;"><div style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-weight:700;font-size:7pt;color:#374151;text-align:center;margin-bottom:3px;">${MONTH_SHORT[m-1]} ${y} <span style="font-weight:400;color:#9ca3af;">(${list.length})</span></div>${rows}</div>`;
    }).join("") + `</div>`;
  }

  // ── Header ─────────────────────────────────────────────────────────────────
  const header = `<div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2.5px solid #1e40af;padding-bottom:8px;margin-bottom:10px;">
    <div><div style="font-size:14pt;font-weight:700;color:#1e40af;">Apex Academy</div>
    <div style="font-size:7.5pt;color:#6b7280;margin-top:2px;">${mode==="monthly" ? `Μηνιαία Σύνοψη — ${MONTH_NAMES[selMonth.month]} ${selMonth.year}` : `Συνολικός Απολογισμός${profile.schoolYear?` — ${profile.schoolYear}`:""}`}</div></div>
    <div style="text-align:right;font-size:7.5pt;color:#374151;">
      <div style="font-size:10.5pt;font-weight:700;color:#111827;">${profile.user.name}</div>
      <div>${profile.classYear}${profile.direction?` · ${profile.direction}`:""}</div>
      ${primaryContactName(profile) ? `<div style="color:#6b7280;">Γονέας: ${primaryContactName(profile)}</div>` : ""}
      <div style="color:#9ca3af;">${new Date().toLocaleDateString("el-GR")}</div>
    </div>
  </div>`;

  // ── Body by mode ───────────────────────────────────────────────────────────
  let body = "";

  if (mode === "monthly") {
    const totalAbs = absences.length;
    const cancelled = sessions.filter(s => !s.held).length;
    body = `
      ${sectionTitle("Μηνιαίο Πρόγραμμα & Απουσίες")}
      ${calendarHTML()}
      <div style="margin-top:4px;font-size:7pt;color:#6b7280;display:flex;gap:16px;">
        <span>Απουσίες μήνα: <strong style="color:#dc2626;">${totalAbs}</strong></span>
        <span>Ακυρωμένα μαθήματα: <strong>${cancelled}</strong></span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:12px;">
        <div>
          ${sectionTitle("Εξετάσεις Μήνα")}
          ${examsHTML(exams)}
        </div>
        <div>
          ${sectionTitle("Πληρωμές Μήνα")}
          ${paymentsHTML(payments, true)}
        </div>
      </div>`;
  } else {
    body = `
      ${sectionTitle("Απουσίες ανά Μήνα", `(${allAbsences.length} σύνολο)`)}
      ${absencesByMonthHTML()}
      ${sectionTitle("Εξετάσεις")}
      ${examsHTML(exams)}
      ${sectionTitle("Ιστορικό Πληρωμών")}
      ${paymentsHTML(payments, true)}`;
  }

  // ── Full document ──────────────────────────────────────────────────────────
  return `<!DOCTYPE html><html lang="el"><head><meta charset="utf-8">
<title>Σύνοψη — ${profile.user.name}</title>
<style>
  @page { size: A4; margin: 1.2cm 1.4cm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #1a1a1a; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>${header}${body}</body></html>`;
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  profile: Profile;
  enrollments: Enrollment[];
  studentGroups: StudentGroup[];
  studentExams: StudentExam[];
  balance: number;
}

export default function StudentSummary({ profile, enrollments, studentGroups, studentExams, balance }: Props) {
  const [mode, setMode] = useState<"monthly" | "overall">("monthly");
  const [selMonth, setSelMonth] = useState(() => {
    const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [sessions, setSessions] = useState<SessionStatus[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [groupEvents, setGroupEvents] = useState<GroupClassEvent[]>([]);
  const [allAbsences, setAllAbsences] = useState<Absence[]>([]);
  const [allPayments, setAllPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailSending, setEmailSending] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const monthStr = `${selMonth.year}-${String(selMonth.month + 1).padStart(2, "0")}`;

  const loadMonthly = useCallback(async () => {
    setLoading(true);
    const [sRes, aRes] = await Promise.all([
      fetch(`/api/sessions?studentId=${profile.id}&month=${monthStr}`),
      fetch(`/api/absences?studentId=${profile.id}&month=${monthStr}`),
    ]);
    if (sRes.ok) setSessions(await sRes.json());
    if (aRes.ok) setAbsences(await aRes.json());
    if (studentGroups.length > 0) {
      const names = studentGroups.map(sg => sg.group.name).join(",");
      const eRes = await fetch(`/api/class-events?month=${monthStr}&groups=${encodeURIComponent(names)}`);
      if (eRes.ok) {
        const data: GroupClassEvent[] = await eRes.json();
        const enrolled = new Set(enrollments.map(e => e.subject));
        setGroupEvents(data.filter(e => enrolled.has(e.subject)));
      } else setGroupEvents([]);
    } else setGroupEvents([]);
    setLoading(false);
  }, [monthStr, profile.id, studentGroups, enrollments]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [aRes, pRes] = await Promise.all([
      fetch(`/api/absences?studentId=${profile.id}`),
      fetch(`/api/payments?studentId=${profile.id}`),
    ]);
    if (aRes.ok) setAllAbsences(await aRes.json());
    if (pRes.ok) setAllPayments(await pRes.json());
    setLoading(false);
  }, [profile.id]);

  // Always load payments (used in both modes)
  useEffect(() => {
    fetch(`/api/payments?studentId=${profile.id}`)
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setAllPayments(d); });
  }, [profile.id]);

  useEffect(() => {
    if (mode === "monthly") loadMonthly(); else loadAll();
  }, [mode, loadMonthly, loadAll]);

  // Derived monthly data
  const monthlyPayments = allPayments.filter(p => {
    const d = new Date(p.date);
    return d.getUTCFullYear() === selMonth.year && d.getUTCMonth() === selMonth.month;
  });
  const monthlyExams = studentExams.filter(ex => {
    const ds = ex.grade?.writtenDate ?? ex.examDate;
    if (!ds) return false;
    const d = new Date(ds);
    return d.getFullYear() === selMonth.year && d.getMonth() === selMonth.month;
  });

  // Generate print HTML whenever data changes
  const printHTML = useMemo(() => {
    if (loading) return "";
    return generatePrintHTML({
      mode, profile, enrollments, sessions, absences, groupEvents,
      payments: mode === "monthly" ? monthlyPayments : allPayments,
      exams: mode === "monthly" ? monthlyExams : studentExams,
      allAbsences, selMonth, balance,
    });
  }, [loading, mode, profile, enrollments, sessions, absences, groupEvents, allPayments, allAbsences, selMonth, studentExams, balance]);

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(printHTML);
    win.document.close();
    setTimeout(() => win.print(), 350);
  }

  async function handleEmail() {
    if (!profile.parentEmail) {
      alert("Δεν υπάρχει email γονέα. Προσθέστε το στα Στοιχεία Μαθητή.");
      return;
    }
    setEmailSending(true);
    const res = await fetch(`/api/students/${profile.id}/send-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        htmlContent: printHTML,
        parentEmail: profile.parentEmail,
        parentName: primaryContactName(profile) ?? "Γονέα/Κηδεμόνα",
        studentName: profile.user.name,
        emailSubject: mode === "monthly"
          ? `Μηνιαία Σύνοψη ${profile.user.name} — ${MONTH_NAMES[selMonth.month]} ${selMonth.year}`
          : `Συνολικός Απολογισμός — ${profile.user.name}`,
      }),
    });
    const d = await res.json();
    if (res.ok) alert("Το email εστάλη επιτυχώς στον γονέα!");
    else alert(d.error ?? "Σφάλμα αποστολής. Ελέγξτε τη διαμόρφωση SMTP στο .env αρχείο.");
    setEmailSending(false);
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
          {(["monthly","overall"] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${mode === m ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {m === "monthly" ? "Μηνιαία" : "Συνολική"}
            </button>
          ))}
        </div>

        {mode === "monthly" && (
          <div className="flex items-center gap-1">
            <button onClick={() => setSelMonth(m => { const d = new Date(m.year, m.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
              className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-semibold text-gray-700 w-44 text-center">
              {MONTH_NAMES[selMonth.month]} {selMonth.year}
            </span>
            <button onClick={() => setSelMonth(m => { const d = new Date(m.year, m.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
              className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handlePrint} disabled={loading} className="gap-1.5">
            <Printer className="w-4 h-4" /> Εκτύπωση / PDF
          </Button>
          <Button size="sm" variant="outline" onClick={handleEmail} disabled={emailSending || loading} className="gap-1.5">
            <Mail className="w-4 h-4" />
            {emailSending ? "Αποστολή..." : "Email Γονέα"}
          </Button>
        </div>
      </div>

      {/* Preview */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden bg-white">
          <iframe
            ref={iframeRef}
            srcDoc={printHTML}
            className="w-full"
            style={{ minHeight: 600, border: "none", display: "block" }}
            onLoad={e => {
              const f = e.target as HTMLIFrameElement;
              const h = f.contentDocument?.body?.scrollHeight;
              if (h && h > 0) f.style.height = `${h + 32}px`;
            }}
          />
        </div>
      )}
    </div>
  );
}
