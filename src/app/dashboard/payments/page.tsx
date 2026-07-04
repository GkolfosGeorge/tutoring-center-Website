import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CreditCard, CheckCircle2, Clock, Receipt, Download } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const profileId = (session.user as any).studentProfileId;
  if (!profileId) return <div className="text-gray-400 text-center py-20">Δεν βρέθηκε προφίλ.</div>;

  const [payments, receipts, profile] = await Promise.all([
    prisma.payment.findMany({ where: { studentId: profileId }, orderBy: { date: "desc" } }),
    prisma.receipt.findMany({ where: { studentId: profileId }, orderBy: { date: "desc" } }),
    prisma.studentProfile.findUnique({ where: { id: profileId } }),
  ]);

  const totalPaid = payments.filter((p) => p.isPaid).reduce((sum, p) => sum + p.amount, 0);
  const totalDue = payments.filter((p) => !p.isPaid).reduce((sum, p) => sum + p.amount, 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Πληρωμές</h1>
        <p className="text-gray-500 mt-1">Ιστορικό και υπόλοιπο διδάκτρων</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className={`border-2 ${(profile?.tuitionBalance ?? 0) > 0 ? "border-red-200" : "border-green-200"}`}>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <p className="text-sm text-gray-500">Τρέχον Υπόλοιπο</p>
            </div>
            <p className={`text-3xl font-bold ${(profile?.tuitionBalance ?? 0) > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(profile?.tuitionBalance ?? 0)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {(profile?.tuitionBalance ?? 0) > 0 ? "Εκκρεμεί πληρωμή" : "Τακτοποιημένο"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <p className="text-sm text-gray-500">Εξοφλημένα</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalPaid)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-orange-500" />
              <p className="text-sm text-gray-500">Εκκρεμή</p>
            </div>
            <p className="text-3xl font-bold text-orange-600">{formatCurrency(totalDue)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Ιστορικό Πληρωμών</CardTitle></CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Δεν υπάρχουν εγγραφές.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="font-medium text-gray-900">{p.description}</p>
                    <p className="text-xs text-gray-400">{formatDate(p.date)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{formatCurrency(p.amount)}</span>
                    <Badge variant={p.isPaid ? "success" : "warning"}>
                      {p.isPaid ? "Εξοφλήθηκε" : "Εκκρεμεί"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle>Αποδείξεις</CardTitle></CardHeader>
        <CardContent>
          {receipts.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Δεν υπάρχουν καταχωρημένες αποδείξεις.</p>
          ) : (
            <div className="space-y-2">
              {receipts.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{formatCurrency(r.amount)}</p>
                      <p className="text-xs text-gray-400">{formatDate(r.date)}</p>
                    </div>
                  </div>
                  <a
                    href={r.filePath}
                    download
                    className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium shrink-0 ml-3"
                  >
                    <Download className="w-4 h-4" />
                    Λήψη
                  </a>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
