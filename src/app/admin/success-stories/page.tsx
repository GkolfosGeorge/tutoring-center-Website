"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Trophy, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import { GREEK_INSTITUTIONS, GREEK_DEPARTMENTS } from "@/lib/universities";

// ── Types ──────────────────────────────────────────────────────────────────

type GradeRow = { subject: string; score: string };

type Story = {
  id: string;
  firstName: string;
  lastName: string;
  academicYear: number;
  direction: string;
  directionTrack: string | null;
  university: string;
  department: string | null;
  grades: string | null;
  generalScore: number | null;
  admissionPoints: number | null;
};

type StudentOption = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  user: { name: string };
};

// ── Constants ──────────────────────────────────────────────────────────────

const DIRECTIONS = ["Θετική", "Οικονομίας/Πληροφορικής", "Θεωρητική"];
const POSITIVE_TRACKS = ["Μαθηματικά", "Βιολογία"];

function academicYearOptions(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current + 3; y >= 2014; y--) years.push(y);
  return years;
}

const EMPTY_FORM = {
  firstName: "", lastName: "",
  academicYear: new Date().getFullYear().toString(),
  direction: DIRECTIONS[0], directionTrack: "",
  university: "", department: "",
  generalScore: "", admissionPoints: "",
};

function emptyGradeRow(): GradeRow {
  return { subject: "", score: "" };
}

function parseGrades(json: string | null): GradeRow[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function AdminSuccessPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [gradeRows, setGradeRows] = useState<GradeRow[]>([emptyGradeRow()]);

  const [nameSuggestOpen, setNameSuggestOpen] = useState(false);
  const nameFieldRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/success-stories");
    if (res.ok) setStories(await res.json());
  }

  async function loadStudents() {
    const res = await fetch("/api/students");
    if (res.ok) setStudents(await res.json());
  }

  useEffect(() => { load(); loadStudents(); }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (nameFieldRef.current && !nameFieldRef.current.contains(e.target as Node)) setNameSuggestOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const nameQuery = `${form.lastName} ${form.firstName}`.trim().toLowerCase();
  const nameSuggestions = useMemo(() => {
    if (!nameQuery) return [];
    return students.filter(s => {
      const full = `${s.lastName ?? ""} ${s.firstName ?? ""} ${s.user.name}`.toLowerCase();
      return full.includes(nameQuery);
    }).slice(0, 6);
  }, [nameQuery, students]);

  function pickStudent(s: StudentOption) {
    const [first, ...rest] = s.user.name.split(" ");
    setForm(f => ({
      ...f,
      firstName: s.firstName ?? first ?? "",
      lastName: s.lastName ?? rest.join(" ") ?? "",
    }));
    setNameSuggestOpen(false);
  }

  function updateGradeRow(idx: number, field: keyof GradeRow, value: string) {
    setGradeRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }
  function addGradeRow() {
    setGradeRows(rows => [...rows, emptyGradeRow()]);
  }
  function removeGradeRow(idx: number) {
    setGradeRows(rows => rows.filter((_, i) => i !== idx));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setGradeRows([emptyGradeRow()]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const cleanGrades = gradeRows
      .filter(r => r.subject.trim() && r.score.trim())
      .map(r => ({ subject: r.subject.trim(), score: parseFloat(r.score) }));

    const res = await fetch("/api/success-stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        firstName: form.firstName,
        lastName: form.lastName,
        academicYear: form.academicYear,
        direction: form.direction,
        directionTrack: form.direction === "Θετική" ? (form.directionTrack || null) : null,
        university: form.university,
        department: form.department || null,
        grades: cleanGrades,
        generalScore: form.generalScore || null,
        admissionPoints: form.admissionPoints || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Σφάλμα");
      setLoading(false);
      return;
    }

    setLoading(false);
    setShowForm(false);
    resetForm();
    load();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Διαγραφή "${name}";`)) return;
    await fetch(`/api/success-stories/${id}`, { method: "DELETE" });
    setStories(s => s.filter(x => x.id !== id));
  }

  const byYear = useMemo(() => {
    const map: Record<number, Story[]> = {};
    for (const s of stories) {
      if (!map[s.academicYear]) map[s.academicYear] = [];
      map[s.academicYear].push(s);
    }
    return map;
  }, [stories]);
  const years = useMemo(() => Object.keys(byYear).map(Number).sort((a, b) => b - a), [byYear]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Βαθμοί Πανελληνίων / Επιτυχόντες</h1>
          <p className="text-gray-500 mt-1">Καταγραφή επιτυχόντων ανά ακαδημαϊκό έτος</p>
        </div>
        <Button onClick={() => setShowForm(v => !v)}>
          <Plus className="w-4 h-4 mr-2" />
          Νέος Επιτυχών
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="mb-6 border-yellow-200">
              <CardHeader><CardTitle>Νέος Επιτυχών</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Όνομα με autocomplete από καταγεγραμμένους μαθητές */}
                  <div ref={nameFieldRef} className="relative grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Επώνυμο *</label>
                      <Input value={form.lastName}
                        onChange={e => { setForm({ ...form, lastName: e.target.value }); setNameSuggestOpen(true); }}
                        onFocus={() => setNameSuggestOpen(true)}
                        required placeholder="π.χ. Παπαδοπούλου" autoComplete="off" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Όνομα *</label>
                      <Input value={form.firstName}
                        onChange={e => { setForm({ ...form, firstName: e.target.value }); setNameSuggestOpen(true); }}
                        onFocus={() => setNameSuggestOpen(true)}
                        required placeholder="π.χ. Μαρία" autoComplete="off" />
                    </div>
                    {nameSuggestOpen && nameSuggestions.length > 0 && (
                      <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                        <p className="text-[11px] text-gray-400 px-3 pt-2">Από καταγεγραμμένους μαθητές:</p>
                        {nameSuggestions.map(s => (
                          <button key={s.id} type="button" onMouseDown={() => pickStudent(s)}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 text-gray-700">
                            {s.user.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ακαδημαϊκό έτος + Κατεύθυνση */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ακαδημαϊκό Έτος *</label>
                      <select className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.academicYear} onChange={e => setForm({ ...form, academicYear: e.target.value })}>
                        {academicYearOptions().map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Κατεύθυνση *</label>
                      <select className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value, directionTrack: "" })}>
                        {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    {form.direction === "Θετική" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Μάθημα Επιλογής *</label>
                        <select className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={form.directionTrack} onChange={e => setForm({ ...form, directionTrack: e.target.value })} required>
                          <option value="">-- Επιλέξτε --</option>
                          {POSITIVE_TRACKS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Ίδρυμα / Τμήμα */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ίδρυμα Εισαγωγής *</label>
                      <Combobox value={form.university} onChange={v => setForm({ ...form, university: v })}
                        options={GREEK_INSTITUTIONS} placeholder="π.χ. ΕΚΠΑ" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Τμήμα Εισαγωγής</label>
                      <Combobox value={form.department} onChange={v => setForm({ ...form, department: v })}
                        options={GREEK_DEPARTMENTS} placeholder="π.χ. Ιατρικής" />
                    </div>
                  </div>

                  {/* Βαθμοί Πανελληνίων */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">Βαθμοί Πανελληνίων</label>
                      <button type="button" onClick={addGradeRow}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
                        <Plus className="w-3.5 h-3.5" /> Μάθημα
                      </button>
                    </div>
                    <div className="space-y-2">
                      {gradeRows.map((row, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input value={row.subject} onChange={e => updateGradeRow(idx, "subject", e.target.value)}
                            placeholder="π.χ. Μαθηματικά" className="flex-1" />
                          <Input type="number" min="0" max="100" step="0.1" value={row.score}
                            onChange={e => updateGradeRow(idx, "score", e.target.value)}
                            placeholder="Βαθμός" className="w-28" />
                          {gradeRows.length > 1 && (
                            <button type="button" onClick={() => removeGradeRow(idx)}
                              className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Γενικός βαθμός / Μόρια */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Γενικός Βαθμός Πρόσβασης (0-20)</label>
                      <Input type="number" min="0" max="20" step="0.01" value={form.generalScore}
                        onChange={e => setForm({ ...form, generalScore: e.target.value })} placeholder="π.χ. 18.5" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Μόρια Εισαγωγής</label>
                      <Input type="number" min="0" step="1" value={form.admissionPoints}
                        onChange={e => setForm({ ...form, admissionPoints: e.target.value })} placeholder="π.χ. 18450" />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-1">
                    <Button type="submit" disabled={loading}>{loading ? "Αποθήκευση..." : "Προσθήκη"}</Button>
                    <Button type="button" variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>Ακύρωση</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {stories.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-yellow-300 mx-auto mb-3" />
              <p className="text-gray-400">Προσθέστε τους πρώτους επιτυχόντες!</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {years.map(year => (
            <div key={year}>
              <h2 className="text-lg font-bold text-gray-800 tracking-wide mb-3 border-b-2 border-yellow-400 pb-1.5 inline-block">
                ΕΠΙΤΥΧΟΝΤΕΣ {year}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {byYear[year].map(s => {
                  const grades = parseGrades(s.grades);
                  return (
                    <div key={s.id} className="flex items-start justify-between p-3 border border-gray-100 rounded-xl hover:border-yellow-200 transition-colors">
                      <div className="flex items-start gap-3 min-w-0">
                        <Trophy className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{s.lastName} {s.firstName}</p>
                          <p className="text-sm text-blue-600">
                            {s.university}{s.department && ` · ${s.department}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {s.direction}{s.directionTrack && ` (${s.directionTrack})`}
                          </p>
                          {(grades.length > 0 || s.generalScore || s.admissionPoints) && (
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {grades.map((g, i) => (
                                <span key={i} className="text-[11px] bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded text-gray-500">
                                  {g.subject}: <span className="font-semibold text-gray-700">{g.score}</span>
                                </span>
                              ))}
                              {s.generalScore != null && (
                                <span className="text-[11px] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded text-blue-600 font-medium">
                                  Γ.Β.Π. {s.generalScore}
                                </span>
                              )}
                              {s.admissionPoints != null && (
                                <span className="text-[11px] bg-green-50 border border-green-100 px-1.5 py-0.5 rounded text-green-700 font-medium">
                                  {s.admissionPoints} μόρια
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id, `${s.lastName} ${s.firstName}`)}
                        className="text-red-500 hover:bg-red-50 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
