"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Edit, UserSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Teacher = { id: string; name: string; subject: string; bio: string | null; order: number };

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", bio: "" });

  async function load() {
    const res = await fetch("/api/teachers");
    if (res.ok) setTeachers(await res.json());
  }

  useEffect(() => { load(); }, []);

  function startEdit(t: Teacher) {
    setEditItem(t);
    setForm({ name: t.name, subject: t.subject, bio: t.bio ?? "" });
    setShowForm(true);
  }

  function resetForm() {
    setEditItem(null);
    setForm({ name: "", subject: "", bio: "" });
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const method = editItem ? "PUT" : "POST";
    const url = editItem ? `/api/teachers/${editItem.id}` : "/api/teachers";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    resetForm();
    load();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Διαγραφή καθηγητή "${name}";`)) return;
    await fetch(`/api/teachers/${id}`, { method: "DELETE" });
    setTeachers(t => t.filter(x => x.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Καθηγητές</h1>
          <p className="text-gray-500 mt-1">Διαχείριση προφίλ καθηγητών</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4 mr-2" />
          Νέος Καθηγητής
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 border-teal-200">
            <CardHeader><CardTitle>{editItem ? "Επεξεργασία" : "Νέος Καθηγητής"}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ονοματεπώνυμο</label>
                  <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="π.χ. Αντώνης Παπαδόπουλος" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Μάθημα / Ειδικότητα</label>
                  <Input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} required placeholder="π.χ. Μαθηματικά" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Σύντομη Βιογραφία</label>
                  <Input value={form.bio} onChange={e => setForm({...form, bio: e.target.value})} placeholder="Προαιρετικό" />
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={loading}>{loading ? "Αποθήκευση..." : (editItem ? "Ενημέρωση" : "Δημιουργία")}</Button>
                  <Button type="button" variant="ghost" onClick={resetForm}>Ακύρωση</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card>
        <CardContent className="pt-5">
          {teachers.length === 0 ? (
            <div className="text-center py-12">
              <UserSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Δεν υπάρχουν καθηγητές ακόμα.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {teachers.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2.5 px-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{t.name}</p>
                    <p className="text-sm text-blue-600">{t.subject}</p>
                    {t.bio && <p className="text-xs text-gray-400 mt-0.5">{t.bio}</p>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(t)}><Edit className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id, t.name)} className="text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></Button>
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
