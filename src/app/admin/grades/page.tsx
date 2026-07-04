"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";

type Student = { id: string; user: { name: string }; classYear: string };
type Grade = {
  id: string;
  subject: string;
  examType: string;
  score: number;
  maxScore: number;
  date: string;
  notes: string | null;
  student: { user: { name: string } };
};

export default function AdminGradesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ studentId: "", subject: "", examType: "Διαγώνισμα", score: "", maxScore: "20", date: new Date().toISOString().split("T")[0], notes: "" });

  useEffect(() => {
    fetch("/api/students").then(r => r.json()).then(setStudents);
  }, []);

  useEffect(() => {
    const url = selectedStudent ? `/api/grades?studentId=${selectedStudent}` : "/api/grades";
    fetch(url).then(r => r.json()).then(setGrades);
  }, [selectedStudent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentId) { alert("Επιλέξτε μαθητή"); return; }
    setLoading(true);
    await fetch("/api/grades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    setShowForm(false);
    setForm(f => ({ ...f, score: "", notes: "" }));
    const url = selectedStudent ? `/api/grades?studentId=${selectedStudent}` : "/api/grades";
    fetch(url).then(r => r.json()).then(setGrades);
  }

  async function handleDelete(id: string) {
    if (!confirm("Διαγραφή βαθμού;")) return;
    await fetch(`/api/grades?id=${id}`, { method: "DELETE" });
    setGrades(g => g.filter(x => x.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Βαθμολογίες</h1>
          <p className="text-gray-500 mt-1">Καταχώρηση και διαχείριση βαθμών</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Νέος Βαθμός
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 border-blue-200">
            <CardHeader><CardTitle>Καταχώρηση Βαθμού</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Μαθητής</label>
                  <select
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.studentId}
                    onChange={e => setForm({...form, studentId: e.target.value})}
                    required
                  >
                    <option value="">-- Επιλέξτε μαθητή --</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.user.name} ({s.classYear})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Μάθημα</label>
                  <Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required placeholder="π.χ. Μαθηματικά" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Τύπος</label>
                  <select
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.examType}
                    onChange={e => setForm({...form, examType: e.target.value})}
                  >
                    {["Διαγώνισμα", "Τεστ", "Εργασία", "Προφορικός", "Πανελλήνιες"].map(t => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Βαθμός</label>
                  <Input type="number" value={form.score} onChange={e => setForm({...form, score: e.target.value})} required min="0" max={form.maxScore} step="0.5" placeholder="π.χ. 16" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Βαθμολογία από</label>
                  <Input type="number" value={form.maxScore} onChange={e => setForm({...form, maxScore: e.target.value})} required min="1" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ημερομηνία</label>
                  <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Σχόλια (προαιρετικό)</label>
                  <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="π.χ. Καλή πρόοδος στην άλγεβρα" />
                </div>
                <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
                  <Button type="submit" disabled={loading}>{loading ? "Αποθήκευση..." : "Καταχώρηση"}</Button>
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Ακύρωση</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card className="mb-4">
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 shrink-0">Φίλτρο μαθητή:</label>
            <select
              className="h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedStudent}
              onChange={e => setSelectedStudent(e.target.value)}
            >
              <option value="">Όλοι οι μαθητές</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.user.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Βαθμολόγιο ({grades.length})</CardTitle></CardHeader>
        <CardContent>
          {grades.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Δεν υπάρχουν βαθμολογίες.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {grades.map((g) => (
                <div key={g.id} className="flex items-center justify-between py-2.5 px-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{g.student.user.name}</p>
                      <span className="text-gray-300">·</span>
                      <p className="text-gray-600">{g.subject}</p>
                    </div>
                    <p className="text-xs text-gray-400">{g.examType} · {formatDate(g.date)}</p>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <span className={`font-bold text-lg ${
                      g.score / g.maxScore >= 0.7 ? "text-green-600" :
                      g.score / g.maxScore >= 0.5 ? "text-yellow-600" : "text-red-600"
                    }`}>
                      {g.score}/{g.maxScore}
                    </span>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(g.id)} className="text-red-500 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
