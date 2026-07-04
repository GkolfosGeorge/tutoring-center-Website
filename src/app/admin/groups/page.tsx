"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, ChevronDown, ChevronRight, Trash2, X, Users, Calendar, Search, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// ── Types ──────────────────────────────────────────────────────────────────

type Group = {
  id: string;
  name: string;
  classYear: string | null;
  _count: { members: number };
};

type Enrollment = { id: string; subject: string };

type Member = {
  id: string;
  studentId: string;
  subjects: string[] | null;
  student: {
    id: string;
    classYear: string;
    user: { name: string; username: string };
    enrollments: Enrollment[];
  };
};

type GroupDetail = {
  id: string;
  name: string;
  members: Member[];
};

type StudentSummary = {
  id: string;
  classYear: string;
  user: { name: string };
};

type ClassEvent = {
  id: string;
  groupName: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  classroom?: string | null;
  recurrenceId?: string | null;
};

type ScheduleSummary = {
  key: string;
  recurrenceId: string | null;
  subject: string;
  startTime: string;
  endTime: string;
  dayOfWeek: number;
  lastDate: string;
  count: number;
  classroom: string | null;
  firstEventId: string;
};

// ── Constants ──────────────────────────────────────────────────────────────

const CLASS_YEARS = [
  "Γ' Λυκείου",
  "Β' Λυκείου",
  "Α' Λυκείου",
  "Γ' Γυμνασίου",
  "Β' Γυμνασίου",
  "Α' Γυμνασίου",
];

const DAYS_GR = ["Κυρ", "Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ"];
const MONTHS_GR = ["Ιαν", "Φεβ", "Μαρ", "Απρ", "Μαΐ", "Ιουν", "Ιουλ", "Αυγ", "Σεπ", "Οκτ", "Νοε", "Δεκ"];

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${DAYS_GR[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_GR[d.getUTCMonth()]}`;
}

function getGroupSubjects(detail: GroupDetail): string[] {
  const set = new Set<string>();
  for (const m of detail.members) {
    if (m.subjects === null) {
      m.student.enrollments.forEach(e => set.add(e.subject));
    } else {
      m.subjects.forEach(s => set.add(s));
    }
  }
  return [...set].sort();
}

// Subjects this student already has in OTHER groups (not the current one)
function takenSubjects(
  enrollments: Enrollment[],
  rawGroups: { groupId: string; subjects: string | null }[],
  currentGroupId: string
): Set<string> {
  const taken = new Set<string>();
  for (const sg of rawGroups) {
    if (sg.groupId === currentGroupId) continue;
    if (sg.subjects === null) {
      enrollments.forEach(e => taken.add(e.subject));
    } else {
      try {
        const subs: string[] = JSON.parse(sg.subjects);
        subs.forEach(s => taken.add(s));
      } catch { /* ignore */ }
    }
  }
  return taken;
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"members" | "schedule">("members");

  // New group form
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupYear, setNewGroupYear] = useState(CLASS_YEARS[0]);
  const [creating, setCreating] = useState(false);

  // Events (schedule tab)
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Add student form
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [allStudents, setAllStudents] = useState<StudentSummary[]>([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedStudentEnrollments, setSelectedStudentEnrollments] = useState<Enrollment[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [addingStudent, setAddingStudent] = useState(false);

  // Schedule form
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [schedSubject, setSchedSubject] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [schedUntil, setSchedUntil] = useState("");
  const [schedStart, setSchedStart] = useState("16:00");
  const [schedEnd, setSchedEnd] = useState("18:00");
  const [schedRoom, setSchedRoom] = useState("");
  const [schedIsWeekly, setSchedIsWeekly] = useState(true);
  const [schedulingLoading, setSchedulingLoading] = useState(false);

  // ── Data fetching ────────────────────────────────────────────────────────

  const loadGroups = useCallback(async () => {
    const res = await fetch("/api/groups");
    if (res.ok) setGroups(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    const res = await fetch(`/api/groups/${id}`);
    if (res.ok) setDetail(await res.json());
    setDetailLoading(false);
  }, []);

  const loadEvents = useCallback(async (groupName: string) => {
    setEventsLoading(true);
    const from = new Date().toISOString().split("T")[0];
    const future = new Date();
    future.setFullYear(future.getFullYear() + 4);
    const to = future.toISOString().split("T")[0];
    const res = await fetch(
      `/api/class-events?groups=${encodeURIComponent(groupName)}&from=${from}&to=${to}`
    );
    if (res.ok) setEvents(await res.json());
    setEventsLoading(false);
  }, []);

  // Group list split by class year
  const groupedByYear = useMemo(() => {
    const map: Record<string, Group[]> = {};
    for (const g of groups) {
      const key = g.classYear ?? "—";
      if (!map[key]) map[key] = [];
      map[key].push(g);
    }
    // Sort each bucket by name
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.name.localeCompare(b.name, "el"));
    }
    return map;
  }, [groups]);

  // Ordered class year keys: known ones first (in order), then unknowns
  const sortedYearKeys = useMemo(() => {
    const known = CLASS_YEARS.filter(y => groupedByYear[y]);
    const unknown = Object.keys(groupedByYear).filter(k => !CLASS_YEARS.includes(k));
    return [...known, ...unknown];
  }, [groupedByYear]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleExpand = useCallback(async (group: Group) => {
    if (expandedId === group.id) {
      setExpandedId(null);
      setDetail(null);
      setEvents([]);
      setShowAddStudent(false);
      setShowScheduleForm(false);
      return;
    }
    setExpandedId(group.id);
    setActiveTab("members");
    setShowAddStudent(false);
    setShowScheduleForm(false);
    setDetail(null);
    await loadDetail(group.id);
    loadEvents(group.name);
  }, [expandedId, loadDetail, loadEvents]);

  const createGroup = async () => {
    if (!newGroupName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroupName.trim(), classYear: newGroupYear }),
    });
    if (res.ok) {
      setNewGroupName("");
      setShowNewGroup(false);
      await loadGroups();
    } else {
      const data = await res.json();
      alert(data.error ?? "Σφάλμα κατά τη δημιουργία τμήματος");
    }
    setCreating(false);
  };

  const deleteGroup = async (g: Group, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Διαγραφή τμήματος "${g.name}"; Θα διαγραφούν και όλες οι συνδέσεις μαθητών και το πρόγραμμά τους.`)) return;
    const res = await fetch(`/api/groups/${g.id}`, { method: "DELETE" });
    if (!res.ok) { alert("Σφάλμα κατά τη διαγραφή τμήματος"); return; }
    if (expandedId === g.id) { setExpandedId(null); setDetail(null); }
    await loadGroups();
  };

  const [studentsLoading, setStudentsLoading] = useState(false);

  const loadAllStudents = useCallback(async () => {
    if (studentsLoaded) return;
    setStudentsLoading(true);
    const res = await fetch("/api/students");
    if (res.ok) { setAllStudents(await res.json()); setStudentsLoaded(true); }
    setStudentsLoading(false);
  }, [studentsLoaded]);

  const openAddStudent = async () => {
    setShowAddStudent(true);
    setSelectedStudentId(null);
    setSelectedSubjects([]);
    setStudentSearch("");
    setSelectedStudentEnrollments([]);
    await loadAllStudents();
  };

  const selectStudent = async (student: StudentSummary) => {
    if (!detail) return;
    setSelectedStudentId(student.id);
    setStudentSearch(student.user.name);
    setSelectedSubjects([]);
    setSelectedStudentEnrollments([]);
    const res = await fetch(`/api/students/${student.id}`);
    if (res.ok) {
      const data = await res.json();
      const allEnrollments: Enrollment[] = data.enrollments ?? [];
      const rawGroups: { groupId: string; subjects: string | null }[] = data.groups ?? [];
      // Filter out subjects already used in other groups
      const taken = takenSubjects(allEnrollments, rawGroups, detail.id);
      const available = allEnrollments.filter(e => !taken.has(e.subject));
      setSelectedStudentEnrollments(available);
      setSelectedSubjects(available.map(e => e.subject));
    }
  };

  const toggleSubject = (subject: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subject) ? prev.filter(s => s !== subject) : [...prev, subject]
    );
  };

  const addStudent = async () => {
    if (!detail || !selectedStudentId) return;
    setAddingStudent(true);
    const res = await fetch(`/api/students/${selectedStudentId}/groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: detail.id, subjects: selectedSubjects }),
    });
    if (res.ok) {
      setShowAddStudent(false);
      setSelectedStudentId(null);
      setStudentSearch("");
      await loadDetail(detail.id);
      await loadGroups();
    } else {
      const d = await res.json();
      alert(d.error ?? "Σφάλμα κατά την προσθήκη");
    }
    setAddingStudent(false);
  };

  const removeMember = async (member: Member) => {
    if (!detail || !confirm(`Αφαίρεση "${member.student.user.name}" από το τμήμα;`)) return;
    await fetch(`/api/students/${member.studentId}/groups?groupId=${detail.id}`, { method: "DELETE" });
    await loadDetail(detail.id);
    await loadGroups();
  };

  const createSchedule = async () => {
    if (!detail || !schedSubject || !schedDate || !schedStart || !schedEnd) return;
    if (schedIsWeekly && !schedUntil) return;
    setSchedulingLoading(true);
    const res = await fetch("/api/class-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupName: detail.name,
        groupId: detail.id,
        subject: schedSubject,
        date: schedDate,
        startTime: schedStart,
        endTime: schedEnd,
        classroom: schedRoom || undefined,
        repeatUntil: schedIsWeekly ? schedUntil : undefined,
        repeatWeeks: schedIsWeekly ? undefined : 1,
        isWeekly: schedIsWeekly,
      }),
    });
    if (res.ok) {
      setShowScheduleForm(false);
      setSchedSubject("");
      setSchedDate("");
      setSchedUntil("");
      setSchedRoom("");
      setSchedIsWeekly(true);
      await loadEvents(detail.name);
    } else {
      alert("Σφάλμα κατά τη δημιουργία προγράμματος");
    }
    setSchedulingLoading(false);
  };

  const deleteSchedule = async (recurrenceId: string | null, eventId: string, subject: string, count: number) => {
    const msg = recurrenceId
      ? `Διαγραφή ολόκληρου του προγράμματος "${subject}" (${count} μαθήματα); Θα αφαιρεθεί και από τα ημερολόγια των μαθητών.`
      : `Διαγραφή μαθήματος "${subject}"; Θα αφαιρεθεί και από τα ημερολόγια των μαθητών.`;
    if (!confirm(msg)) return;
    const url = recurrenceId
      ? `/api/class-events?recurrenceId=${recurrenceId}`
      : `/api/class-events?id=${eventId}`;
    await fetch(url, { method: "DELETE" });
    if (detail) await loadEvents(detail.name);
  };

  // ── Derived values ───────────────────────────────────────────────────────

  const inGroupIds = new Set(detail?.members.map(m => m.studentId) ?? []);
  const availableStudents = allStudents.filter(s => !inGroupIds.has(s.id));
  const filteredStudents = studentSearch
    ? availableStudents.filter(s =>
        s.user.name.toLowerCase().includes(studentSearch.toLowerCase())
      )
    : [];

  const groupSubjects = detail ? getGroupSubjects(detail) : [];

  // ── Render ───────────────────────────────────────────────────────────────

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
          <h1 className="text-2xl font-bold text-gray-900">Τμήματα</h1>
          <p className="text-sm text-gray-500 mt-0.5">{groups.length} τμήματα</p>
        </div>
        <Button onClick={() => setShowNewGroup(v => !v)} className="gap-2">
          <Plus className="w-4 h-4" />
          Νέο Τμήμα
        </Button>
      </div>

      {/* New group inline form */}
      <AnimatePresence>
        {showNewGroup && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-xl border border-blue-200 p-4 space-y-3">
              <div className="flex gap-3">
                <select
                  value={newGroupYear}
                  onChange={e => setNewGroupYear(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                >
                  {CLASS_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <Input
                  placeholder="Όνομα τμήματος (π.χ. Γ ΘΕΤΙΚΗ 1)"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createGroup()}
                  autoFocus
                />
                <Button onClick={createGroup} disabled={creating || !newGroupName.trim()}>
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Δημιουργία"}
                </Button>
                <Button variant="ghost" onClick={() => setShowNewGroup(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {groups.length === 0 && (
        <div className="text-center py-20 text-gray-400">
          <Users className="w-14 h-14 mx-auto mb-4 opacity-30" />
          <p className="font-medium">Δεν υπάρχουν τμήματα ακόμη</p>
          <p className="text-sm mt-1">Δημιουργήστε το πρώτο τμήμα πατώντας «Νέο Τμήμα»</p>
        </div>
      )}

      {/* Groups grouped by class year */}
      <div className="space-y-8">
        {sortedYearKeys.map(yearKey => (
          <div key={yearKey}>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">
              {yearKey}
            </h2>
            <div className="space-y-3">
              {groupedByYear[yearKey].map(group => (
                <GroupCard
                  key={group.id}
                  group={group}
                  expandedId={expandedId}
                  detail={detail}
                  detailLoading={detailLoading}
                  activeTab={activeTab}
                  events={events}
                  eventsLoading={eventsLoading}
                  showAddStudent={showAddStudent}
                  showScheduleForm={showScheduleForm}
                  studentSearch={studentSearch}
                  selectedStudentId={selectedStudentId}
                  selectedStudentEnrollments={selectedStudentEnrollments}
                  selectedSubjects={selectedSubjects}
                  addingStudent={addingStudent}
                  schedSubject={schedSubject}
                  schedDate={schedDate}
                  schedUntil={schedUntil}
                  schedStart={schedStart}
                  schedEnd={schedEnd}
                  schedRoom={schedRoom}
                  schedIsWeekly={schedIsWeekly}
                  studentsLoading={studentsLoading}
                  schedulingLoading={schedulingLoading}
                  groupSubjects={groupSubjects}
                  filteredStudents={filteredStudents}
                  onExpand={() => handleExpand(group)}
                  onDelete={e => deleteGroup(group, e)}
                  onTabChange={setActiveTab}
                  onOpenAddStudent={openAddStudent}
                  onStudentSearch={v => {
                    setStudentSearch(v);
                    if (selectedStudentId) {
                      setSelectedStudentId(null);
                      setSelectedStudentEnrollments([]);
                      setSelectedSubjects([]);
                    }
                  }}
                  onSelectStudent={selectStudent}
                  onToggleSubject={toggleSubject}
                  onAddStudent={addStudent}
                  onCancelAddStudent={() => setShowAddStudent(false)}
                  onRemoveMember={removeMember}
                  onDeleteSchedule={deleteSchedule}
                  onOpenScheduleForm={() => setShowScheduleForm(true)}
                  onSchedSubjectChange={setSchedSubject}
                  onSchedDateChange={setSchedDate}
                  onSchedUntilChange={setSchedUntil}
                  onSchedStartChange={setSchedStart}
                  onSchedEndChange={setSchedEnd}
                  onSchedRoomChange={setSchedRoom}
                  onSchedIsWeeklyChange={setSchedIsWeekly}
                  onCreateSchedule={createSchedule}
                  onCancelScheduleForm={() => setShowScheduleForm(false)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── GroupCard sub-component ────────────────────────────────────────────────

type GroupCardProps = {
  group: Group;
  expandedId: string | null;
  detail: GroupDetail | null;
  detailLoading: boolean;
  activeTab: "members" | "schedule";
  events: ClassEvent[];
  eventsLoading: boolean;
  showAddStudent: boolean;
  showScheduleForm: boolean;
  studentSearch: string;
  selectedStudentId: string | null;
  selectedStudentEnrollments: Enrollment[];
  selectedSubjects: string[];
  addingStudent: boolean;
  schedSubject: string;
  schedDate: string;
  schedUntil: string;
  schedStart: string;
  schedEnd: string;
  schedRoom: string;
  schedIsWeekly: boolean;
  studentsLoading: boolean;
  schedulingLoading: boolean;
  groupSubjects: string[];
  filteredStudents: StudentSummary[];
  onExpand: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onTabChange: (tab: "members" | "schedule") => void;
  onOpenAddStudent: () => void;
  onStudentSearch: (v: string) => void;
  onSelectStudent: (s: StudentSummary) => void;
  onToggleSubject: (s: string) => void;
  onAddStudent: () => void;
  onCancelAddStudent: () => void;
  onRemoveMember: (m: Member) => void;
  onDeleteSchedule: (recurrenceId: string | null, eventId: string, subject: string, count: number) => void;
  onOpenScheduleForm: () => void;
  onSchedSubjectChange: (v: string) => void;
  onSchedDateChange: (v: string) => void;
  onSchedUntilChange: (v: string) => void;
  onSchedStartChange: (v: string) => void;
  onSchedEndChange: (v: string) => void;
  onSchedRoomChange: (v: string) => void;
  onSchedIsWeeklyChange: (v: boolean) => void;
  onCreateSchedule: () => void;
  onCancelScheduleForm: () => void;
};

const DAYS_FULL = ["Κυριακή", "Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο"];

function buildSummaries(events: ClassEvent[]): ScheduleSummary[] {
  const map = new Map<string, ScheduleSummary>();
  for (const ev of events) {
    const key = ev.recurrenceId ?? ev.id;
    if (!map.has(key)) {
      map.set(key, {
        key,
        recurrenceId: ev.recurrenceId ?? null,
        subject: ev.subject,
        startTime: ev.startTime,
        endTime: ev.endTime,
        dayOfWeek: new Date(ev.date).getUTCDay(),
        lastDate: ev.date,
        count: 0,
        classroom: ev.classroom ?? null,
        firstEventId: ev.id,
      });
    }
    const s = map.get(key)!;
    s.count++;
    if (ev.date > s.lastDate) s.lastDate = ev.date;
  }
  return [...map.values()].sort((a, b) => a.subject.localeCompare(b.subject, "el"));
}

function formatSummaryDate(iso: string) {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

function GroupCard({
  group, expandedId, detail, detailLoading, activeTab,
  events, eventsLoading, showAddStudent, showScheduleForm,
  studentSearch, selectedStudentId, selectedStudentEnrollments,
  selectedSubjects, addingStudent, schedSubject, schedDate, schedUntil,
  schedStart, schedEnd, schedRoom, schedIsWeekly, studentsLoading, schedulingLoading,
  groupSubjects, filteredStudents,
  onExpand, onDelete, onTabChange, onOpenAddStudent, onStudentSearch,
  onSelectStudent, onToggleSubject, onAddStudent, onCancelAddStudent,
  onRemoveMember, onDeleteSchedule, onOpenScheduleForm,
  onSchedSubjectChange, onSchedDateChange, onSchedUntilChange, onSchedStartChange,
  onSchedEndChange, onSchedRoomChange, onSchedIsWeeklyChange,
  onCreateSchedule, onCancelScheduleForm,
}: GroupCardProps) {
  const isExpanded = expandedId === group.id;
  const isDetailForThisGroup = detail?.id === group.id;
  const scheduleSummaries = useMemo(() => buildSummaries(events), [events]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Group header */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors select-none"
        onClick={onExpand}
      >
        <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
          <Users className="w-5 h-5 text-blue-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900">{group.name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{group._count.members} μαθητές</p>
        </div>
        <button
          onClick={onDelete}
          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="Διαγραφή τμήματος"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        {isExpanded
          ? <ChevronDown className="w-5 h-5 text-gray-400" />
          : <ChevronRight className="w-5 h-5 text-gray-400" />
        }
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-gray-100"
          >
            {detailLoading || !isDetailForThisGroup ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              </div>
            ) : detail ? (
              <div className="p-5">
                {/* Tabs */}
                <div className="flex gap-1 mb-5 border-b border-gray-100 -mx-5 px-5">
                  {(["members", "schedule"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => onTabChange(tab)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        activeTab === tab
                          ? "border-blue-600 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {tab === "members"
                        ? <><Users className="w-4 h-4" />Μαθητές ({detail.members.length})</>
                        : <><Calendar className="w-4 h-4" />Πρόγραμμα</>
                      }
                    </button>
                  ))}
                </div>

                {/* ── Members tab ── */}
                {activeTab === "members" && (
                  <div className="space-y-2">
                    {detail.members.length === 0 && !showAddStudent && (
                      <p className="text-sm text-gray-400 text-center py-6">
                        Δεν υπάρχουν μαθητές σε αυτό το τμήμα
                      </p>
                    )}

                    {detail.members.map(member => (
                      <div key={member.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-gray-900 text-sm">
                              {member.student.user.name}
                            </span>
                            <span className="text-xs text-gray-400">{member.student.classYear}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {member.subjects === null ? (
                              <Badge variant="secondary" className="text-xs">Όλα τα μαθήματα</Badge>
                            ) : (
                              member.subjects.map(s => (
                                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                              ))
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => onRemoveMember(member)}
                          className="p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Αφαίρεση από τμήμα"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    {!showAddStudent && (
                      <Button variant="outline" size="sm" onClick={onOpenAddStudent} className="gap-1.5 mt-2">
                        <Plus className="w-3.5 h-3.5" />
                        Προσθήκη Μαθητή
                      </Button>
                    )}

                    <AnimatePresence>
                      {showAddStudent && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="border border-blue-100 bg-blue-50/40 rounded-xl p-4 space-y-3 mt-2"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-700">Προσθήκη Μαθητή στο Τμήμα</h4>
                            <button onClick={onCancelAddStudent} className="text-gray-400 hover:text-gray-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                              placeholder="Αναζήτηση ονόματος μαθητή..."
                              value={studentSearch}
                              onChange={e => onStudentSearch(e.target.value)}
                              className="pl-9"
                              autoFocus
                            />
                          </div>

                          {studentSearch && !selectedStudentId && (
                            <div className="border border-gray-200 rounded-lg bg-white shadow-sm max-h-44 overflow-y-auto">
                              {studentsLoading ? (
                                <div className="flex items-center justify-center gap-2 py-3">
                                  <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                  <span className="text-sm text-gray-400">Φόρτωση μαθητών...</span>
                                </div>
                              ) : filteredStudents.length === 0 ? (
                                <p className="text-sm text-gray-400 px-3 py-2.5">Δεν βρέθηκε μαθητής</p>
                              ) : (
                                filteredStudents.map(s => (
                                  <button
                                    key={s.id}
                                    onClick={() => onSelectStudent(s)}
                                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0 transition-colors"
                                  >
                                    <span className="font-medium text-gray-800">{s.user.name}</span>
                                    <span className="text-gray-400 text-xs ml-3 shrink-0">{s.classYear}</span>
                                  </button>
                                ))
                              )}
                            </div>
                          )}

                          {selectedStudentId && (
                            <div>
                              {selectedStudentEnrollments.length === 0 ? (
                                <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                                  Δεν υπάρχουν διαθέσιμα μαθήματα — ο μαθητής είτε δεν έχει εγγραφές είτε τα κάνει ήδη όλα σε άλλα τμήματα.
                                </p>
                              ) : (
                                <>
                                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                                    Μαθήματα με αυτό το τμήμα:
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedStudentEnrollments.map(e => (
                                      <label
                                        key={e.id}
                                        className="flex items-center gap-1.5 cursor-pointer bg-white border border-gray-200 rounded-lg px-3 py-1.5 hover:border-blue-300 transition-colors"
                                      >
                                        <input
                                          type="checkbox"
                                          checked={selectedSubjects.includes(e.subject)}
                                          onChange={() => onToggleSubject(e.subject)}
                                          className="rounded text-blue-600"
                                        />
                                        <span className="text-sm">{e.subject}</span>
                                      </label>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              onClick={onAddStudent}
                              disabled={addingStudent || !selectedStudentId || selectedSubjects.length === 0}
                              className="gap-1.5"
                            >
                              {addingStudent
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Plus className="w-3.5 h-3.5" />
                              }
                              Προσθήκη
                            </Button>
                            <Button variant="ghost" size="sm" onClick={onCancelAddStudent}>Άκυρο</Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* ── Schedule tab ── */}
                {activeTab === "schedule" && (
                  <div className="space-y-3">
                    {eventsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {scheduleSummaries.length === 0 && !showScheduleForm && (
                          <p className="text-sm text-gray-400 text-center py-6">
                            Δεν υπάρχουν προγραμματισμένα μαθήματα
                          </p>
                        )}
                        {scheduleSummaries.map(s => (
                          <div
                            key={s.key}
                            className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl text-sm border border-gray-100"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge variant="secondary" className="shrink-0 text-xs font-semibold">{s.subject}</Badge>
                                {s.classroom && (
                                  <span className="text-[11px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">
                                    Αίθ. {s.classroom}
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-700 mt-1 font-medium">
                                {s.recurrenceId
                                  ? <>Κάθε <span className="text-blue-700">{DAYS_FULL[s.dayOfWeek]}</span> {s.startTime}–{s.endTime} · έως {formatSummaryDate(s.lastDate)}</>
                                  : <>{DAYS_GR[s.dayOfWeek]} {formatSummaryDate(s.lastDate)} {s.startTime}–{s.endTime}</>
                                }
                              </p>
                              {s.recurrenceId && (
                                <p className="text-[11px] text-gray-400 mt-0.5">{s.count} μαθήματα</p>
                              )}
                            </div>
                            <button
                              onClick={() => onDeleteSchedule(s.recurrenceId, s.firstEventId, s.subject, s.count)}
                              className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              title={s.recurrenceId ? "Διαγραφή ολόκληρου προγράμματος" : "Διαγραφή"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {!showScheduleForm && (
                      <Button variant="outline" size="sm" onClick={onOpenScheduleForm} className="gap-1.5 mt-1">
                        <Plus className="w-3.5 h-3.5" />
                        Νέο Μάθημα / Πρόγραμμα
                      </Button>
                    )}

                    <AnimatePresence>
                      {showScheduleForm && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="border border-blue-100 bg-blue-50/40 rounded-xl p-4 space-y-4 mt-2"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-700">Δημιουργία Προγράμματος</h4>
                            <button onClick={onCancelScheduleForm} className="text-gray-400 hover:text-gray-600">
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {groupSubjects.length === 0 ? (
                            <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                              Δεν υπάρχουν μαθήματα στο τμήμα — προσθέστε πρώτα μαθητές με εγγεγραμμένα μαθήματα.
                            </p>
                          ) : (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                              <div className="col-span-2">
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block uppercase tracking-wide">Μάθημα</label>
                                <select
                                  value={schedSubject}
                                  onChange={e => onSchedSubjectChange(e.target.value)}
                                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                  <option value="">Επιλογή μαθήματος...</option>
                                  {groupSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>

                              <div className={schedIsWeekly ? "" : "col-span-2"}>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block uppercase tracking-wide">
                                  {schedIsWeekly ? "Από" : "Ημερομηνία"}
                                </label>
                                <Input type="date" value={schedDate} onChange={e => onSchedDateChange(e.target.value)} />
                              </div>
                              {schedIsWeekly && (
                                <div>
                                  <label className="text-xs font-medium text-gray-600 mb-1.5 block uppercase tracking-wide">Έως</label>
                                  <Input
                                    type="date"
                                    value={schedUntil}
                                    min={schedDate || undefined}
                                    onChange={e => onSchedUntilChange(e.target.value)}
                                  />
                                </div>
                              )}

                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block uppercase tracking-wide">Ώρα έναρξης</label>
                                <Input type="text" placeholder="π.χ. 16:00" value={schedStart} onChange={e => onSchedStartChange(e.target.value)} />
                              </div>

                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block uppercase tracking-wide">Ώρα λήξης</label>
                                <Input type="text" placeholder="π.χ. 18:00" value={schedEnd} onChange={e => onSchedEndChange(e.target.value)} />
                              </div>

                              <div>
                                <label className="text-xs font-medium text-gray-600 mb-1.5 block uppercase tracking-wide">Αίθουσα (προαιρετικό)</label>
                                <Input placeholder="Π.χ. Α1" value={schedRoom} onChange={e => onSchedRoomChange(e.target.value)} />
                              </div>

                              <div className="col-span-2">
                                <label className="text-xs font-medium text-gray-600 mb-2 block uppercase tracking-wide">Τύπος Μαθήματος</label>
                                <div className="flex gap-3">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      checked={schedIsWeekly}
                                      onChange={() => onSchedIsWeeklyChange(true)}
                                      className="text-blue-600"
                                    />
                                    <span className="text-sm text-gray-700">Εβδομαδιαία επανάληψη</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      checked={!schedIsWeekly}
                                      onChange={() => onSchedIsWeeklyChange(false)}
                                      className="text-blue-600"
                                    />
                                    <span className="text-sm text-gray-700">Έκτακτο / Αναπλήρωση</span>
                                  </label>
                                </div>
                                {schedIsWeekly && schedDate && schedUntil && (
                                  <p className="text-xs text-blue-600 mt-1">
                                    Κάθε {DAYS_FULL[new Date(schedDate + "T00:00:00Z").getUTCDay()]} · {schedStart}–{schedEnd} · έως {formatSummaryDate(schedUntil)}
                                  </p>
                                )}
                              </div>

                              <div className="col-span-2 flex gap-2 pt-1">
                                <Button
                                  size="sm"
                                  onClick={onCreateSchedule}
                                  disabled={schedulingLoading || !schedSubject || !schedDate || !schedStart || !schedEnd || (schedIsWeekly && !schedUntil)}
                                  className="gap-1.5"
                                >
                                  {schedulingLoading
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Calendar className="w-3.5 h-3.5" />
                                  }
                                  Δημιουργία
                                </Button>
                                <Button variant="ghost" size="sm" onClick={onCancelScheduleForm}>Άκυρο</Button>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
