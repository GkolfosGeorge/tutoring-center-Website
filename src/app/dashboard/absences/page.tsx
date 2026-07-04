import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { UserX, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AbsencesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const profileId = (session.user as any).studentProfileId;
  if (!profileId) return <div className="text-gray-400 text-center py-20">Δεν βρέθηκε προφίλ.</div>;

  const absences = await prisma.absence.findMany({
    where: { studentId: profileId },
    orderBy: { date: "desc" },
  });

  const justified = absences.filter((a) => a.justified).length;
  const unjustified = absences.filter((a) => !a.justified).length;
  const subjects = Array.from(new Set(absences.map((a) => a.subject)));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Απουσίες</h1>
        <p className="text-gray-500 mt-1">Αναλυτικό παρουσιολόγιο</p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-3xl font-bold text-gray-900">{absences.length}</p>
            <p className="text-sm text-gray-500 mt-1">Σύνολο</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-3xl font-bold text-green-600">{justified}</p>
            <p className="text-sm text-gray-500 mt-1">Δικαιολογημένες</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center">
            <p className="text-3xl font-bold text-red-600">{unjustified}</p>
            <p className="text-sm text-gray-500 mt-1">Αδικαιολόγητες</p>
          </CardContent>
        </Card>
      </div>

      {subjects.length > 0 && (
        <Card className="mb-6">
          <CardHeader><CardTitle>Ανά Μάθημα</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {subjects.map((subject) => {
                const count = absences.filter((a) => a.subject === subject).length;
                return (
                  <div key={subject} className="flex items-center justify-between">
                    <span className="font-medium text-gray-800">{subject}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-orange-400 rounded-full"
                          style={{ width: `${Math.min((count / 10) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600 w-8 text-right">{count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Λεπτομέρειες ({absences.length})</CardTitle></CardHeader>
        <CardContent>
          {absences.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="text-gray-500">Δεν υπάρχουν καταγεγραμμένες απουσίες!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {absences.map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <UserX className={`w-4 h-4 ${a.justified ? "text-green-500" : "text-red-500"}`} />
                    <div>
                      <p className="font-medium text-gray-900">{a.subject}</p>
                      <p className="text-xs text-gray-400">{formatDate(a.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.notes && <span className="text-xs text-gray-400">{a.notes}</span>}
                    <Badge variant={a.justified ? "success" : "destructive"}>
                      {a.justified ? "Δικαιολογημένη" : "Αδικαιολόγητη"}
                    </Badge>
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
