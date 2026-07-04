"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, Trash2, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { CLASS_YEARS } from "@/lib/subjects";

type CourseFile = {
  id: string;
  title: string;
  subject: string;
  classYear: string | null;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminFilesPage() {
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ title: "", subject: "", classYear: "" });

  async function load() {
    const res = await fetch("/api/files");
    if (res.ok) setFiles(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { alert("Επιλέξτε αρχείο"); return; }
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", form.title);
    fd.append("subject", form.subject);
    if (form.classYear) fd.append("classYear", form.classYear);
    const res = await fetch("/api/files", { method: "POST", body: fd });
    setLoading(false);
    if (res.ok) {
      setShowForm(false);
      setFile(null);
      setForm({ title: "", subject: "", classYear: "" });
      load();
    } else {
      alert("Σφάλμα κατά το upload.");
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Διαγραφή "${title}";`)) return;
    await fetch(`/api/files?id=${id}`, { method: "DELETE" });
    setFiles(f => f.filter(x => x.id !== id));
  }

  // Group files by subject for display
  const subjects = [...new Set(files.map(f => f.subject))].sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Αρχεία</h1>
          <p className="text-gray-500 mt-1">Ανέβασμα εκπαιδευτικού υλικού</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Upload className="w-4 h-4 mr-2" />
          Ανέβασμα Αρχείου
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 border-purple-200">
            <CardHeader><CardTitle>Ανέβασμα Αρχείου</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Αρχείο (PDF)</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={e => setFile(e.target.files?.[0] ?? null)}
                      required
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Τίτλος *</label>
                    <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="π.χ. Διαγώνισμα Άλγεβρας - Ιαν. 2025" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Μάθημα *</label>
                    <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required placeholder="π.χ. Μαθηματικά" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Τάξη</label>
                    <select
                      className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={form.classYear}
                      onChange={e => setForm({ ...form, classYear: e.target.value })}
                    >
                      <option value="">Όλες οι τάξεις</option>
                      {CLASS_YEARS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  Το αρχείο θα εμφανίζεται μόνο σε μαθητές που παρακολουθούν το επιλεγμένο μάθημα
                  {form.classYear ? ` και ανήκουν στην τάξη "${form.classYear}"` : " (ανεξαρτήτως τάξης)"}.
                </p>

                <div className="flex gap-3">
                  <Button type="submit" disabled={loading}>{loading ? "Ανέβασμα..." : "Αποθήκευση"}</Button>
                  <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Ακύρωση</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {files.length === 0 ? (
        <Card>
          <CardContent className="pt-5">
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Δεν υπάρχουν αρχεία ακόμα.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subjects.map(subject => {
            const subjectFiles = files.filter(f => f.subject === subject);
            return (
              <Card key={subject}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    {subject}
                    <span className="text-xs font-normal text-gray-400">({subjectFiles.length} αρχεία)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {subjectFiles.map((f) => (
                      <div key={f.id} className="flex items-center justify-between py-2.5 px-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-red-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{f.title}</p>
                            <p className="text-xs text-gray-400">
                              {f.classYear ? f.classYear : "Όλες οι τάξεις"}
                              {" · "}{formatSize(f.fileSize)}
                              {" · "}{formatDate(f.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <a href={`/uploads/${f.fileName}`} target="_blank" className="text-sm text-blue-600 hover:underline">
                            Προβολή
                          </a>
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(f.id, f.title)} className="text-red-500 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
