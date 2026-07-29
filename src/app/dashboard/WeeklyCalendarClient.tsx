"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { getSubjectChipColor } from "@/lib/subjectColors";

type ClassEvent = {
  id: string;
  groupName: string;
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  classroom: string | null;
};

const START_HOUR = 9;
const END_HOUR = 23;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const RANGE_MIN = TOTAL_HOURS * 60;

const HOURS_ARR = Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => i + START_HOUR);
const DAY_SHORT = ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ"];

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function utcKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function topPct(startTime: string): string {
  return `${((toMin(startTime) - START_HOUR * 60) / RANGE_MIN) * 100}%`;
}

function heightPct(startTime: string, endTime: string): string {
  const dur = Math.max(15, toMin(endTime) - toMin(startTime));
  return `${(dur / RANGE_MIN) * 100}%`;
}

// Packs overlapping events in a day into side-by-side columns.
function layoutDay(events: ClassEvent[]) {
  const sorted = [...events].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
  const columns: ClassEvent[][] = [];
  const colOf = new Map<string, number>();
  for (const ev of sorted) {
    let placed = false;
    for (let c = 0; c < columns.length; c++) {
      const last = columns[c][columns[c].length - 1];
      if (toMin(last.endTime) <= toMin(ev.startTime)) {
        columns[c].push(ev);
        colOf.set(ev.id, c);
        placed = true;
        break;
      }
    }
    if (!placed) {
      columns.push([ev]);
      colOf.set(ev.id, columns.length - 1);
    }
  }
  const totalCols = Math.max(1, columns.length);
  return sorted.map((ev) => ({ ev, col: colOf.get(ev.id) as number, totalCols }));
}

export default function WeeklyCalendarClient() {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const from = localDateStr(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    const to = localDateStr(end);
    setLoading(true);
    fetch(`/api/dashboard/class-events?from=${from}&to=${to}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [weekStart]);

  const days = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const allSubjects = [...new Set(events.map((e) => e.subject))].sort();

  function eventsForDay(date: Date): ClassEvent[] {
    return events.filter((e) => utcKey(e.date) === localDateStr(date));
  }

  function chipColor(subject: string) {
    return getSubjectChipColor(allSubjects, subject);
  }

  const navPrev = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const navNext = () => setWeekStart((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });
  const navToday = () => setWeekStart(getMonday(new Date()));

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Week navigation */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={navPrev} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <button onClick={navToday} className="text-sm font-semibold text-gray-700 hover:text-blue-600">
          {days[0].toLocaleDateString("el-GR", { day: "numeric", month: "long" })}
          {" – "}
          {days[5].toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" })}
        </button>
        <button onClick={navNext} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {events.length === 0 && !loading ? (
        <div className="text-center py-20">
          <CalendarDays className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Δεν υπάρχουν μαθήματα αυτή την εβδομάδα.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex flex-col" style={{ minWidth: 760 }}>
            {/* Day headers */}
            <div className="flex border-b border-gray-100" style={{ paddingLeft: 48 }}>
              {days.map((day, i) => {
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={i} className="flex-1 border-l border-gray-100 text-center py-2 px-1">
                    <p className={`text-xs font-bold ${isToday ? "text-blue-600" : "text-gray-700"}`}>
                      {DAY_SHORT[i]}
                    </p>
                    <p className={`text-[10px] font-medium ${isToday ? "text-blue-500" : "text-gray-400"}`}>
                      {day.toLocaleDateString("el-GR", { day: "numeric", month: "numeric" })}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Time grid */}
            <div className="flex" style={{ height: 600 }}>
              <div className="shrink-0 relative border-r border-gray-100 bg-gray-50/50" style={{ width: 48 }}>
                {HOURS_ARR.map((h) => (
                  <div
                    key={h}
                    className="absolute right-0 left-0 flex items-center justify-end pr-1.5"
                    style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%`, height: 0 }}
                  >
                    <span className="text-[9px] text-gray-400 leading-none -translate-y-2 whitespace-nowrap">
                      {String(h).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {days.map((day, di) => {
                const dayEvts = eventsForDay(day);
                const laidOut = layoutDay(dayEvts);
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div key={di} className={`flex-1 relative border-l border-gray-100 min-w-0 ${isToday ? "bg-blue-50/20" : ""}`}>
                    {HOURS_ARR.map((h) => (
                      <div
                        key={h}
                        className="absolute left-0 right-0 border-t border-gray-100 pointer-events-none"
                        style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%` }}
                      />
                    ))}
                    {laidOut.map(({ ev, col, totalCols }) => {
                      const clr = chipColor(ev.subject);
                      const width = 100 / totalCols;
                      return (
                        <div
                          key={ev.id}
                          style={{
                            position: "absolute",
                            top: topPct(ev.startTime),
                            height: heightPct(ev.startTime, ev.endTime),
                            minHeight: 24,
                            left: `${col * width}%`,
                            width: `${width}%`,
                            backgroundColor: clr.bg,
                            color: clr.text,
                            border: `1px solid ${clr.border}`,
                            borderRadius: 4,
                            padding: "2px 4px",
                            overflow: "hidden",
                            fontSize: 10,
                            fontWeight: 600,
                            lineHeight: 1.25,
                            boxSizing: "border-box",
                          }}
                          title={`${ev.subject} | ${ev.groupName} | ${ev.startTime}–${ev.endTime}`}
                        >
                          <p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.subject}</p>
                          <p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.7 }}>
                            {ev.startTime}–{ev.endTime}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
