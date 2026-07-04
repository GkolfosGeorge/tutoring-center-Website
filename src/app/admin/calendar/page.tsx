"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, X, Repeat, AlertTriangle, LayoutGrid, CalendarDays } from "lucide-react";
import WeeklyView from "./WeeklyView";
import AttendanceModal from "./AttendanceModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ClassEvent = {
  id: string;
  groupName: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  classroom: string | null;
  recurrenceId: string | null;
  notes: string | null;
};

type Group = { id: string; name: string };

const MONTH_NAMES = [
  "Ιανουάριος", "Φεβρουάριος", "Μάρτιος", "Απρίλιος", "Μάιος", "Ιούνιος",
  "Ιούλιος", "Αύγουστος", "Σεπτέμβριος", "Οκτώβριος", "Νοέμβριος", "Δεκέμβριος",
];

const CHIP_COLORS = [
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-emerald-100 text-emerald-800 border-emerald-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-pink-100 text-pink-800 border-pink-200",
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "bg-red-100 text-red-800 border-red-200",
];

const CLASSROOM_COLORS: Record<string, string> = {
  "1": "bg-sky-500",
  "2": "bg-violet-500",
  "3": "bg-amber-500",
  "4": "bg-rose-500",
};

function groupColor(groups: string[], g: string) {
  const idx = groups.indexOf(g);
  return CHIP_COLORS[Math.max(0, idx) % CHIP_COLORS.length];
}

function toUTCKey(date: string | Date) {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function localDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function timesOverlap(s1: string, e1: string, s2: string, e2: string) {
  return s1 < e2 && e1 > s2;
}

// Returns number of rooms occupied at peak time for a list of events in a day
function maxConcurrent(dayEvents: ClassEvent[]): number {
  if (dayEvents.length === 0) return 0;
  const times = [...new Set([...dayEvents.map(e => e.startTime), ...dayEvents.map(e => e.endTime)])].sort();
  let max = 0;
  for (const t of times) {
    const count = dayEvents.filter(e => e.startTime <= t && e.endTime > t).length;
    if (count > max) max = count;
  }
  return max;
}

const EMPTY_FORM = {
  groupName: "", customGroup: "", subject: "",
  date: "", startTime: "16:00", endTime: "18:00",
  classroom: "",
  repeatWeekly: false, repeatUntil: "", notes: "",
};

export default function AdminCalendarPage() {
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [groupSubjects, setGroupSubjects] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<ClassEvent | null>(null);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<ClassEvent | null>(null);

  const monthStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}`;

  const loadEvents = useCallback(async () => {
    const res = await fetch(`/api/class-events?month=${monthStr}`);
    if (res.ok) setEvents(await res.json());
  }, [monthStr]);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  useEffect(() => {
    fetch("/api/groups")
      .then(r => r.json())
      .then((gs: Group[]) => setGroups(Array.isArray(gs) ? gs : []));
  }, []);

  // Load subjects for the selected group
  useEffect(() => {
    const name = form.groupName === "__custom__" ? form.customGroup.trim() : form.groupName;
    if (!name || form.groupName === "__custom__") { setGroupSubjects([]); return; }
    fetch(`/api/groups/subjects?name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(data => setGroupSubjects(Array.isArray(data) ? data : []));
  }, [form.groupName, form.customGroup]);

  function openForm(date?: string) {
    setForm({ ...EMPTY_FORM, date: date ?? "", groupName: groups[0]?.name ?? "" });
    setShowForm(true);
  }

  // Check how many classrooms are already used at the selected time on the selected date
  function classroomsUsedAt(date: string, startTime: string, endTime: string): string[] {
    return events
      .filter(e => toUTCKey(e.date) === date && timesOverlap(e.startTime, e.endTime, startTime, endTime) && e.classroom)
      .map(e => e.classroom as string);
  }

  const usedClassrooms = form.date && form.startTime && form.endTime
    ? classroomsUsedAt(form.date, form.startTime, form.endTime)
    : [];
  const allRoomsFull = usedClassrooms.length >= 4;
  const availableClassrooms = ["1", "2", "3", "4"].filter(c => !usedClassrooms.includes(c));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const finalGroup = form.groupName === "__custom__" ? form.customGroup.trim() : form.groupName;
    if (!finalGroup || !form.subject || !form.date) return;
    setLoading(true);
    await fetch("/api/class-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupName: finalGroup,
        subject: form.subject,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        classroom: form.classroom || null,
        repeatUntil: form.repeatWeekly && form.repeatUntil ? form.repeatUntil : undefined,
        repeatWeeks: form.repeatWeekly && !form.repeatUntil ? 30 : 1,
        notes: form.notes || null,
      }),
    });
    setLoading(false);
    setShowForm(false);
    await loadEvents();
    fetch("/api/groups").then(r => r.json()).then((gs: Group[]) => setGroups(Array.isArray(gs) ? gs : []));
  }

  async function handleDelete(ev: ClassEvent) {
    setConfirmDelete(null);
    await fetch(`/api/class-events?id=${ev.id}`, { method: "DELETE" });
    await loadEvents();
  }

  function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
  function getFirstDayOfWeek(y: number, m: number) {
    const d = new Date(y, m, 1).getDay();
    return d === 0 ? 6 : d - 1;
  }

  function getEventsForDay(date: Date) {
    const key = localDateStr(date);
    return events.filter(e => toUTCKey(e.date) === key);
  }

  const daysInMonth = getDaysInMonth(currentMonth.year, currentMonth.month);
  const firstDay = getFirstDayOfWeek(currentMonth.year, currentMonth.month);
  const today = new Date();

  const allGroupNames = [...new Set([...groups.map(g => g.name), ...events.map(e => e.groupName)])].sort();

  // ─── Form content (shared between month and week views) ───────────────────
  const formContent = (
    <Card className="border-blue-200 shadow-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Καταχώρηση Μαθήματος</CardTitle>
          <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Τμήμα *</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.groupName}
                onChange={e => setForm(f => ({ ...f, groupName: e.target.value, customGroup: "" }))}
                required={form.groupName !== "__custom__"}
              >
                <option value="">-- Επιλέξτε --</option>
                {groups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                <option value="__custom__">+ Νέο τμήμα...</option>
              </select>
              {form.groupName === "__custom__" && (
                <Input className="mt-2" value={form.customGroup}
                  onChange={e => setForm(f => ({ ...f, customGroup: e.target.value }))}
                  placeholder="π.χ. Γ ΘΕΤΙΚΗ 1" required />
              )}
            </div>

            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Μάθημα *</label>
              {groupSubjects.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {groupSubjects.map(s => (
                    <button key={s} type="button" onClick={() => setForm(f => ({ ...f, subject: s }))}
                      className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors ${
                        form.subject === s ? "bg-blue-600 text-white border-blue-600" : "bg-white text-blue-600 border-blue-200 hover:bg-blue-50"
                      }`}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                placeholder={groupSubjects.length === 0 ? "π.χ. Μαθηματικά" : "ή πληκτρολογήστε άλλο..."} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ημερομηνία *</label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ώρα Έναρξης</label>
              <Input type="text" placeholder="π.χ. 16:00" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ώρα Λήξης</label>
              <Input type="text" placeholder="π.χ. 18:00" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Αίθουσα
                {form.date && <span className="ml-2 text-xs font-normal text-gray-400">({usedClassrooms.length}/4 κατειλημμένες)</span>}
              </label>
              <select
                className={`w-full h-10 px-3 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${allRoomsFull ? "border-amber-400 bg-amber-50" : "border-gray-300"}`}
                value={form.classroom} onChange={e => setForm(f => ({ ...f, classroom: e.target.value }))}>
                <option value="">-- Επιλέξτε --</option>
                {["1", "2", "3", "4"].map(c => (
                  <option key={c} value={c} disabled={usedClassrooms.includes(c)}>
                    Αίθουσα {c}{usedClassrooms.includes(c) ? " (κατειλημμένη)" : ""}
                  </option>
                ))}
              </select>
              {allRoomsFull && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Και οι 4 αίθουσες κατειλημμένες
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Σημειώσεις</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Προαιρετικό" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.repeatWeekly}
                onChange={e => setForm(f => ({ ...f, repeatWeekly: e.target.checked, repeatUntil: "" }))}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <Repeat className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Επανάληψη κάθε εβδομάδα</span>
            </label>
            {form.repeatWeekly && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">έως</span>
                <Input type="date" value={form.repeatUntil}
                  onChange={e => setForm(f => ({ ...f, repeatUntil: e.target.value }))}
                  min={form.date || undefined}
                  className="h-8 text-sm w-40" />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>{loading ? "Αποθήκευση..." : "Αποθήκευση"}</Button>
            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Ακύρωση</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  // ─── View toggle buttons (shared) ──────────────────────────────────────────
  const viewToggle = (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
      <button
        onClick={() => setViewMode("month")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewMode === "month" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" /> Μήνας
      </button>
      <button
        onClick={() => setViewMode("week")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
          viewMode === "week" ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
        }`}
      >
        <CalendarDays className="w-3.5 h-3.5" /> Εβδομάδα
      </button>
    </div>
  );

  return (
    <div>
      {/* ── WEEKLY VIEW — full-screen fixed overlay ──────────────────────────── */}
      {viewMode === "week" && (
        <div className="fixed top-16 left-0 right-0 bottom-0 lg:left-64 z-20 flex flex-col overflow-hidden bg-gray-50">
          {/* Compact toolbar */}
          <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 shrink-0">
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-gray-900 leading-tight">Εβδομαδιαίο Πρόγραμμα</h2>
              <p className="text-[10px] text-gray-400 leading-tight">Κλικ σε τμήμα για παρουσίες</p>
            </div>
            <div className="ml-auto flex items-center gap-3 shrink-0">
              {viewToggle}
              <Button size="sm" onClick={() => openForm()}>
                <Plus className="w-4 h-4 mr-1" /> Νέο Μάθημα
              </Button>
            </div>
          </div>
          {/* WeeklyView fills all remaining height */}
          <div className="flex-1 min-h-0">
            <WeeklyView allGroupNames={allGroupNames} />
          </div>
        </div>
      )}

      {/* ── MONTHLY VIEW ─────────────────────────────────────────────────────── */}
      {viewMode === "month" && (
        <>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Ημερολόγιο Τμημάτων</h1>
              <p className="text-gray-500 mt-1">Καταγραφή μαθημάτων ανά τμήμα · 4 αίθουσες</p>
            </div>
            <div className="flex items-center gap-3">
              {viewToggle}
              <Button onClick={() => openForm()}>
                <Plus className="w-4 h-4 mr-2" /> Νέο Μάθημα
              </Button>
            </div>
          </div>

          {/* Classroom legend */}
          <div className="flex flex-wrap gap-2 mb-4">
            {["1", "2", "3", "4"].map(c => (
              <span key={c} className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
                <span className={`w-2.5 h-2.5 rounded-full ${CLASSROOM_COLORS[c]}`} />
                Αίθουσα {c}
              </span>
            ))}
            <span className="ml-2 flex items-center gap-1 text-xs text-amber-600 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" /> = &gt;4 τμήματα ταυτόχρονα
            </span>
          </div>

          {/* Monthly Calendar */}
          <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentMonth(m => { const d = new Date(m.year, m.month - 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
              className="p-2 rounded-lg hover:bg-gray-100">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <CardTitle className="text-lg">{MONTH_NAMES[currentMonth.month]} {currentMonth.year}</CardTitle>
            <button
              onClick={() => setCurrentMonth(m => { const d = new Date(m.year, m.month + 1); return { year: d.getFullYear(), month: d.getMonth() }; })}
              className="p-2 rounded-lg hover:bg-gray-100">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Group legend */}
          {allGroupNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-2">
              {allGroupNames.map(g => (
                <span key={g} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${groupColor(allGroupNames, g)}`}>
                  {g}
                </span>
              ))}
            </div>
          )}
        </CardHeader>

        <CardContent>
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
              const dayEvents = getEventsForDay(date);
              const isToday = date.toDateString() === today.toDateString();
              const dateStr = localDateStr(date);
              const peak = maxConcurrent(dayEvents);
              const overCapacity = peak > 4;

              return (
                <div key={i}
                  className={`min-h-[90px] rounded-xl p-1.5 border transition-colors ${
                    overCapacity ? "border-amber-300 bg-amber-50/30" :
                    isToday ? "border-blue-400 bg-blue-50/40" : "border-gray-100"
                  }`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? "bg-blue-600 text-white" : "text-gray-600"
                    }`}>{i + 1}</div>
                    {/* Classroom capacity dots */}
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5">
                        {["1", "2", "3", "4"].map(c => {
                          const used = dayEvents.some(e => e.classroom === c);
                          return (
                            <span key={c} className={`w-1.5 h-1.5 rounded-full ${
                              used ? CLASSROOM_COLORS[c] : "bg-gray-200"
                            }`} title={`Αίθουσα ${c}${used ? " (χρησιμοποιείται)" : ""}`} />
                          );
                        })}
                        {overCapacity && <AlertTriangle className="w-3 h-3 text-amber-500 ml-0.5" />}
                      </div>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    {dayEvents.map(ev => (
                      <div key={ev.id}
                        onClick={() => setSelectedCalendarEvent(ev)}
                        className={`group flex items-start gap-1 text-xs px-1.5 py-0.5 rounded-md border cursor-pointer hover:opacity-80 transition-opacity ${groupColor(allGroupNames, ev.groupName)}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="font-semibold truncate">{ev.groupName}</p>
                            {ev.classroom && (
                              <span className={`shrink-0 w-3.5 h-3.5 rounded-full flex items-center justify-center text-white font-bold ${CLASSROOM_COLORS[ev.classroom] ?? "bg-gray-400"}`}
                                style={{ fontSize: "8px" }}>
                                {ev.classroom}
                              </span>
                            )}
                          </div>
                          <p className="truncate opacity-80">{ev.subject} {ev.startTime}-{ev.endTime}</p>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setConfirmDelete(ev); }}
                          className="opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity shrink-0 mt-0.5"
                          title="Διαγραφή"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Quick add */}
                  <button
                    onClick={() => openForm(dateStr)}
                    className="mt-1 w-full text-xs text-gray-300 hover:text-blue-500 transition-colors text-left px-0.5"
                    title="Προσθήκη μαθήματος"
                  >
                    +
                  </button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
        </>
      )}

      {/* ── FORM MODAL — fixed overlay, z-[60] appears above weekly view ─────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60] flex items-start justify-center p-4 overflow-y-auto"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-2xl mt-8 mb-8"
              onClick={e => e.stopPropagation()}
            >
              {formContent}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ATTENDANCE MODAL — monthly calendar click-on-event ───────────────── */}
      {selectedCalendarEvent && (
        <AttendanceModal
          event={selectedCalendarEvent}
          onClose={() => setSelectedCalendarEvent(null)}
        />
      )}

      {/* ── DELETE CONFIRM MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmDelete && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4"
            onClick={() => setConfirmDelete(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-gray-900 text-lg mb-2">Διαγραφή Μαθήματος</h3>
              <p className="text-gray-600 text-sm mb-1">
                <strong>{confirmDelete.groupName}</strong> · {confirmDelete.subject}
                {confirmDelete.classroom && <span className="ml-1 text-gray-400">· Αίθ.{confirmDelete.classroom}</span>}
              </p>
              <p className="text-gray-500 text-sm mb-1">
                {new Date(confirmDelete.date).toLocaleDateString("el-GR", { weekday: "long", day: "numeric", month: "long" })}
                {" "}{confirmDelete.startTime}–{confirmDelete.endTime}
              </p>
              {confirmDelete.recurrenceId && (
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mt-3">
                  Αυτό το μάθημα είναι μέρος επαναλαμβανόμενης σειράς. Θα διαγραφεί μόνο αυτή η ημερομηνία.
                </p>
              )}
              <div className="flex gap-3 mt-5">
                <Button variant="destructive" onClick={() => handleDelete(confirmDelete)}>Διαγραφή</Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Ακύρωση</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
