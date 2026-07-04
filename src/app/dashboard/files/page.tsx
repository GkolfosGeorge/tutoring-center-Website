import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { FileText, Download } from "lucide-react";

export const dynamic = "force-dynamic";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function FilesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const profileId = (session.user as any).studentProfileId;

  let classYear: string | null = null;
  let enrolledSubjects: string[] = [];

  if (profileId) {
    const profile = await prisma.studentProfile.findUnique({
      where: { id: profileId },
      include: { enrollments: true },
    });
    classYear = profile?.classYear ?? null;
    enrolledSubjects = profile?.enrollments.map(e => e.subject) ?? [];
  }

  // Show files where:
  //   - subject is in student's enrolled subjects (exact match)
  //   - classYear is null (all classes) OR matches student's class year
  const files = enrolledSubjects.length > 0
    ? await prisma.courseFile.findMany({
        where: {
          subject: { in: enrolledSubjects },
          OR: [{ classYear: null }, { classYear: classYear ?? undefined }],
        },
        orderBy: { uploadedAt: "desc" },
      })
    : [];

  const subjects = [...new Set(files.map((f) => f.subject))].sort();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Αρχεία Μαθημάτων</h1>
        <p className="text-gray-500 mt-1">Διαγωνίσματα, λύσεις και εκπαιδευτικό υλικό</p>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Δεν υπάρχουν διαθέσιμα αρχεία ακόμα.</p>
          <p className="text-gray-300 text-sm mt-1">Τα αρχεία εμφανίζονται ανάλογα με τα μαθήματα που παρακολουθείς.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {subjects.map((subject) => (
            <Card key={subject}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  {subject}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {files
                    .filter((f) => f.subject === subject)
                    .map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-red-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{file.title}</p>
                            <p className="text-xs text-gray-400">
                              {formatSize(file.fileSize)} · {formatDate(file.uploadedAt)}
                            </p>
                          </div>
                        </div>
                        <a
                          href={`/uploads/${file.fileName}`}
                          download={file.title}
                          className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-3"
                        >
                          <Download className="w-4 h-4" />
                          Λήψη
                        </a>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
