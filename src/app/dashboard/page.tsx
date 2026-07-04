import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, UserX, CreditCard, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const profileId = (session.user as any).studentProfileId;

  let stats = { gradeAvg: 0, totalAbsences: 0, balance: 0, recentGrades: [] as any[] };

  if (profileId) {
    const [grades, absences, profile] = await Promise.all([
      prisma.grade.findMany({ where: { studentId: profileId }, orderBy: { date: "desc" }, take: 5 }),
      prisma.absence.count({ where: { studentId: profileId } }),
      prisma.studentProfile.findUnique({ where: { id: profileId } }),
    ]);

    const avg = grades.length > 0
      ? grades.reduce((sum, g) => sum + (g.score / g.maxScore) * 20, 0) / grades.length
      : 0;

    stats = {
      gradeAvg: Math.round(avg * 10) / 10,
      totalAbsences: absences,
      balance: profile?.tuitionBalance ?? 0,
      recentGrades: grades,
    };
  }

  const role = (session.user as any).role;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Καλώς ήρθες, {session.user?.name}!
        </h1>
        <p className="text-gray-500 mt-1">Εδώ είναι η επισκόπηση της πορείας σου.</p>
      </div>

      {role !== "STUDENT" && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-blue-800 font-medium">
            Συνδεδεμένος ως <Badge>{role}</Badge> —{" "}
            <a href="/admin" className="underline">Μεταβείτε στο Admin Panel</a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Μέσος Όρος</CardTitle>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.gradeAvg || "—"}</p>
            <p className="text-xs text-gray-400 mt-1">βάση 20</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Απουσίες</CardTitle>
              <UserX className="w-4 h-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{stats.totalAbsences}</p>
            <p className="text-xs text-gray-400 mt-1">συνολικά</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-500">Υπόλοιπο</CardTitle>
              <CreditCard className="w-4 h-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${stats.balance > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(stats.balance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {stats.balance > 0 ? "οφειλή" : "εντάξει"}
            </p>
          </CardContent>
        </Card>
      </div>

      {stats.recentGrades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Τελευταίοι Βαθμοί
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentGrades.map((grade: any) => (
                <div key={grade.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{grade.subject}</p>
                    <p className="text-xs text-gray-400">{grade.examType}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg font-bold ${
                      grade.score / grade.maxScore >= 0.7 ? "text-green-600" :
                      grade.score / grade.maxScore >= 0.5 ? "text-yellow-600" : "text-red-600"
                    }`}>
                      {grade.score}/{grade.maxScore}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
