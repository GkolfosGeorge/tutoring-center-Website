"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Upload, Trash2, FileText, BookOpen, Folder, FolderOpen, ChevronRight, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import { FILE_FOLDER_GROUPS, getSubjectsForFileFolder } from "@/lib/subjects";
import { FILE_CATEGORIES } from "@/lib/fileCategories";
import { getSubjectChipColor } from "@/lib/subjectColors";

type CourseFile = {
  id: string;
  title: string;
  subject: string;
  category: string | null;
  classYear: string | null;
  isFlipbook: boolean;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
};

const UNSORTED_LABEL = "Γενικά / Χωρίς τάξη";
const FOLDER_LABELS = FILE_FOLDER_GROUPS.map((g) => g.label);

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function folderOf(f: CourseFile): string {
  if (!f.classYear) return UNSORTED_LABEL;
  return FOLDER_LABELS.includes(f.classYear) ? f.classYear : UNSORTED_LABEL;
}

export default function AdminFilesPage() {
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({ classYear: "", subject: "", category: "", title: "", isFlipbook: false });

  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/files");
    if (res.ok) setFiles(await res.json());
  }

  useEffect(() => { load(); }, []);

  const formSubjects = form.classYear ? getSubjectsForFileFolder(form.classYear) : [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { alert("Επιλέξτε αρχείο"); return; }
    if (!form.classYear) { alert("Επιλέξτε τάξη"); return; }
    if (!form.subject) { alert("Επιλέξτε μάθημα"); return; }
    if (!form.category) { alert("Επιλέξτε είδος"); return; }
    if (form.isFlipbook && !file.name.toLowerCase().endsWith(".pdf")) {
      alert("Το Flip Book υποστηρίζει μόνο αρχεία PDF"); return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", form.title);
    fd.append("subject", form.subject);
    fd.append("category", form.category);
    fd.append("classYear", form.classYear);
    fd.append("isFlipbook", String(form.isFlipbook));
    const res = await fetch("/api/files", { method: "POST", body: fd });
    setLoading(false);
    if (res.ok) {
      setShowForm(false);
      setFile(null);
      setForm({ classYear: "", subject: "", category: "", title: "", isFlipbook: false });
      load();
    } else {
      alert("Σφάλμα κατά το upload.");
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Διαγραφή "${title}";`)) return;
    await fetch(`/api/files?id=${id}`, { method: "DELETE" });
    setFiles((f) => f.filter((x) => x.id !== id));
  }

  const byFolder = useMemo(() => {
    const map: Record<string, CourseFile[]> = {};
    for (const f of files) (map[folderOf(f)] ??= []).push(f);
    return map;
  }, [files]);

  const folderLabels = [...FOLDER_LABELS, ...(byFolder[UNSORTED_LABEL] ? [UNSORTED_LABEL] : [])];

  function subjectsForFolder(folderLabel: string): string[] {
    if (folderLabel === UNSORTED_LABEL) {
      return Array.from(new Set((byFolder[folderLabel] ?? []).map((f) => f.subject))).sort();
    }
    return getSubjectsForFileFolder(folderLabel);
  }

  const uploadForm = showForm && (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="mb-6 border-purple-200">
        <CardHeader><CardTitle>Ανέβασμα Αρχείου</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">1. Τάξη *</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.classYear}
                onChange={(e) => setForm({ ...form, classYear: e.target.value, subject: "" })}
                required
              >
                <option value="">-- Επιλέξτε τάξη --</option>
                {FOLDER_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">2. Μάθημα *</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                disabled={!form.classYear}
                required
              >
                <option value="">{form.classYear ? "-- Επιλέξτε μάθημα --" : "Επιλέξτε πρώτα τάξη"}</option>
                {formSubjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">3. Είδος *</label>
              <select
                className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              >
                <option value="">-- Επιλέξτε είδος --</option>
                {FILE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">4. Τίτλος *</label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                placeholder="Ο τίτλος που θα βλέπεις εσύ και οι μαθητές"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">5. Αρχείο *</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
              />
            </div>

            <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              form.isFlipbook ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600 hover:border-blue-300"
            }`}>
              <input
                type="checkbox"
                className="rounded text-blue-600"
                checked={form.isFlipbook}
                onChange={(e) => setForm({ ...form, isFlipbook: e.target.checked })}
              />
              <BookOpen className="w-4 h-4" />
              Flip Book — ανάγνωση μόνο μέσα στο site, χωρίς δυνατότητα λήψης (μόνο PDF)
            </label>

            <div className="flex gap-3">
              <Button type="submit" disabled={loading}>{loading ? "Ανέβασμα..." : "Αποθήκευση"}</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Ακύρωση</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );

  const header = (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Αρχεία</h1>
        <p className="text-gray-500 mt-1">Ανέβασμα εκπαιδευτικού υλικού</p>
      </div>
      <Button onClick={() => setShowForm((v) => !v)}>
        <Upload className="w-4 h-4 mr-2" />
        Ανέβασμα Αρχείου
      </Button>
    </div>
  );

  // ── Level 3: files inside classYear + subject + category ──
  if (openFolder && openSubject && openCategory) {
    const clr = getSubjectChipColor(subjectsForFolder(openFolder), openSubject);
    const list = files.filter((f) => folderOf(f) === openFolder && f.subject === openSubject && f.category === openCategory);
    return (
      <div>
        {header}
        {uploadForm}
        <Breadcrumb
          folder={openFolder} subject={openSubject} category={openCategory} clr={clr}
          onRoot={() => { setOpenFolder(null); setOpenSubject(null); setOpenCategory(null); }}
          onFolder={() => { setOpenSubject(null); setOpenCategory(null); }}
          onSubject={() => setOpenCategory(null)}
        />
        {list.length === 0 ? (
          <p className="text-gray-400 text-center py-16">Δεν υπάρχουν αρχεία σε αυτόν τον φάκελο ακόμα.</p>
        ) : (
          <div className="space-y-1">
            {list.map((f) => (
              <div key={f.id} className="flex items-center justify-between py-2.5 px-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${f.isFlipbook ? "bg-blue-50" : "bg-red-50"}`}>
                    {f.isFlipbook ? <BookOpen className="w-4 h-4 text-blue-500" /> : <FileText className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{f.title}</p>
                    <p className="text-xs text-gray-400">
                      {f.isFlipbook && <span className="inline-block bg-blue-50 text-blue-600 rounded px-1.5 py-0.5 mr-1.5">Flip Book</span>}
                      {formatSize(f.fileSize)} · {formatDate(f.uploadedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {!f.isFlipbook && (
                    <a href={`/uploads/${f.fileName}`} target="_blank" className="text-sm text-blue-600 hover:underline">
                      Προβολή
                    </a>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(f.id, f.title)} className="text-red-500 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Level 2: category subfolders inside classYear + subject ──
  if (openFolder && openSubject) {
    const clr = getSubjectChipColor(subjectsForFolder(openFolder), openSubject);
    return (
      <div>
        {header}
        {uploadForm}
        <Breadcrumb
          folder={openFolder} subject={openSubject} clr={clr}
          onRoot={() => { setOpenFolder(null); setOpenSubject(null); }}
          onFolder={() => setOpenSubject(null)}
        />
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {FILE_CATEGORIES.map((cat) => {
            const count = files.filter((f) => folderOf(f) === openFolder && f.subject === openSubject && f.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setOpenCategory(cat)}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all text-left"
              >
                <Folder className="w-8 h-8 text-amber-400 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{cat}</p>
                  <p className="text-xs text-gray-400">{count} αρχεία</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Level 1: subject subfolders inside a classYear folder ──
  if (openFolder) {
    const subjects = subjectsForFolder(openFolder);
    return (
      <div>
        {header}
        {uploadForm}
        <Breadcrumb folder={openFolder} onRoot={() => setOpenFolder(null)} />
        {subjects.length === 0 ? (
          <p className="text-gray-400 text-center py-16">Δεν υπάρχουν μαθήματα ορισμένα για αυτή την τάξη.</p>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {subjects.map((subject) => {
              const clr = getSubjectChipColor(subjects, subject);
              const count = files.filter((f) => folderOf(f) === openFolder && f.subject === subject).length;
              return (
                <button
                  key={subject}
                  onClick={() => setOpenSubject(subject)}
                  className="flex items-center gap-3 p-4 rounded-xl border text-left transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: clr.bg, borderColor: clr.border }}
                >
                  <FolderOpen className="w-9 h-9 shrink-0" style={{ color: clr.text }} />
                  <div className="min-w-0">
                    <p className="font-bold text-sm uppercase truncate" style={{ color: clr.text }}>{subject}</p>
                    <p className="text-xs opacity-70" style={{ color: clr.text }}>{count} αρχεία</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Level 0: classYear folders ──
  return (
    <div>
      {header}
      {uploadForm}
      {files.length === 0 && !showForm ? (
        <Card>
          <CardContent className="pt-5">
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">Δεν υπάρχουν αρχεία ακόμα.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {folderLabels.map((label) => {
            const count = (byFolder[label] ?? []).length;
            return (
              <button
                key={label}
                onClick={() => setOpenFolder(label)}
                className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all text-left"
              >
                <Folder className="w-9 h-9 text-yellow-500 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">{label}</p>
                  <p className="text-xs text-gray-400">{count} αρχεία</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Breadcrumb({
  folder,
  subject,
  category,
  onRoot,
  onFolder,
  onSubject,
  clr,
}: {
  folder: string;
  subject?: string;
  category?: string;
  onRoot: () => void;
  onFolder?: () => void;
  onSubject?: () => void;
  clr?: { bg: string; text: string; border: string };
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm mb-6 flex-wrap">
      <button onClick={onRoot} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 font-medium">
        <ArrowLeft className="w-4 h-4" />
        Αρχεία
      </button>
      <ChevronRight className="w-4 h-4 text-gray-300" />
      <span
        onClick={subject ? onFolder : undefined}
        className={`font-semibold px-2 py-0.5 rounded text-gray-700 bg-gray-100 ${subject ? "cursor-pointer hover:underline" : ""}`}
      >
        {folder}
      </span>
      {subject && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <span
            onClick={category ? onSubject : undefined}
            className={`font-semibold px-2 py-0.5 rounded ${category ? "cursor-pointer hover:underline" : ""}`}
            style={clr ? { color: clr.text, backgroundColor: clr.bg } : undefined}
          >
            {subject}
          </span>
        </>
      )}
      {category && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <span className="font-semibold text-gray-700">{category}</span>
        </>
      )}
    </div>
  );
}
