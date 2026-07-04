"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Users, Key, ChevronRight, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CLASS_YEARS, CLASS_YEAR_TREE, DIRECTIONS_BY_CLASS, LYCEUM_WITH_DIRECTIONS,
  getSubjectsForStudent,
} from "@/lib/subjects";

type Student = {
  id: string;
  classYear: string;
  direction: string | null;
  schoolYear: string | null;
  tuitionBalance: number;
  user: { id: string; name: string; username: string };
  groups: { id: string; groupId: string; group: { id: string; name: string } }[];
};

type Group = { id: string; name: string };

// ── Hierarchy: bucket (Γυμνάσιο/Λύκειο/ΕΠΑΛ) → class year → τμήμα → students ──

const NO_GROUP_KEY = "__no_group__";

type GroupNode = { key: string; label: string; students: Student[] };
type YearNode = { year: string; groups: GroupNode[]; total: number };
type BucketNode = { label: string; years: YearNode[]; total: number };

function buildYearNode(year: string, students: Student[]): YearNode {
  const yearStudents = students.filter(s => s.classYear === year);
  const groupMap = new Map<string, GroupNode>();
  for (const s of yearStudents) {
    if (s.groups.length === 0) {
      if (!groupMap.has(NO_GROUP_KEY)) groupMap.set(NO_GROUP_KEY, { key: NO_GROUP_KEY, label: "Χωρίς τμήμα", students: [] });
      groupMap.get(NO_GROUP_KEY)!.students.push(s);
    } else {
      for (const sg of s.groups) {
        if (!groupMap.has(sg.groupId)) groupMap.set(sg.groupId, { key: sg.groupId, label: sg.group.name, students: [] });
        groupMap.get(sg.groupId)!.students.push(s);
      }
    }
  }
  const groups = [...groupMap.values()].sort((a, b) => {
    if (a.key === NO_GROUP_KEY) return 1;
    if (b.key === NO_GROUP_KEY) return -1;
    return a.label.localeCompare(b.label, "el");
  });
  for (const g of groups) g.students.sort((a, b) => a.user.name.localeCompare(b.user.name, "el"));
  return { year, groups, total: yearStudents.length };
}

function buildBucketTree(students: Student[]): BucketNode[] {
  return CLASS_YEAR_TREE.map(bucket => {
    const years = bucket.years.map(y => buildYearNode(y, students));
    const total = years.reduce((sum, y) => sum + y.total, 0);
    return { label: bucket.label, years, total };
  });
}

type SubjectRow = {
  subject: string;
  specialtyName: string;
  annualCost: string;
  checked: boolean;
};

function currentSchoolYear() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}

const EMPTY_FORM = {
  name: "", username: "", password: "",
  classYear: "Α' Λυκείου", direction: "",
  groupIds: [] as string[], schoolYear: currentSchoolYear(),
  firstName: "", lastName: "", phone: "", email: "",
  fatherName: "", fatherPhone: "", motherName: "", motherPhone: "",
  primaryContact: "FATHER" as "FATHER" | "MOTHER",
  parentEmail: "", address: "", comments: "", afm: "", doy: "",
};

function MultiGroupSelect({
  groups, selectedIds, onChange,
}: {
  groups: Group[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const available = groups.filter(
    g => !selectedIds.includes(g.id) &&
    g.name.toLowerCase().includes(query.toLowerCase())
  );
  const selected = groups.filter(g => selectedIds.includes(g.id));

  function add(id: string) {
    onChange([...selectedIds, id]);
    setQuery("");
    setOpen(false);
  }
  function remove(id: string) {
    onChange(selectedIds.filter(x => x !== id));
  }

  return (
    <div ref={ref} className="sm:col-span-2 lg:col-span-1">
      <label className="block text-sm font-medium text-gray-700 mb-1">Τμήμα</label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(g => (
            <span key={g.id} className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              {g.name}
              <button type="button" onClick={() => remove(g.id)} className="hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          placeholder={selected.length ? "+ Προσθήκη τμήματος..." : "Αναζήτηση τμήματος..."}
          className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {open && (
          <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
            {available.length === 0 && !query && (
              <p className="text-xs text-gray-400 px-3 py-2">Δεν υπάρχουν διαθέσιμα τμήματα.</p>
            )}
            {available.map(g => (
              <button key={g.id} type="button" onMouseDown={() => add(g.id)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 hover:text-blue-700 text-gray-700">
                {g.name}
              </button>
            ))}
            {available.length === 0 && query && (
              <p className="text-xs text-gray-400 px-3 py-2">Δεν βρέθηκαν αποτελέσματα.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showExtra, setShowExtra] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [subjectRows, setSubjectRows] = useState<SubjectRow[]>([]);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  function toggleYear(key: string) {
    setExpandedYears(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  function toggleGroup(key: string) {
    setExpandedGroups(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  async function loadStudents() {
    const res = await fetch("/api/students");
    if (res.ok) setStudents(await res.json());
  }

  async function loadGroups() {
    const res = await fetch("/api/groups");
    if (res.ok) setGroups(await res.json());
  }

  useEffect(() => { loadStudents(); loadGroups(); }, []);

  const bucketTree = useMemo(() => buildBucketTree(students), [students]);

  useEffect(() => {
    const subjects = getSubjectsForStudent(form.classYear, form.direction || null);
    setSubjectRows(subjects.map(s => ({ subject: s, specialtyName: "", annualCost: "", checked: false })));
  }, [form.classYear, form.direction]);

  const selectedRows = subjectRows.filter(r => r.checked);
  const totalAnnual = selectedRows.reduce((sum, r) => sum + parseFloat(r.annualCost || "0"), 0);

  function toggleSubject(idx: number) {
    setSubjectRows(rows => rows.map((r, i) => i === idx ? { ...r, checked: !r.checked } : r));
  }
  function setField(idx: number, field: keyof SubjectRow, value: string) {
    setSubjectRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  }

  const needsDirection = LYCEUM_WITH_DIRECTIONS.includes(form.classYear);
  const directions = DIRECTIONS_BY_CLASS[form.classYear] ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (needsDirection && !form.direction) { alert("Επιλέξτε κατεύθυνση"); return; }
    setLoading(true);

    const displayName = form.firstName && form.lastName
      ? `${form.firstName} ${form.lastName}`
      : form.name;

    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: displayName || form.username,
        username: form.username,
        password: form.password,
        classYear: form.classYear,
        direction: form.direction || null,
        tuitionBalance: totalAnnual,
        groupIds: form.groupIds,
        schoolYear: form.schoolYear || null,
        firstName: form.firstName || null,
        lastName: form.lastName || null,
        phone: form.phone || null,
        email: form.email || null,
        fatherName: form.fatherName || null,
        fatherPhone: form.fatherPhone || null,
        motherName: form.motherName || null,
        motherPhone: form.motherPhone || null,
        primaryContact: form.primaryContact || null,
        parentEmail: form.parentEmail || null,
        address: form.address || null,
        comments: form.comments || null,
        afm: form.afm || null,
        doy: form.doy || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      alert(err.error || "Σφάλμα");
      setLoading(false);
      return;
    }

    const student = await res.json();
    const profileId = student.studentProfile?.id;

    if (profileId) {
      for (const row of selectedRows) {
        const subjectName = row.subject === "Ειδικότητα"
          ? (row.specialtyName.trim() || "Ειδικότητα")
          : row.subject;
        await fetch("/api/enrollments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: profileId, subject: subjectName, costPerHour: parseFloat(row.annualCost || "0") }),
        });
      }
    }

    setLoading(false);
    setShowForm(false);
    setShowExtra(false);
    setForm(EMPTY_FORM);
    loadStudents();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Διαγραφή μαθητή "${name}";`)) return;
    await fetch(`/api/students/${id}`, { method: "DELETE" });
    loadStudents();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Μαθητές</h1>
          <p className="text-gray-500 mt-1">{students.length} εγγεγραμμένοι</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Νέος Μαθητής
          </Button>
        </div>
      </div>

      {/* Student Creation Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="mb-6 border-blue-200">
              <CardHeader><CardTitle>Εγγραφή Νέου Μαθητή</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">

                  {/* Σχολικά */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Σχολικά Στοιχεία</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Τάξη</label>
                        <select className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={form.classYear} onChange={e => setForm({ ...form, classYear: e.target.value, direction: "" })}>
                          {CLASS_YEARS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      {needsDirection && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Κατεύθυνση</label>
                          <select className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={form.direction} onChange={e => setForm({ ...form, direction: e.target.value })} required>
                            <option value="">-- Επιλέξτε --</option>
                            {directions.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                      )}
                      <MultiGroupSelect
                        groups={groups}
                        selectedIds={form.groupIds}
                        onChange={ids => setForm({ ...form, groupIds: ids })}
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Σχολική Χρονιά</label>
                        <Input value={form.schoolYear} onChange={e => setForm({ ...form, schoolYear: e.target.value })} placeholder="π.χ. 2025-2026" />
                      </div>
                    </div>
                  </div>

                  {/* Σύνδεση */}
                  <div>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Στοιχεία Σύνδεσης</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Εμφανιζόμενο Όνομα</label>
                        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Αν κενό: Όνομα + Επώνυμο" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                        <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required placeholder="π.χ. gpapadopoulos" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Κωδικός *</label>
                        <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required placeholder="Αρχικός κωδικός" />
                      </div>
                    </div>
                  </div>

                  {/* Πλήρη στοιχεία — collapsible */}
                  <div>
                    <button type="button" onClick={() => setShowExtra(!showExtra)}
                      className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-800">
                      <ChevronDown className={`w-4 h-4 transition-transform ${showExtra ? "rotate-180" : ""}`} />
                      Πλήρη Στοιχεία Μαθητή {!showExtra && "(Προαιρετικό)"}
                    </button>
                    <AnimatePresence>
                      {showExtra && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                          <div className="mt-4 space-y-4">
                            <div>
                              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Στοιχεία Μαθητή</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {[
                                  { label: "Όνομα", key: "firstName", ph: "Γεώργιος" },
                                  { label: "Επώνυμο", key: "lastName", ph: "Παπαδόπουλος" },
                                  { label: "Τηλέφωνο", key: "phone", ph: "69xxxxxxxx" },
                                  { label: "Email", key: "email", ph: "student@email.com" },
                                  { label: "Τόπος Κατοικίας", key: "address", ph: "Οδός, Πόλη" },
                                ].map(f => (
                                  <div key={f.key}>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
                                    <Input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} placeholder={f.ph} />
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Στοιχεία Πατέρα</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Ονοματεπώνυμο Πατέρα</label>
                                  <Input value={form.fatherName} onChange={e => setForm({ ...form, fatherName: e.target.value })} placeholder="Ονοματεπώνυμο" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Τηλέφωνο Πατέρα</label>
                                  <Input value={form.fatherPhone} onChange={e => setForm({ ...form, fatherPhone: e.target.value })} placeholder="69xxxxxxxx" />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer h-10">
                                  <input type="radio" name="primaryContact" checked={form.primaryContact === "FATHER"}
                                    onChange={() => setForm({ ...form, primaryContact: "FATHER" })}
                                    className="w-4 h-4 text-blue-600" />
                                  Κύριο τηλέφωνο επικοινωνίας ανάγκης
                                </label>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Στοιχεία Μητέρας</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Ονοματεπώνυμο Μητέρας</label>
                                  <Input value={form.motherName} onChange={e => setForm({ ...form, motherName: e.target.value })} placeholder="Ονοματεπώνυμο" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Τηλέφωνο Μητέρας</label>
                                  <Input value={form.motherPhone} onChange={e => setForm({ ...form, motherPhone: e.target.value })} placeholder="69xxxxxxxx" />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer h-10">
                                  <input type="radio" name="primaryContact" checked={form.primaryContact === "MOTHER"}
                                    onChange={() => setForm({ ...form, primaryContact: "MOTHER" })}
                                    className="w-4 h-4 text-blue-600" />
                                  Κύριο τηλέφωνο επικοινωνίας ανάγκης
                                </label>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Email Γονέα / Κηδεμόνα</label>
                              <Input value={form.parentEmail} onChange={e => setForm({ ...form, parentEmail: e.target.value })} placeholder="parent@email.com" className="sm:max-w-sm" />
                            </div>
                            <div>
                              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Φορολογικά Στοιχεία (για αποδείξεις)</h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">ΑΦΜ</label>
                                  <Input value={form.afm} onChange={e => setForm({ ...form, afm: e.target.value })} placeholder="π.χ. 123456789" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">ΔΟΥ</label>
                                  <Input value={form.doy} onChange={e => setForm({ ...form, doy: e.target.value })} placeholder="π.χ. Α' Αθηνών" />
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Σχόλια / Παρατηρήσεις</label>
                              <textarea value={form.comments} onChange={e => setForm({ ...form, comments: e.target.value })}
                                rows={3} placeholder="Ελεύθερη καταγραφή..."
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y" />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Μαθήματα */}
                  {subjectRows.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Μαθήματα & Ετήσιο Κόστος</h3>
                        {totalAnnual > 0 && (
                          <span className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-full">
                            Σύνολο: {totalAnnual.toFixed(2)}€/έτος
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {subjectRows.map((row, idx) => (
                          <div key={`${row.subject}-${idx}`}
                            className={`flex flex-col gap-2 p-3 rounded-xl border transition-colors ${row.checked ? "border-blue-300 bg-blue-50" : "border-gray-200"}`}>
                            <div className="flex items-center gap-3">
                              <input type="checkbox" checked={row.checked} onChange={() => toggleSubject(idx)}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
                              <span className={`text-sm font-medium flex-1 ${row.checked ? "text-blue-800" : "text-gray-600"}`}>
                                {row.subject === "Ειδικότητα" ? "Ειδικότητα (ΕΠΑΛ)" : row.subject}
                              </span>
                              {row.checked && (
                                <Input type="number" value={row.annualCost}
                                  onChange={e => setField(idx, "annualCost", e.target.value)}
                                  placeholder="€/έτος" min="0" step="10" className="w-28 h-8 text-sm" />
                              )}
                            </div>
                            {row.checked && row.subject === "Ειδικότητα" && (
                              <Input value={row.specialtyName} onChange={e => setField(idx, "specialtyName", e.target.value)}
                                placeholder="Όνομα ειδικότητας" className="text-sm h-8" />
                            )}
                          </div>
                        ))}
                      </div>
                      {totalAnnual > 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                          Το αρχικό υπόλοιπο θα οριστεί αυτόματα σε <strong className="text-gray-600">{totalAnnual.toFixed(2)}€</strong>.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button type="submit" disabled={loading}>{loading ? "Δημιουργία..." : "Δημιουργία Μαθητή"}</Button>
                    <Button type="button" variant="ghost" onClick={() => { setShowForm(false); setShowExtra(false); }}>Ακύρωση</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student hierarchy: Γυμνάσιο / Α'-Β'-Γ' Λυκείου / ΕΠΑΛ, each with τμήματα → students */}
      {students.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Δεν υπάρχουν μαθητές ακόμα.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-start">
          {bucketTree.map(bucket => (
            <div key={bucket.label} className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
              <div className="px-3 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700">{bucket.label}</h3>
                <span className="text-xs text-gray-400">{bucket.total}</span>
              </div>
              <div className="p-2 overflow-y-auto" style={{ maxHeight: "72vh" }}>
                {bucket.total === 0 ? (
                  <p className="text-xs text-gray-300 italic text-center py-8">Κανένας μαθητής</p>
                ) : bucket.years.length > 1 ? (
                  bucket.years.map(yearNode => {
                    const yKey = `${bucket.label}::${yearNode.year}`;
                    const open = expandedYears.has(yKey);
                    return (
                      <div key={yKey} className="mb-1">
                        <button onClick={() => toggleYear(yKey)}
                          className="w-full flex items-center justify-between px-2 py-2 rounded-lg hover:bg-gray-50 text-left">
                          <span className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                            {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                            {yearNode.year}
                          </span>
                          <span className="text-xs text-gray-400">{yearNode.total}</span>
                        </button>
                        <AnimatePresence>
                          {open && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }} className="overflow-hidden pl-3">
                              {yearNode.total === 0 ? (
                                <p className="text-xs text-gray-300 italic px-2 py-2">Κανένας μαθητής</p>
                              ) : (
                                yearNode.groups.map(g => (
                                  <GroupBranch key={g.key} pathKey={yKey} node={g}
                                    expandedGroups={expandedGroups} onToggleGroup={toggleGroup} onDelete={handleDelete} />
                                ))
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                ) : (
                  bucket.years[0].groups.map(g => (
                    <GroupBranch key={g.key} pathKey={`${bucket.label}::${bucket.years[0].year}`} node={g}
                      expandedGroups={expandedGroups} onToggleGroup={toggleGroup} onDelete={handleDelete} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

// ── Τμήμα branch: collapsible group header + student rows ──────────────────

function GroupBranch({
  pathKey, node, expandedGroups, onToggleGroup, onDelete,
}: {
  pathKey: string;
  node: GroupNode;
  expandedGroups: Set<string>;
  onToggleGroup: (key: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const gKey = `${pathKey}::${node.key}`;
  const open = expandedGroups.has(gKey);
  return (
    <div className="mb-0.5">
      <button onClick={() => onToggleGroup(gKey)}
        className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-gray-50 text-left">
        <span className={`text-xs font-medium flex items-center gap-1.5 truncate ${node.key === NO_GROUP_KEY ? "text-gray-400 italic" : "text-purple-700"}`}>
          {open ? <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" /> : <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />}
          <span className="truncate">{node.label}</span>
        </span>
        <span className="text-[11px] text-gray-400 shrink-0 ml-1">{node.students.length}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden pl-4">
            {node.students.map(s => (
              <div key={s.id} className="flex items-center justify-between gap-1 py-1.5 pr-1 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-[10px] shrink-0">
                    {s.user.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 truncate">{s.user.name}</p>
                    <p className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                      <Key className="w-2.5 h-2.5" />{s.user.username}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Link href={`/admin/students/${s.id}`}>
                    <Button size="icon" variant="ghost" className="h-6 w-6" title="Καρτέλα">
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                  <Button size="icon" variant="ghost" onClick={() => onDelete(s.id, s.user.name)}
                    className="h-6 w-6 text-red-400 hover:bg-red-50" title="Διαγραφή">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
