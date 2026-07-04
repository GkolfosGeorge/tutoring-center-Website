"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AttendanceModal from "./AttendanceModal";

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

const CHIP_COLORS: { bg: string; text: string; border: string }[] = [
  { bg: "#dbeafe", text: "#1e40af", border: "#bfdbfe" },
  { bg: "#ede9fe", text: "#5b21b6", border: "#ddd6fe" },
  { bg: "#d1fae5", text: "#065f46", border: "#a7f3d0" },
  { bg: "#ffedd5", text: "#9a3412", border: "#fed7aa" },
  { bg: "#fce7f3", text: "#9d174d", border: "#fbcfe8" },
  { bg: "#ccfbf1", text: "#134e4a", border: "#99f6e4" },
  { bg: "#e0e7ff", text: "#3730a3", border: "#c7d2fe" },
  { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
];

const CLASSROOM_HEX: Record<string, string> = {
  "1": "#0ea5e9",
  "2": "#8b5cf6",
  "3": "#f59e0b",
  "4": "#f43f5e",
};

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

export default function WeeklyView({ allGroupNames }: { allGroupNames: string[] }) {
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [events, setEvents] = useState<ClassEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ClassEvent | null>(null);

  useEffect(() => {
    const from = localDateStr(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 7);
    const to = localDateStr(end);
    fetch(`/api/class-events?from=${from}&to=${to}`)
      .then(r => (r.ok ? r.json() : []))
      .then(data => setEvents(Array.isArray(data) ? data : []));
  }, [weekStart]);

  const days = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  function eventsForDay(date: Date): ClassEvent[] {
    return events.filter(e => utcKey(e.date) === localDateStr(date));
  }

  function chipColor(g: string) {
    const idx = allGroupNames.indexOf(g);
    return CHIP_COLORS[Math.max(0, idx) % CHIP_COLORS.length];
  }

  const navPrev = () =>
    setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const navNext = () =>
    setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      {/* Week navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 shrink-0 bg-white">
        <button onClick={navPrev} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {days[0].toLocaleDateString("el-GR", { day: "numeric", month: "long" })}
          {" – "}
          {days[5].toLocaleDateString("el-GR", { day: "numeric", month: "long", year: "numeric" })}
        </span>
        <button onClick={navNext} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 min-h-0 overflow-x-auto">
        <div className="flex flex-col h-full" style={{ minWidth: 760 }}>
          {/* Day headers */}
          <div className="flex border-b border-gray-100 shrink-0 bg-white" style={{ paddingLeft: 48 }}>
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
                  <div className="flex gap-px mt-1 px-1">
                    {[1, 2, 3, 4].map(c => (
                      <div
                        key={c}
                        className="flex-1 rounded-sm py-0.5 text-center leading-none"
                        style={{
                          backgroundColor: CLASSROOM_HEX[String(c)] + "20",
                          fontSize: 7,
                          color: CLASSROOM_HEX[String(c)],
                          fontWeight: 700,
                        }}
                      >
                        {c}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="flex flex-1 min-h-0">
            {/* Time axis */}
            <div
              className="shrink-0 relative border-r border-gray-100 bg-gray-50/50"
              style={{ width: 48 }}
            >
              {HOURS_ARR.map(h => (
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

            {/* Day columns */}
            {days.map((day, di) => {
              const dayEvts = eventsForDay(day);
              const isToday = day.toDateString() === new Date().toDateString();
              return (
                <div
                  key={di}
                  className={`flex-1 relative border-l border-gray-100 min-w-0 ${isToday ? "bg-blue-50/20" : ""}`}
                >
                  {HOURS_ARR.map(h => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-gray-100 pointer-events-none"
                      style={{ top: `${((h - START_HOUR) / TOTAL_HOURS) * 100}%` }}
                    />
                  ))}
                  {HOURS_ARR.slice(0, -1).map(h => (
                    <div
                      key={`hh${h}`}
                      className="absolute left-0 right-0 border-t pointer-events-none"
                      style={{
                        top: `${((h - START_HOUR + 0.5) / TOTAL_HOURS) * 100}%`,
                        borderColor: "#f9fafb",
                      }}
                    />
                  ))}
                  {[1, 2, 3].map(c => (
                    <div
                      key={c}
                      className="absolute top-0 bottom-0 border-l pointer-events-none"
                      style={{ left: `${c * 25}%`, borderColor: "#f0f0f0" }}
                    />
                  ))}
                  {dayEvts.map(ev => {
                    const classroomIdx = ev.classroom ? parseInt(ev.classroom) - 1 : 0;
                    const borderClr = CLASSROOM_HEX[ev.classroom ?? "1"] ?? "#94a3b8";
                    const clr = chipColor(ev.groupName);
                    const isSelected = selectedEvent?.id === ev.id;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSelectedEvent(isSelected ? null : ev)}
                        style={{
                          position: "absolute",
                          top: topPct(ev.startTime),
                          height: heightPct(ev.startTime, ev.endTime),
                          minHeight: 18,
                          left: `${classroomIdx * 25}%`,
                          width: "25%",
                          zIndex: isSelected ? 20 : 10,
                          backgroundColor: clr.bg,
                          color: clr.text,
                          borderLeft: `3px solid ${borderClr}`,
                          borderTop: `1px solid ${clr.border}`,
                          borderRight: `1px solid ${clr.border}`,
                          borderBottom: `1px solid ${clr.border}`,
                          borderRadius: "0 4px 4px 0",
                          padding: "2px 3px",
                          overflow: "hidden",
                          fontSize: 9,
                          fontWeight: 600,
                          lineHeight: "1.2",
                          textAlign: "left",
                          boxSizing: "border-box",
                          cursor: "pointer",
                          outline: isSelected ? `2px solid ${borderClr}` : "none",
                          outlineOffset: 1,
                          transition: "outline 0.1s",
                        }}
                        title={`${ev.groupName} | ${ev.subject} | ${ev.startTime}–${ev.endTime}${ev.classroom ? ` | Αίθ.${ev.classroom}` : ""}`}
                      >
                        <p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ev.groupName}
                        </p>
                        <p style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: 0.75 }}>
                          {ev.subject}
                        </p>
                        <p style={{ opacity: 0.55, whiteSpace: "nowrap" }}>
                          {ev.startTime}–{ev.endTime}
                        </p>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {selectedEvent && (
        <AttendanceModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}
