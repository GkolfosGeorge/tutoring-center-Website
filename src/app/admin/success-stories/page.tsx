"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Story = { id: string; name: string; year: number; university: string; department: string | null };

export default function AdminSuccessPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", year: new Date().getFullYear().toString(), university: "", department: "" });

  async function load() {
    const res = await fetch("/api/success-stories");
    if (res.ok) setStories(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/success-stories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    setShowForm(false);
    setForm(f => ({ ...f, name: "", university: "", department: "" }));
    load();
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Διαγραφή "${name}";`)) return;
    await fetch(`/api/success-stories/${id}`, { method: "DELETE" });
    setStories(s => s.filter(x => x.id !== id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Επιτυχόντες</h1>
          <p className="text-gray-500 mt-1">Προσθήκη παλαιών επιτυχόντων</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Νέος Επιτυχών
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 border-yellow-200">
            <CardHeader><CardTitle>Νέος Επιτυχών</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ονοματεπώνυμο</label>
                  <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="π.χ. Μαρία Παπαδοπούλου" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Έτος</label>
                  <Input type="number" value={form.year} onChange={e => setForm({...form, year: e.target.value})} required min="2000" max="2030" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Σχολή / Ίδρυμα</label>
                  <Input value={form.university} onChange={e => setForm({...form, university: e.target.value})} required placeholder="π.χ. Ιατρική ΕΚΠΑ" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Τμήμα (προαιρετικό)</label>
                  <Input value={form.department} onChange={e => setForm({...form, department: e.target.value})} placeholder="π.χ. Ιατρικής" />
                </div>
                <div className="sm:col-span-2 flex gap-3">
                  <Button type="submit" disabled={loading}>{loading ? "Αποθήκευση..." : "Προσθήκη"}</Button>
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Ακύρωση</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <Card>
        <CardContent className="pt-5">
          {stories.length === 0 ? (
            <div className="text-center py-12">
              <Trophy className="w-12 h-12 text-yellow-300 mx-auto mb-3" />
              <p className="text-gray-400">Προσθέστε τους πρώτους επιτυχόντες!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {stories.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:border-yellow-200 transition-colors">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-yellow-500 shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">{s.name}</p>
                      <p className="text-sm text-blue-600">{s.university}</p>
                      <p className="text-xs text-gray-400">{s.year}{s.department && ` · ${s.department}`}</p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id, s.name)} className="text-red-500 hover:bg-red-50 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
