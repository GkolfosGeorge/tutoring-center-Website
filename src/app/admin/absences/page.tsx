"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

type Student = { id: string; user: { name: string }; classYear: string };
type Absence = {
  id: string;
  subject: string;
  date: string;
  justified: boolean;
  notes: string | null;
  student: { user: { name: string } };
};

export default function AdminAbsencesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ studentId: "", subject: "", date: new Date().toISOString().split("T")[0], justified: false, notes: "" });

  useEffect(() => {
    fetch("/api/students").then(r => r.json()).then(setStudents);
  }, []);

  function loadAbsences() {
    const url = selectedStudent ? `/api/absences?studentId=${selectedStudent}` : "/api/absences";
    fetch(url).then(r => r.json()).then(setAbsences);
  }

  useEffect(() => { loadAbsences(); }, [selectedStudent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.studentId) { alert("Επιλέξτε μαθητή"); return; }
    setLoading(true);
    await fetch("/api/absences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    setShowForm(false);
    setForm(f => ({ ...f, notes: "" }));
    loadAbsences();
  }

  async function handleDelete(id: string) {
    if (!confirm("Διαγραφή απουσίας;")) return;
    await fetch(`/api/absences?id=${id}`, { method: "DELETE" });
    setAbsences(a => a.filter(x => x.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Απουσίες</h1>
          <p className="text-gray-500 mt-1">Καταχώρηση παρουσιολογίου</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Νέα Απουσία
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 border-orange-200">
            <CardHeader><CardTitle>Καταχώρηση Απουσίας</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
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
                  <Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required placeholder="π.χ. Φυσική" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ημερομηνία</label>
                  <Input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="justified"
                    checked={form.justified}
                    onChange={e => setForm({...form, justified: e.target.checked})}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="justified" className="text-sm font-medium text-gray-700">Δικαιολογημένη</label>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Σχόλια</label>
                  <Input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Προαιρετικό" />
                </div>
                <div className="sm:col-span-2 flex gap-3">
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
            <label className="text-sm font-medium text-gray-700 shrink-0">Φίλτρο:</label>
            <select
              className="h-9 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedStudent}
              onChange={e => setSelectedStudent(e.target.value)}
            >
              <option value="">Όλοι</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.user.name}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Καταγεγραμμένες Απουσίες ({absences.length})</CardTitle></CardHeader>
        <CardContent>
          {absences.length === 0 ? (
            <div className="text-center py-12">
              <UserX className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Δεν υπάρχουν απουσίες.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {absences.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2.5 px-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{a.student.user.name} — <span className="text-gray-600">{a.subject}</span></p>
                    <p className="text-xs text-gray-400">{formatDate(a.date)}{a.notes && ` · ${a.notes}`}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.justified ? "success" : "destructive"}>
                      {a.justified ? "Δικαιολ." : "Αδικαιολ."}
                    </Badge>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(a.id)} className="text-red-500 hover:bg-red-50">
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
