"use client";

import { useState } from "react";
import { Folder, FolderOpen, ChevronRight, ArrowLeft, FileText, Download, BookOpen, Eye } from "lucide-react";
import { getSubjectChipColor } from "@/lib/subjectColors";
import { FILE_CATEGORIES } from "@/lib/fileCategories";
import { formatDate } from "@/lib/utils";
import FlipbookViewer from "@/components/dashboard/FlipbookViewer";

type FileEntry = {
  id: string;
  title: string;
  subject: string;
  category: string | null;
  isFlipbook: boolean;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesClient({ files, subjects }: { files: FileEntry[]; subjects: string[] }) {
  const [openSubject, setOpenSubject] = useState<string | null>(null);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [flipbookFile, setFlipbookFile] = useState<FileEntry | null>(null);

  function countFor(subject: string, category?: string) {
    return files.filter((f) => f.subject === subject && (!category || f.category === category)).length;
  }

  // Level 2: files inside subject + category
  if (openSubject && openCategory) {
    const clr = getSubjectChipColor(subjects, openSubject);
    const list = files.filter((f) => f.subject === openSubject && f.category === openCategory);
    return (
      <div>
        <Breadcrumb
          subject={openSubject}
          category={openCategory}
          onSubject={() => setOpenCategory(null)}
          onRoot={() => { setOpenSubject(null); setOpenCategory(null); }}
          clr={clr}
        />
        {list.length === 0 ? (
          <p className="text-gray-400 text-center py-16">Δεν υπάρχουν αρχεία σε αυτόν τον φάκελο ακόμα.</p>
        ) : (
          <div className="space-y-2">
            {list.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between py-2.5 px-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${file.isFlipbook ? "bg-blue-50" : "bg-red-50"}`}>
                    {file.isFlipbook ? (
                      <BookOpen className="w-4 h-4 text-blue-500" />
                    ) : (
                      <FileText className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{file.title}</p>
                    <p className="text-xs text-gray-400">
                      {formatSize(file.fileSize)} · {formatDate(file.uploadedAt)}
                    </p>
                  </div>
                </div>
                {file.isFlipbook ? (
                  <button
                    onClick={() => setFlipbookFile(file)}
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium shrink-0 ml-3"
                  >
                    <BookOpen className="w-4 h-4" />
                    Άνοιγμα
                  </button>
                ) : (
                  <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3">
                    <a
                      href={`/uploads/${file.fileName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      Άνοιγμα
                    </a>
                    <a
                      href={`/uploads/${file.fileName}`}
                      download={file.title}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 font-medium"
                    >
                      <Download className="w-4 h-4" />
                      Λήψη
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <FlipbookViewer
          fileId={flipbookFile?.id ?? ""}
          title={flipbookFile?.title ?? ""}
          open={flipbookFile !== null}
          onClose={() => setFlipbookFile(null)}
        />
      </div>
    );
  }

  // Level 1: category subfolders inside a subject
  if (openSubject) {
    const clr = getSubjectChipColor(subjects, openSubject);
    return (
      <div>
        <Breadcrumb subject={openSubject} onRoot={() => setOpenSubject(null)} clr={clr} />
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          {FILE_CATEGORIES.map((cat) => {
            const count = countFor(openSubject, cat);
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

  // Level 0: subject folders
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Αρχεία Μαθημάτων</h1>
        <p className="text-gray-500 mt-1">Διαγωνίσματα, λύσεις και εκπαιδευτικό υλικό</p>
      </div>

      {subjects.length === 0 ? (
        <div className="text-center py-20">
          <Folder className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Δεν υπάρχουν διαθέσιμα αρχεία ακόμα.</p>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {subjects.map((subject) => {
            const clr = getSubjectChipColor(subjects, subject);
            const count = countFor(subject);
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

function Breadcrumb({
  subject,
  category,
  onSubject,
  onRoot,
  clr,
}: {
  subject: string;
  category?: string;
  onSubject?: () => void;
  onRoot: () => void;
  clr: { bg: string; text: string; border: string };
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm mb-6 flex-wrap">
      <button onClick={onRoot} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 font-medium">
        <ArrowLeft className="w-4 h-4" />
        Αρχεία
      </button>
      <ChevronRight className="w-4 h-4 text-gray-300" />
      <span
        onClick={category ? onSubject : undefined}
        className={`font-semibold px-2 py-0.5 rounded ${category ? "cursor-pointer hover:underline" : ""}`}
        style={{ color: clr.text, backgroundColor: clr.bg }}
      >
        {subject}
      </span>
      {category && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-300" />
          <span className="font-semibold text-gray-700">{category}</span>
        </>
      )}
    </div>
  );
}
