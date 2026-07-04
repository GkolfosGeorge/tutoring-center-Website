"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Check, AlertCircle, Users } from "lucide-react";

type AttendanceItem = {
  studentId: string;
  studentName: string;
  enrollmentId: string;
  held: boolean | null;
  absent: boolean;
};

type ClassEventLike = {
  groupName: string;
  subject: string;
  date: string; // ISO string (UTC)
  startTime: string;
  endTime: string;
  classroom: string | null;
};

const CLASSROOM_HEX: Record<string, string> = {
  "1": "#0ea5e9",
  "2": "#8b5cf6",
  "3": "#f59e0b",
  "4": "#f43f5e",
};

function utcKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export default function AttendanceModal({
  event,
  onClose,
}: {
  event: ClassEventLike;
  onClose: () => void;
}) {
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const date = utcKey(event.date);
    const res = await fetch(
      `/api/class-events/attendance?groupName=${encodeURIComponent(event.groupName)}&subject=${encodeURIComponent(event.subject)}&date=${date}`
    );
    const data = res.ok ? await res.json() : [];
    setAttendance(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [event.groupName, event.subject, event.date]);

  useEffect(() => {
    load();
  }, [load]);

  async function setHeldAll(held: boolean) {
    if (attendance.length === 0) return;
    const date = new Date(event.date).toISOString();
    await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessions: attendance.map(a => ({ enrollmentId: a.enrollmentId, date, held })),
      }),
    });
    load();
  }

  async function toggleAbsence(item: AttendanceItem) {
    await fetch("/api/absences/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentId: item.studentId,
        subject: event.subject,
        date: new Date(event.date).toISOString(),
      }),
    });
    load();
  }

  const isHeld = attendance.length > 0 && attendance.some(a => a.held === true);
  const isCancelled = attendance.length > 0 && attendance.every(a => a.held === false);

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[80] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col"
        style={{ maxHeight: "85vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-base font-bold text-gray-900">{event.groupName}</span>
                <span className="text-sm text-blue-600 font-medium">{event.subject}</span>
                {event.classroom && (
                  <span
                    className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: CLASSROOM_HEX[event.classroom] ?? "#94a3b8" }}
                  >
                    Αίθ.{event.classroom}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(event.date).toLocaleDateString("el-GR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
                {" · "}
                {event.startTime}–{event.endTime}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 ml-2 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Held / Cancelled bulk toggle */}
          {!loading && attendance.length > 0 && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setHeldAll(true)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                  isHeld
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-500 hover:border-green-300"
                }`}
              >
                <Check className="w-3.5 h-3.5" /> Το μάθημα έγινε
              </button>
              <button
                onClick={() => setHeldAll(false)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                  isCancelled
                    ? "border-gray-500 bg-gray-50 text-gray-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-400"
                }`}
              >
                <X className="w-3.5 h-3.5" /> Ακυρώθηκε
              </button>
            </div>
          )}
        </div>

        {/* Student list */}
        <div className="overflow-y-auto flex-1 px-5 py-3">
          {loading ? (
            <div className="text-center py-8 text-sm text-gray-400">Φόρτωση μαθητών...</div>
          ) : attendance.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Δεν βρέθηκαν μαθητές σε αυτό το τμήμα</p>
            </div>
          ) : (
            <div className="space-y-1">
              {attendance.map(item => {
                const isAbsent = item.held === true && item.absent;
                const isCancelledStudent = item.held === false;
                const isPending = item.held === null;

                let pill: React.ReactNode;
                if (isCancelledStudent) {
                  pill = (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 font-medium">
                      Ακυρώθηκε
                    </span>
                  );
                } else if (isPending) {
                  pill = null;
                } else {
                  pill = (
                    <button
                      onClick={() => toggleAbsence(item)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold transition-colors ${
                        isAbsent
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-green-100 text-green-700 hover:bg-green-200"
                      }`}
                    >
                      {isAbsent ? (
                        <><AlertCircle className="w-2.5 h-2.5 inline mr-0.5" />ΑΠΩΝ</>
                      ) : (
                        <><Check className="w-2.5 h-2.5 inline mr-0.5" />ΠΑΡΩΝ</>
                      )}
                    </button>
                  );
                }

                return (
                  <div
                    key={item.studentId}
                    className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0"
                  >
                    <span
                      className={`text-sm font-medium ${
                        isCancelledStudent ? "text-gray-400 line-through" : "text-gray-800"
                      }`}
                    >
                      {item.studentName}
                    </span>
                    {pill}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!loading && attendance.length > 0 && (
          <p className="text-center text-[10px] text-gray-300 py-2 shrink-0 border-t border-gray-50">
            {attendance.filter(a => a.held === true && !a.absent).length} παρόντες ·{" "}
            {attendance.filter(a => a.absent).length} απόντες
          </p>
        )}
      </div>
    </div>
  );
}
